const express = require('express');
const db = require('../db');
const router = express.Router();

// Get user inventory
router.get('/user/:userId', async (req, res) => {
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

// Add inventory item
router.post('/add', async (req, res) => {
    const { user_id, room_name, item_name, is_fragile, special_handling } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO inventory_items (user_id, room_name, item_name, is_fragile, special_handling, status) VALUES (?, ?, ?, ?, ?, "pending")',
            [user_id, room_name, item_name, is_fragile, special_handling]
        );
        res.json({ message: 'Item added', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;