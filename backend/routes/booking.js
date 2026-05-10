const express = require('express');
const db = require('../db');
const router = express.Router();

// Create booking - FIXED VERSION (no vehicle_id column)
router.post('/create', async (req, res) => {
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
        
        res.json({ message: 'Booking created successfully', bookingId: result.insertId });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Get user bookings
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [bookings] = await db.query(`
            SELECT b.*, p.package_name, p.price as package_price
            FROM bookings b
            LEFT JOIN packages p ON b.package_id = p.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId]);
        res.json(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id]);
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload photo for booking
router.post('/:id/upload-photo', async (req, res) => {
    const { id } = req.params;
    const { photo_url, item_name } = req.body;
    
    try {
        await db.query(
            'INSERT INTO booking_media (booking_id, media_type, media_url, item_name) VALUES (?, "photo", ?, ?)',
            [id, photo_url, item_name]
        );
        res.json({ message: 'Photo uploaded successfully' });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload video for booking
router.post('/:id/upload-video', async (req, res) => {
    const { id } = req.params;
    const { video_url, item_name } = req.body;
    
    try {
        await db.query(
            'INSERT INTO booking_media (booking_id, media_type, media_url, item_name) VALUES (?, "video", ?, ?)',
            [id, video_url, item_name]
        );
        res.json({ message: 'Video uploaded successfully' });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get booking media
router.get('/:id/media', async (req, res) => {
    const { id } = req.params;
    try {
        const [media] = await db.query(
            'SELECT * FROM booking_media WHERE booking_id = ? ORDER BY created_at DESC',
            [id]
        );
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;