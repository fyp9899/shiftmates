const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// Try to load .env file if it exists (local development only)
try {
    const envPath = path.join(__dirname, '../.env');
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        console.log('.env file loaded successfully for local development');
    }
} catch (err) {
    // On Render, .env file doesn't exist - that's fine
    console.log('No .env file found, using environment variables');
}

// Create connection pool for Aiven MySQL with SSL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shiftmates',
    ssl: {
        rejectUnauthorized: false  // Required for Aiven
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true
});

const promisePool = pool.promise();

// Test database connection
promisePool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Database connected successfully!');
        console.log(`📊 Database: ${process.env.DB_NAME || 'shiftmates'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL Database connection failed!');
        console.error('Error details:', err.message);
        console.error('Please check your environment variables:');
        console.error('DB_HOST:', process.env.DB_HOST);
        console.error('DB_PORT:', process.env.DB_PORT);
        console.error('DB_USER:', process.env.DB_USER);
        console.error('DB_NAME:', process.env.DB_NAME);
    });

module.exports = promisePool;