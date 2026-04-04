const express = require('express');
const db = require('../db');
const router = express.Router();

// Get all employees
router.get('/', async (req, res) => {
    try {
        const [employees] = await db.query('SELECT * FROM employees WHERE status = "available"');
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get employees by type
router.get('/type/:type', async (req, res) => {
    const { type } = req.params;
    try {
        const [employees] = await db.query('SELECT * FROM employees WHERE employee_type = ? AND status = "available"', [type]);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;