const express = require('express');
const db = require('../db');
const router = express.Router();

// Create booking
router.post('/create', async (req, res) => {
    const { 
        user_id, relocation_type, package_id, labor_count, 
        pickup_address, dropoff_address, booking_date, booking_time, 
        vehicle_id, supervisor_id, total_price 
    } = req.body;
    
    if (!user_id || !relocation_type || !pickup_address || !dropoff_address || !booking_date || !booking_time) {
        return res.status(400).json({ error: 'Required fields missing' });
    }
    
    try {
        const [result] = await db.query(
            `INSERT INTO bookings (user_id, relocation_type, package_id, labor_count, 
             pickup_address, dropoff_address, booking_date, booking_time, 
             vehicle_id, supervisor_id, total_price, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [user_id, relocation_type, package_id || null, labor_count || 2, 
             pickup_address, dropoff_address, booking_date, booking_time, 
             vehicle_id || null, supervisor_id || null, total_price || null]
        );
        
        res.json({ message: 'Booking created successfully', bookingId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user bookings
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [bookings] = await db.query(`
            SELECT b.*, p.package_name, p.price as package_price,
                   v.vehicle_name, v.vehicle_size,
                   s.supervisor_name
            FROM bookings b
            LEFT JOIN packages p ON b.package_id = p.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN supervisors s ON b.supervisor_id = s.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add booking media
router.post('/media', async (req, res) => {
    const { booking_id, customer_name, customer_address, customer_contact, package_name, item_pictures, item_videos } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO booking_media (booking_id, customer_name, customer_address, customer_contact, package_name, item_pictures, item_videos) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [booking_id, customer_name, customer_address, customer_contact, package_name, item_pictures || null, item_videos || null]
        );
        res.json({ message: 'Media added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;