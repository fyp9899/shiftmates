const express = require('express');
const db = require('../db');
const router = express.Router();

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Admin login - Simple working version
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt - Username:', username);
    
    // Hardcoded credentials
    if (username === 'Admin' && password === 'admin') {
        req.session.admin = { 
            username: username,
            loggedInAt: new Date()
        };
        console.log('Login successful for:', username);
        res.json({ 
            success: true,
            message: 'Login successful'
        });
    } else {
        console.log('Login failed for:', username);
        res.status(401).json({ 
            success: false,
            error: 'Invalid credentials'
        });
    }
});

// Admin logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Check admin session
router.get('/check', (req, res) => {
    if (req.session && req.session.admin) {
        res.json({ loggedIn: true });
    } else {
        res.json({ loggedIn: false });
    }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, firstname, lastname, email, contact_number, address, postal_code, cnic, area, city, created_at FROM users');
        res.json(users);
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all employees
router.get('/employees', adminAuth, async (req, res) => {
    try {
        const [employees] = await db.query('SELECT * FROM employees');
        res.json(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add employee
router.post('/employees', adminAuth, async (req, res) => {
    const { employee_name, employee_contact, employee_cnic, employee_age, employee_type, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO employees (employee_name, employee_contact, employee_cnic, employee_age, employee_type, status) VALUES (?, ?, ?, ?, ?, ?)',
            [employee_name, employee_contact, employee_cnic, employee_age, employee_type, status || 'available']
        );
        res.json({ message: 'Employee added', id: result.insertId });
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update employee
router.put('/employees/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await db.query(`UPDATE employees SET ${fields} WHERE id = ?`, [...values, id]);
        res.json({ message: 'Employee updated' });
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete employee
router.delete('/employees/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all vehicles
router.get('/vehicles', adminAuth, async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT * FROM vehicles');
        res.json(vehicles);
    } catch (error) {
        console.error('Error loading vehicles:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add vehicle
router.post('/vehicles', adminAuth, async (req, res) => {
    const { vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO vehicles (vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicle_registration_number, driver_name, driver_contact, driver_cnic, vehicle_model_year, vehicle_name, vehicle_size, vehicle_area, status || 'available']
        );
        res.json({ message: 'Vehicle added', id: result.insertId });
    } catch (error) {
        console.error('Error adding vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update vehicle
router.put('/vehicles/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await db.query(`UPDATE vehicles SET ${fields} WHERE id = ?`, [...values, id]);
        res.json({ message: 'Vehicle updated' });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete vehicle
router.delete('/vehicles/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM vehicles WHERE id = ?', [id]);
        res.json({ message: 'Vehicle deleted' });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all supervisors
router.get('/supervisors', adminAuth, async (req, res) => {
    try {
        const [supervisors] = await db.query('SELECT * FROM supervisors');
        res.json(supervisors);
    } catch (error) {
        console.error('Error loading supervisors:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add supervisor
router.post('/supervisors', adminAuth, async (req, res) => {
    const { supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO supervisors (supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [supervisor_name, supervisor_age, supervisor_contact, supervisor_cnic, supervisor_area, supervisor_salary, supervisor_city, status || 'available']
        );
        res.json({ message: 'Supervisor added', id: result.insertId });
    } catch (error) {
        console.error('Error adding supervisor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.*, u.firstname, u.lastname, u.email, u.contact_number,
                   p.package_name, p.price as package_price,
                   v.vehicle_name, v.vehicle_registration_number,
                   s.supervisor_name
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN packages p ON b.package_id = p.id
            LEFT JOIN vehicles v ON b.vehicle_id = v.id
            LEFT JOIN supervisors s ON b.supervisor_id = s.id
            ORDER BY b.created_at DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update booking status
router.put('/bookings/:id/status', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Booking status updated' });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all packages
router.get('/packages', adminAuth, async (req, res) => {
    try {
        const [packages] = await db.query('SELECT * FROM packages');
        res.json(packages);
    } catch (error) {
        console.error('Error loading packages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update package
router.put('/packages/:id', adminAuth, async (req, res) => {
    const { id } = req.params;
    const { price, laborers, truck_size, insurance_type, packing_materials, furniture_assembly, description } = req.body;
    try {
        await db.query(
            'UPDATE packages SET price = ?, laborers = ?, truck_size = ?, insurance_type = ?, packing_materials = ?, furniture_assembly = ?, description = ? WHERE id = ?',
            [price, laborers, truck_size, insurance_type, packing_materials, furniture_assembly, description, id]
        );
        res.json({ message: 'Package updated' });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get booking media
router.get('/booking-media', adminAuth, async (req, res) => {
    try {
        const [media] = await db.query('SELECT * FROM booking_media ORDER BY created_at DESC');
        res.json(media);
    } catch (error) {
        console.error('Error loading media:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;