const express = require('express');
const db = require('../db');
const router = express.Router();

// Submit review
router.post('/submit', async (req, res) => {
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

module.exports = router;