const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '.env') });

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
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000'],
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
app.use('/app/css', express.static(path.join(rootDir, 'app/css')));
app.use('/app/js', express.static(path.join(rootDir, 'app/js')));
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
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BOOKING ROUTES
// ============================================
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

app.get('/api/bookings/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [bookings] = await db.query(`
            SELECT b.*, p.package_name, p.price as package_price
            FROM bookings b
            LEFT JOIN packages p ON b.package_id = p.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);
        
        // Also get confirmation slips for each booking
        for (let booking of bookings) {
            const [slips] = await db.query(
                'SELECT * FROM confirmation_slips WHERE booking_id = ? ORDER BY generated_at DESC LIMIT 1',
                [booking.id]
            );
            booking.confirmation_slip = slips[0] || null;
        }
        
        res.json(bookings);
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
// CONFIRMATION SLIP ROUTES
// ============================================

// Generate confirmation slip when booking is confirmed
app.post('/api/bookings/:id/generate-slip', async (req, res) => {
    const bookingId = req.params.id;
    const { supervisor_id, vehicle_id } = req.body;
    
    try {
        // Get booking details with user info
        const [bookings] = await db.query(`
            SELECT b.*, u.firstname, u.lastname, u.email, u.contact_number, p.package_name
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN packages p ON b.package_id = p.id
            WHERE b.id = ?
        `, [bookingId]);
        
        if (bookings.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = bookings[0];
        
        // Get vehicle details if assigned
        let vehicle = null;
        if (vehicle_id) {
            const [vehicles] = await db.query(
                'SELECT * FROM vehicles WHERE id = ?',
                [vehicle_id]
            );
            vehicle = vehicles[0] || null;
        } else {
            // Try to get a vehicle based on vehicle size
            const [vehicles] = await db.query(
                'SELECT * FROM vehicles WHERE vehicle_size = ? AND status = "available" LIMIT 1',
                [booking.vehicle_size || 'medium']
            );
            vehicle = vehicles[0] || null;
        }
        
        // Get supervisor details if assigned
        let supervisor = null;
        if (supervisor_id) {
            const [supervisors] = await db.query(
                'SELECT * FROM supervisors WHERE id = ?',
                [supervisor_id]
            );
            supervisor = supervisors[0] || null;
        } else {
            // Try to get an available supervisor
            const [supervisors] = await db.query(
                'SELECT * FROM supervisors WHERE status = "available" LIMIT 1'
            );
            supervisor = supervisors[0] || null;
        }
        
        // Generate unique slip number
        const slipNumber = 'SFT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Get day of week from booking date
        const bookingDate = new Date(booking.booking_date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bookingDay = days[bookingDate.getDay()];
        
        // Insert confirmation slip
        const [result] = await db.query(`
            INSERT INTO confirmation_slips (
                booking_id, slip_number, customer_name, customer_email, customer_phone,
                pickup_address, dropoff_address, booking_date, booking_time, booking_day,
                truck_name, truck_registration, driver_name, driver_contact,
                laborers_count, supervisor_name, supervisor_contact, total_price,
                package_name, relocation_type, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')
        `, [
            bookingId, slipNumber,
            `${booking.firstname} ${booking.lastname}`,
            booking.email, booking.contact_number,
            booking.pickup_address, booking.dropoff_address,
            booking.booking_date, booking.booking_time, bookingDay,
            vehicle ? vehicle.vehicle_name : 'Truck will be assigned',
            vehicle ? vehicle.vehicle_registration_number : 'N/A',
            vehicle ? vehicle.driver_name : 'Driver will be assigned',
            vehicle ? vehicle.driver_contact : 'N/A',
            booking.labor_count || 2,
            supervisor ? supervisor.supervisor_name : 'Supervisor will be assigned',
            supervisor ? supervisor.supervisor_contact : 'N/A',
            booking.total_price,
            booking.package_name || 'Standard',
            booking.relocation_type
        ]);
        
        // Update vehicle and supervisor status to busy if assigned
        if (vehicle && vehicle.id) {
            await db.query('UPDATE vehicles SET status = "busy" WHERE id = ?', [vehicle.id]);
        }
        if (supervisor && supervisor.id) {
            await db.query('UPDATE supervisors SET status = "assigned" WHERE id = ?', [supervisor.id]);
        }
        
        // Get the generated slip
        const [slips] = await db.query('SELECT * FROM confirmation_slips WHERE id = ?', [result.insertId]);
        
        res.json({ 
            success: true, 
            message: 'Confirmation slip generated successfully',
            slip: slips[0]
        });
        
    } catch (error) {
        console.error('Error generating slip:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get confirmation slip by booking ID
app.get('/api/bookings/:id/slip', async (req, res) => {
    const { id } = req.params;
    try {
        const [slips] = await db.query(
            'SELECT * FROM confirmation_slips WHERE booking_id = ? ORDER BY generated_at DESC LIMIT 1',
            [id]
        );
        res.json(slips[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all confirmation slips for admin
app.get('/api/admin/confirmation-slips', async (req, res) => {
    try {
        const [slips] = await db.query(`
            SELECT cs.*, b.status as booking_status
            FROM confirmation_slips cs
            JOIN bookings b ON cs.booking_id = b.id
            ORDER BY cs.generated_at DESC
        `);
        res.json(slips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update slip status
app.put('/api/admin/confirmation-slips/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE confirmation_slips SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Slip status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available vehicles for assignment
app.get('/api/admin/available-vehicles', async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles WHERE status = "available"');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available supervisors for assignment
app.get('/api/admin/available-supervisors', async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors WHERE status = "available"');
        res.json(supervisors);
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
    const { user_id, room_name, item_name, is_fragile, special_handling, quantity } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO inventory_items (user_id, room_name, item_name, is_fragile, special_handling, quantity, status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
            [user_id, room_name, item_name, is_fragile || false, special_handling || '', quantity || 1]
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