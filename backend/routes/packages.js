const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all packages
router.get('/', async (req, res) => {
    try {
        const [packages] = await db.query('SELECT * FROM packages WHERE package_name != "customized" OR (package_name = "customized" AND price > 0)');
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get package by id
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [packages] = await db.query('SELECT * FROM packages WHERE id = ?', [id]);
        if (packages.length === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        res.json(packages[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;