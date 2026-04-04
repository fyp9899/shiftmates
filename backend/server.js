const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Replace the CORS section with:
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://*.loca.lt',           // For localtunnel
        'https://*.ngrok.io',           // For ngrok
        'https://*.trycloudflare.com',  // For cloudflare
        'https://*.tunnelmole.net'      // For tunnelmole
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.JWT_SECRET || 'shiftmates_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/booking');
const employeeRoutes = require('./routes/employee');
const vehicleRoutes = require('./routes/vehicles');
const supervisorRoutes = require('./routes/supervisor');
const packageRoutes = require('./routes/packages');

// Static files
app.use(express.static(path.join(__dirname, '../website')));
app.use('/css', express.static(path.join(__dirname, '../website/css')));
app.use('/js', express.static(path.join(__dirname, '../website/js')));
app.use('/app', express.static(path.join(__dirname, '../app')));
app.use('/cms', express.static(path.join(__dirname, '../cms')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/packages', packageRoutes);

// HTML routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../website/index.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../app/index.html'));
});

app.get('/cms', (req, res) => {
    res.sendFile(path.join(__dirname, '../cms/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n=================================`);
    console.log(`🚀 ShiftMates Server Started!`);
    console.log(`=================================`);
    console.log(`📱 WEBSITE: http://localhost:${PORT}`);
    console.log(`📲 APP: http://localhost:${PORT}/app`);
    console.log(`🔧 CMS: http://localhost:${PORT}/cms`);
    console.log(`=================================\n`);
});