const express = require('express');
const db = require('../db');
const router = express.Router();

// Add tracking update
router.post('/update', async (req, res) => {
    const { booking_id, status, location_lat, location_lng, location_address, estimated_arrival, notes } = req.body;
    
    try {
        const [result] = await db.query(
            `INSERT INTO tracking_updates (booking_id, status, location_lat, location_lng, location_address, estimated_arrival, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [booking_id, status, location_lat, location_lng, location_address, estimated_arrival, notes]
        );
        
        // Update booking status
        await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, booking_id]);
        
        res.json({ updateId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get tracking updates for booking
router.get('/booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        const [updates] = await db.query(
            'SELECT * FROM tracking_updates WHERE booking_id = ? ORDER BY created_at ASC',
            [bookingId]
        );
        
        res.json(updates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get latest tracking update
router.get('/booking/:bookingId/latest', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        const [updates] = await db.query(
            'SELECT * FROM tracking_updates WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1',
            [bookingId]
        );
        
        res.json(updates[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;