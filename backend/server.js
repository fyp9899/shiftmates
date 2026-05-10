const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

const app = express();
const db = require('./db');

// Get the root directory (one level up from backend)
const rootDir = path.join(__dirname, '..');

// Create upload directories in root
const uploadDir = path.join(rootDir, 'uploads');
const picturesDir = path.join(uploadDir, 'pictures');
const videosDir = path.join(uploadDir, 'videos');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(picturesDir)) fs.mkdirSync(picturesDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

// Configure multer for media upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, picturesDir);
        } else {
            cb(null, videosDir);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos are allowed'));
        }
    }
});

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000', 'https://shiftmates.onrender.com'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.JWT_SECRET || 'shiftmates_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static files from root directory
app.use(express.static(rootDir));
app.use('/css', express.static(path.join(rootDir, 'website/css')));
app.use('/js', express.static(path.join(rootDir, 'website/js')));
app.use('/app', express.static(path.join(rootDir, 'app')));
app.use('/app/css', express.static(path.join(rootDir, 'app/css')));
app.use('/app/js', express.static(path.join(rootDir, 'app/js')));
app.use('/cms', express.static(path.join(rootDir, 'cms')));
app.use('/cms/css', express.static(path.join(rootDir, 'cms/css')));
app.use('/cms/js', express.static(path.join(rootDir, 'cms/js')));
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// PACKAGES ROUTES
// ============================================
app.get('/api/packages', async (req, res) => {
    try {
        const [packages] = await db.query('SELECT * FROM packages WHERE package_name != "customized" OR (package_name = "customized" AND price > 0)');
        res.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EMPLOYEES ROUTES
// ============================================
app.get('/api/employees', async (req, res) => {
    try {
        const [employees] = await db.query('SELECT * FROM employees WHERE status = "available"');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/employees/type/:type', async (req, res) => {
    const { type } = req.params;
    try {
        const [employees] = await db.query('SELECT * FROM employees WHERE employee_type = ? AND status = "available"', [type]);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VEHICLES ROUTES
// ============================================
app.get('/api/vehicles', async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles WHERE status = "available"');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/vehicles/size/:size', async (req, res) => {
    const { size } = req.params;
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles WHERE vehicle_size = ? AND status = "available"', [size]);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SUPERVISORS ROUTES
// ============================================
app.get('/api/supervisors', async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors WHERE status = "available"');
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/supervisors/city/:city', async (req, res) => {
    const { city } = req.params;
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors WHERE supervisor_city = ? AND status = "available"', [city]);
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BOOKING ROUTES
// ============================================

// Generate confirmation slip - FIXED VERSION
function generateSlipNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SLIP-${year}${month}${day}-${random}`;
}

app.post('/api/bookings/:id/generate-slip', async (req, res) => {
    const bookingId = req.params.id;
    
    try {
        // Check if slip already exists
        const [existingSlip] = await db.query('SELECT * FROM confirmation_slips WHERE booking_id = ?', [bookingId]);
        if (existingSlip.length > 0) {
            return res.json({ message: 'Slip already exists', slip: existingSlip[0] });
        }
        
        // Get booking details with user info
        const [bookings] = await db.query(`
            SELECT b.*, u.firstname, u.lastname, u.email, u.contact_number, 
                   p.package_name, p.price as package_price
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN packages p ON b.package_id = p.id
            WHERE b.id = ?
        `, [bookingId]);
        
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = bookings[0];
        
        // Get available vehicle (truck) based on vehicle_size or package
        let vehicleSize = booking.vehicle_size;
        if (!vehicleSize && booking.package_name) {
            if (booking.package_name.toLowerCase() === 'basic') vehicleSize = 'small';
            else if (booking.package_name.toLowerCase() === 'gold') vehicleSize = 'medium';
            else if (booking.package_name.toLowerCase() === 'platinum') vehicleSize = 'large';
        }
        
        const [vehicles] = await db.query(
            'SELECT * FROM vehicles WHERE vehicle_size = ? AND status = "available" LIMIT 1',
            [vehicleSize || 'medium']
        );
        const vehicle = vehicles[0] || null;
        
        // Get available supervisor based on user's city
        const [supervisors] = await db.query(
            'SELECT * FROM supervisors WHERE status = "available" LIMIT 1'
        );
        const supervisor = supervisors[0] || null;
        
        const slipNumber = generateSlipNumber();
        const bookingDay = new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long' });
        
        // Insert confirmation slip
        const [result] = await db.query(`
            INSERT INTO confirmation_slips (
                slip_number, booking_id, customer_name, customer_email, customer_phone,
                relocation_type, package_name, laborers_count, booking_date, booking_time,
                booking_day, pickup_address, dropoff_address, truck_name, truck_registration,
                driver_name, driver_contact, supervisor_name, supervisor_contact, total_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')
        `, [
            slipNumber, bookingId,
            `${booking.firstname} ${booking.lastname}`,
            booking.email || null,
            booking.contact_number || null,
            booking.relocation_type,
            booking.package_name || 'Standard',
            booking.labor_count || 2,
            booking.booking_date,
            booking.booking_time,
            bookingDay,
            booking.pickup_address,
            booking.dropoff_address,
            vehicle ? vehicle.vehicle_name : 'Truck Assigned Later',
            vehicle ? vehicle.vehicle_registration_number : 'Pending',
            vehicle ? vehicle.driver_name : 'Driver Assigned Later',
            vehicle ? vehicle.driver_contact : 'Pending',
            supervisor ? supervisor.supervisor_name : 'Supervisor Assigned Later',
            supervisor ? supervisor.supervisor_contact : 'Pending',
            booking.total_price || 0
        ]);
        
        // Return the created slip
        const [newSlip] = await db.query('SELECT * FROM confirmation_slips WHERE id = ?', [result.insertId]);
        res.json({ message: 'Confirmation slip generated successfully', slip: newSlip[0] });
        
    } catch (error) {
        console.error('Error generating slip:', error);
        res.status(500).json({ error: 'Failed to generate confirmation slip: ' + error.message });
    }
});

// Get confirmation slip by booking ID
app.get('/api/bookings/:id/slip', async (req, res) => {
    const bookingId = req.params.id;
    
    try {
        const [slips] = await db.query(`
            SELECT cs.*, 
                   (SELECT GROUP_CONCAT(CONCAT(item_name, '|', media_url, '|', media_type)) 
                    FROM booking_media WHERE booking_id = cs.booking_id) as media_items
            FROM confirmation_slips cs
            WHERE cs.booking_id = ?
        `, [bookingId]);
        
        if (slips.length === 0) {
            return res.json(null);
        }
        
        res.json(slips[0]);
    } catch (error) {
        console.error('Error fetching slip:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all confirmation slips for admin
app.get('/api/admin/confirmation-slips', async (req, res) => {
    try {
        const [slips] = await db.query(`
            SELECT cs.*, b.status as booking_status
            FROM confirmation_slips cs
            LEFT JOIN bookings b ON cs.booking_id = b.id
            ORDER BY cs.created_at DESC
        `);
        res.json(slips);
    } catch (error) {
        console.error('Error loading confirmation slips:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update confirmation slip status
app.put('/api/admin/confirmation-slips/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        await db.query('UPDATE confirmation_slips SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Slip status updated successfully' });
    } catch (error) {
        console.error('Error updating slip status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create booking - WITH AUTO SLIP GENERATION ON CONFIRM
app.post('/api/bookings/create', async (req, res) => {
    const { 
        user_id, relocation_type, package_id, labor_count, 
        pickup_address, dropoff_address, booking_date, booking_time, 
        vehicle_size, total_price 
    } = req.body;
    
    if (!user_id || !relocation_type || !pickup_address || !dropoff_address || !booking_date || !booking_time) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    try {
        const [result] = await db.query(
            `INSERT INTO bookings (user_id, relocation_type, package_id, labor_count, 
             pickup_address, dropoff_address, booking_date, booking_time, 
             vehicle_size, total_price, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [user_id, relocation_type, package_id || null, labor_count || 2, 
             pickup_address, dropoff_address, booking_date, booking_time, 
             vehicle_size || null, total_price || null]
        );
        
        // Add loyalty points for booking
        const pointsEarned = Math.floor((total_price || 0) / 100);
        if (pointsEarned > 0) {
            const [existing] = await db.query('SELECT points FROM loyalty_points WHERE user_id = ?', [user_id]);
            if (existing.length === 0) {
                const referralCode = 'SHIFT' + user_id + Math.random().toString(36).substring(2, 6).toUpperCase();
                await db.query('INSERT INTO loyalty_points (user_id, points, tier, referral_code) VALUES (?, ?, "Bronze", ?)', 
                    [user_id, pointsEarned, referralCode]);
            } else {
                const newPoints = existing[0].points + pointsEarned;
                let tier = 'Bronze';
                if (newPoints >= 50000) tier = 'Platinum';
                else if (newPoints >= 25000) tier = 'Gold';
                else if (newPoints >= 10000) tier = 'Silver';
                await db.query('UPDATE loyalty_points SET points = ?, tier = ? WHERE user_id = ?', [newPoints, tier, user_id]);
            }
            await db.query('INSERT INTO points_history (user_id, points_change, reason) VALUES (?, ?, ?)', 
                [user_id, pointsEarned, 'Booking completed']);
        }
        
        res.json({ message: 'Booking created successfully', bookingId: result.insertId });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Get user bookings with confirmation slip data
app.get('/api/bookings/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [bookings] = await db.query(`
            SELECT b.*, p.package_name, p.price as package_price,
                   cs.slip_number, cs.truck_name, cs.driver_name, cs.supervisor_name,
                   cs.status as slip_status
            FROM bookings b
            LEFT JOIN packages p ON b.package_id = p.id
            LEFT JOIN confirmation_slips cs ON b.id = cs.booking_id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);
        
        // Format the response to include confirmation_slip object
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            confirmation_slip: booking.slip_number ? {
                slip_number: booking.slip_number,
                truck_name: booking.truck_name,
                driver_name: booking.driver_name,
                supervisor_name: booking.supervisor_name,
                status: booking.slip_status
            } : null
        }));
        
        res.json(formattedBookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id]);
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEDIA UPLOAD ENDPOINTS
// ============================================

// Main upload endpoint for booking media
app.post('/api/bookings/media/upload', upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const { booking_id, item_name } = req.body;
        if (!booking_id) {
            return res.status(400).json({ error: 'Booking ID is required' });
        }
        
        const mediaType = req.file.mimetype.startsWith('image/') ? 'photo' : 'video';
        const mediaUrl = '/uploads/' + (mediaType === 'photo' ? 'pictures' : 'videos') + '/' + req.file.filename;
        
        await db.query(
            'INSERT INTO booking_media (booking_id, media_type, media_url, item_name) VALUES (?, ?, ?, ?)',
            [booking_id, mediaType, mediaUrl, item_name || 'Uploaded Item']
        );
        
        res.json({ 
            success: true, 
            url: mediaUrl, 
            message: `${mediaType === 'photo' ? 'Photo' : 'Video'} uploaded successfully` 
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/bookings/:bookingId/media', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const [media] = await db.query(
            'SELECT * FROM booking_media WHERE booking_id = ? ORDER BY created_at DESC',
            [bookingId]
        );
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LOYALTY ROUTES
// ============================================

app.get('/api/loyalty/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [result] = await db.query(
            'SELECT points, tier FROM loyalty_points WHERE user_id = ?',
            [userId]
        );
        if (result.length === 0) {
            const referralCode = 'SHIFT' + userId + Math.random().toString(36).substring(2, 6).toUpperCase();
            await db.query(
                'INSERT INTO loyalty_points (user_id, points, tier, referral_code) VALUES (?, 0, "Bronze", ?)',
                [userId, referralCode]
            );
            res.json({ points: 0, tier: 'Bronze' });
        } else {
            res.json(result[0]);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/loyalty/referral/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [result] = await db.query(
            'SELECT referral_code FROM loyalty_points WHERE user_id = ?',
            [userId]
        );
        if (result.length > 0) {
            res.json({ referralCode: result[0].referral_code });
        } else {
            const newCode = 'SHIFT' + userId + Math.random().toString(36).substring(2, 6).toUpperCase();
            res.json({ referralCode: newCode });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loyalty/add-points', async (req, res) => {
    const { userId, points, reason } = req.body;
    try {
        const [existing] = await db.query('SELECT points FROM loyalty_points WHERE user_id = ?', [userId]);
        
        if (existing.length === 0) {
            const referralCode = 'SHIFT' + userId + Math.random().toString(36).substring(2, 6).toUpperCase();
            await db.query(
                'INSERT INTO loyalty_points (user_id, points, tier, referral_code) VALUES (?, ?, "Bronze", ?)',
                [userId, points, referralCode]
            );
        } else {
            const newPoints = existing[0].points + points;
            let tier = 'Bronze';
            if (newPoints >= 50000) tier = 'Platinum';
            else if (newPoints >= 25000) tier = 'Gold';
            else if (newPoints >= 10000) tier = 'Silver';
            await db.query('UPDATE loyalty_points SET points = ?, tier = ? WHERE user_id = ?', [newPoints, tier, userId]);
        }
        
        await db.query('INSERT INTO points_history (user_id, points_change, reason) VALUES (?, ?, ?)', [userId, points, reason]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// INVENTORY ROUTES
// ============================================

app.get('/api/inventory/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [items] = await db.query(
            'SELECT * FROM inventory_items WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/inventory/add', async (req, res) => {
    const { user_id, room_name, item_name, is_fragile, special_handling } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO inventory_items (user_id, room_name, item_name, is_fragile, special_handling, status) VALUES (?, ?, ?, ?, ?, "pending")',
            [user_id, room_name, item_name, is_fragile || false, special_handling || '']
        );
        res.json({ message: 'Item added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/inventory/item/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE inventory_items SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/inventory/item/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM inventory_items WHERE id = ?', [id]);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REVIEWS ROUTES
// ============================================

app.post('/api/reviews/submit', async (req, res) => {
    const { booking_id, user_id, rating, comment } = req.body;
    try {
        await db.query(
            'INSERT INTO reviews (user_id, booking_id, rating, comment, status) VALUES (?, ?, ?, ?, "pending")',
            [user_id, booking_id, rating, comment]
        );
        res.json({ message: 'Review submitted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PROMO CODE VERIFICATION
// ============================================

app.post('/api/verify-promo', async (req, res) => {
    const { code, amount } = req.body;
    
    try {
        const [promos] = await db.query(
            'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until >= CURDATE())',
            [code.toUpperCase()]
        );
        
        if (promos.length === 0) {
            return res.json({ valid: false, message: 'Invalid promo code' });
        }
        
        const promo = promos[0];
        if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
            return res.json({ valid: false, message: 'Promo code usage limit reached' });
        }
        
        let discount = Math.floor(amount * (promo.discount_percentage / 100));
        
        res.json({ valid: true, discount: discount, finalAmount: amount - discount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// CALCULATE PRICE ROUTE
// ============================================

app.post('/api/calculate-price', (req, res) => {
    const { distance, rooms, floor, hasElevator, packageType } = req.body;
    
    let basePrice = 5000;
    if (packageType === 'gold') basePrice = 10000;
    else if (packageType === 'platinum') basePrice = 20000;
    
    const distanceCharge = (distance || 10) * 50;
    const roomsCharge = (rooms || 2) * 500;
    const floorCharge = ((floor || 1) - 1) * 200;
    const elevatorDiscount = hasElevator ? 300 : 0;
    const total = basePrice + distanceCharge + roomsCharge + floorCharge - elevatorDiscount;
    
    res.json({
        total: total,
        breakdown: {
            basePrice: basePrice,
            distanceCharge: distanceCharge,
            roomsCharge: roomsCharge,
            floorCharge: floorCharge,
            elevatorDiscount: elevatorDiscount
        }
    });
});

// ============================================
// SERVE HTML FILES
// ============================================

app.get('/', (req, res) => {
    const indexPath = path.join(rootDir, 'website', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`<h1>ShiftMates Server Running</h1><p>Website file not found at: ${indexPath}</p>`);
    }
});

app.get('/app', (req, res) => {
    const appPath = path.join(rootDir, 'app', 'index.html');
    if (fs.existsSync(appPath)) {
        res.sendFile(appPath);
    } else {
        res.status(404).send(`App file not found at: ${appPath}`);
    }
});

app.get('/cms', (req, res) => {
    const cmsPath = path.join(rootDir, 'cms', 'index.html');
    if (fs.existsSync(cmsPath)) {
        res.sendFile(cmsPath);
    } else {
        res.status(404).send(`CMS file not found at: ${cmsPath}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`🚀 ShiftMates Server Started!`);
    console.log(`=================================`);
    console.log(`📱 Website: http://localhost:${PORT}`);
    console.log(`📲 App: http://localhost:${PORT}/app`);
    console.log(`🔧 CMS: http://localhost:${PORT}/cms`);
    console.log(`=================================\n`);
    console.log(`Root directory: ${rootDir}`);
    console.log(`Uploads directory: ${uploadDir}`);
});