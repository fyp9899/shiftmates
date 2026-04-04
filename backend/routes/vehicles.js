const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all available vehicles
router.get('/', async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles WHERE status = "available"');
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicles by size
router.get('/size/:size', async (req, res) => {
    const { size } = req.params;
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles WHERE vehicle_size = ? AND status = "available"', [size]);
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;