const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
    const { firstname, lastname, email, contact_number, address, postal_code, password, cnic, area, city } = req.body;
    
    // Validate required fields
    if (!firstname || !lastname || !email || !contact_number || !address || !password || !cnic || !city) {
        return res.status(400).json({ error: 'All required fields must be filled' });
    }
    
    try {
        // Check if user exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ? OR cnic = ?', [email, cnic]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User with this email or CNIC already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (firstname, lastname, email, contact_number, address, postal_code, password, cnic, area, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [firstname, lastname, email, contact_number, address, postal_code || null, hashedPassword, cnic, area || null, city]
        );
        
        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.user = {
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email
        };
        
        res.json({ message: 'Login successful', user: req.session.user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Check session
router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;