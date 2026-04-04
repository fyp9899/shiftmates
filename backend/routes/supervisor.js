const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all available supervisors
router.get('/', async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors WHERE status = "available"');
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get supervisors by city
router.get('/city/:city', async (req, res) => {
    const { city } = req.params;
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors WHERE supervisor_city = ? AND status = "available"', [city]);
        res.json(supervisors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;