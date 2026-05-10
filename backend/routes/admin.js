const express = require('express');
const db = require('../db');
const router = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Admin login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'Admin' && password === 'admin') {
        req.session.admin = { username: username, loggedInAt: new Date() };
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Admin logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Check admin session
router.get('/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

// ============================================
// USERS - WITH WORKING DELETE
// ============================================

router.get('/users', adminAuth, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.*, COALESCE(lp.points, 0) as points, COALESCE(lp.tier, 'Bronze') as tier
            FROM users u
            LEFT JOIN loyalty_points lp ON u.id = lp.user_id
            ORDER BY u.id DESC
        `);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE USER - WORKING VERSION
router.delete('/users/:id', adminAuth, async (req, res) => {
    const userId = req.params.id;
    
    try {
        // Check if user exists
        const [userCheck] = await db.query('SELECT id, firstname, lastname FROM users WHERE id = ?', [userId]);
        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userName = `${userCheck[0].firstname} ${userCheck[0].lastname}`;
        
        // Delete in correct order to avoid foreign key constraints
        await db.query(`DELETE FROM booking_media WHERE booking_id IN (SELECT id FROM bookings WHERE user_id = ?)`, [userId]);
        await db.query(`DELETE FROM reviews WHERE user_id = ?`, [userId]);
        await db.query(`DELETE FROM points_history WHERE user_id = ?`, [userId]);
        await db.query(`DELETE FROM loyalty_points WHERE user_id = ?`, [userId]);
        await db.query(`DELETE FROM inventory_items WHERE user_id = ?`, [userId]);
        await db.query(`DELETE FROM bookings WHERE user_id = ?`, [userId]);
        await db.query(`DELETE FROM users WHERE id = ?`, [userId]);
        
        res.json({ message: `User "${userName}" deleted successfully` });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }
});

// ============================================
// BOOKINGS
// ============================================

router.get('/bookings', adminAuth, async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.*, u.firstname, u.lastname, u.email, u.contact_number, p.package_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN packages p ON b.package_id = p.id
            ORDER BY b.created_at DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/bookings/:id/status', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Booking status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// INVENTORY
// ============================================

router.get('/inventory', adminAuth, async (req, res) => {
    try {
        const [items] = await db.query(`
            SELECT i.*, CONCAT(u.firstname, ' ', u.lastname) as customer_name
            FROM inventory_items i
            LEFT JOIN users u ON i.user_id = u.id
            ORDER BY i.id DESC
        `);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/inventory/:id/status', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE inventory_items SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Inventory status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LOYALTY
// ============================================

router.get('/loyalty', adminAuth, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.firstname, u.lastname, COALESCE(lp.points, 0) as points, COALESCE(lp.tier, 'Bronze') as tier, lp.referral_code
            FROM users u
            LEFT JOIN loyalty_points lp ON u.id = lp.user_id
            ORDER BY points DESC
        `);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/loyalty/update-points', adminAuth, async (req, res) => {
    const { userId, amount, reason } = req.body;
    try {
        const [existing] = await db.query('SELECT points FROM loyalty_points WHERE user_id = ?', [userId]);
        
        let newPoints;
        if (existing.length === 0) {
            newPoints = amount;
            const referralCode = 'SHIFT' + userId + Math.random().toString(36).substring(2, 6).toUpperCase();
            await db.query('INSERT INTO loyalty_points (user_id, points, tier, referral_code) VALUES (?, ?, ?, ?)', [userId, newPoints, 'Bronze', referralCode]);
        } else {
            newPoints = existing[0].points + amount;
            let tier = 'Bronze';
            if (newPoints >= 50000) tier = 'Platinum';
            else if (newPoints >= 25000) tier = 'Gold';
            else if (newPoints >= 10000) tier = 'Silver';
            await db.query('UPDATE loyalty_points SET points = ?, tier = ? WHERE user_id = ?', [newPoints, tier, userId]);
        }
        
        await db.query('INSERT INTO points_history (user_id, points_change, reason) VALUES (?, ?, ?)', [userId, amount, reason]);
        res.json({ message: 'Points updated successfully', points: newPoints });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REVIEWS
// ============================================

router.get('/reviews', adminAuth, async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT r.*, CONCAT(u.firstname, ' ', u.lastname) as user_name
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/reviews/:id/toggle', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [review] = await db.query('SELECT status FROM reviews WHERE id = ?', [id]);
        const newStatus = review[0]?.status === 'approved' ? 'pending' : 'approved';
        await db.query('UPDATE reviews SET status = ? WHERE id = ?', [newStatus, id]);
        res.json({ message: 'Review status toggled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/reviews/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM reviews WHERE id = ?', [id]);
        res.json({ message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEDIA
// ============================================

router.get('/booking-media', adminAuth, async (req, res) => {
    try {
        const [media] = await db.query(`
            SELECT m.*, CONCAT(u.firstname, ' ', u.lastname) as customer_name
            FROM booking_media m
            LEFT JOIN bookings b ON m.booking_id = b.id
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY m.created_at DESC
        `);
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/booking-media/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM booking_media WHERE id = ?', [id]);
        res.json({ message: 'Media deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EMPLOYEES, VEHICLES, SUPERVISORS, PACKAGES, ADDITIONAL SERVICES, PROMO CODES
// ============================================

router.get('/employees', adminAuth, async (req, res) => {
    try {
        const [employees] = await db.query('SELECT * FROM employees ORDER BY id DESC');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/employees', adminAuth, async (req, res) => {
    const { employee_name, employee_contact, employee_cnic, employee_age, employee_type, employee_charge_per_visit, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO employees (employee_name, employee_contact, employee_cnic, employee_age, employee_type, employee_charge_per_visit, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [employee_name, employee_contact, employee_cnic, employee_age, employee_type, employee_charge_per_visit || 500, status || 'available']
        );
        res.json({ message: 'Employee added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/employees/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await db.query(`UPDATE employees SET ${fields} WHERE id = ?`, [...values, id]);
        res.json({ message: 'Employee updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/employees/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/vehicles', adminAuth, async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles ORDER BY id DESC');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vehicles', adminAuth, async (req, res) => {
    const { vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO vehicles (vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status || 'available']
        );
        res.json({ message: 'Vehicle added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/vehicles/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await db.query(`UPDATE vehicles SET ${fields} WHERE id = ?`, [...values, id]);
        res.json({ message: 'Vehicle updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/vehicles/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
        res.json({ message: 'Vehicle deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/supervisors', adminAuth, async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors ORDER BY id DESC');
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/supervisors', adminAuth, async (req, res) => {
    const { supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO supervisors (supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status || 'available']
        );
        res.json({ message: 'Supervisor added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/supervisors/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await db.query(`UPDATE supervisors SET ${fields} WHERE id = ?`, [...values, id]);
        res.json({ message: 'Supervisor updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/supervisors/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM supervisors WHERE id = ?', [id]);
        res.json({ message: 'Supervisor deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/packages', adminAuth, async (req, res) => {
    try {
        const [packages] = await db.query('SELECT * FROM packages ORDER BY id');
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/packages/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { price, laborers, truck_size, insurance_type, packing_materials, furniture_assembly, description } = req.body;
    try {
        await db.query(
            'UPDATE packages SET price = ?, laborers = ?, truck_size = ?, insurance_type = ?, packing_materials = ?, furniture_assembly = ?, description = ? WHERE id = ?',
            [price, laborers, truck_size, insurance_type, packing_materials, furniture_assembly, description, id]
        );
        res.json({ message: 'Package updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/additional-services', adminAuth, async (req, res) => {
    try {
        const [services] = await db.query('SELECT * FROM additional_services ORDER BY id');
        res.json(services);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/additional-services', adminAuth, async (req, res) => {
    const { service_name, service_type, price, description } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO additional_services (service_name, service_type, price, description) VALUES (?, ?, ?, ?)',
            [service_name, service_type, price, description]
        );
        res.json({ message: 'Service added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/additional-services/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { service_name, service_type, price, description } = req.body;
    try {
        await db.query(
            'UPDATE additional_services SET service_name = ?, service_type = ?, price = ?, description = ? WHERE id = ?',
            [service_name, service_type, price, description, id]
        );
        res.json({ message: 'Service updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/additional-services/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM additional_services WHERE id = ?', [id]);
        res.json({ message: 'Service deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/promocodes', adminAuth, async (req, res) => {
    try {
        const [promos] = await db.query('SELECT * FROM promo_codes ORDER BY id DESC');
        res.json(promos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/promocodes', adminAuth, async (req, res) => {
    const { code, discount_percentage, valid_until, usage_limit, is_active } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO promo_codes (code, discount_percentage, valid_until, usage_limit, is_active) VALUES (?, ?, ?, ?, ?)',
            [code, discount_percentage, valid_until, usage_limit, is_active]
        );
        res.json({ message: 'Promo code added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/promocodes/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { code, discount_percentage, valid_until, usage_limit, is_active } = req.body;
    try {
        await db.query(
            'UPDATE promo_codes SET code = ?, discount_percentage = ?, valid_until = ?, usage_limit = ?, is_active = ? WHERE id = ?',
            [code, discount_percentage, valid_until, usage_limit, is_active, id]
        );
        res.json({ message: 'Promo code updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/promocodes/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM promo_codes WHERE id = ?', [id]);
        res.json({ message: 'Promo code deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;