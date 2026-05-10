const express = require('express');
const db = require('../db');
const router = express.Router();

// Get user loyalty
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [result] = await db.query(
            'SELECT points, tier FROM loyalty_points WHERE user_id = ?',
            [userId]
        );
        res.json(result[0] || { points: 0, tier: 'Bronze' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;