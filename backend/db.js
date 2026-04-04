const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Create connection pool for Aiven MySQL with SSL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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

// Test the connection immediately
(async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ MySQL Database connected successfully!');
        console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        connection.release();
    } catch (err) {
        console.error('❌ MySQL Database connection failed!');
        console.error('Error details:', err.message);
        console.error('Please check:');
        console.error('  1. DB_HOST:', process.env.DB_HOST);
        console.error('  2. DB_PORT:', process.env.DB_PORT);
        console.error('  3. DB_USER:', process.env.DB_USER);
        console.error('  4. DB_NAME:', process.env.DB_NAME);
        console.error('  5. Is your Aiven service running?');
    }
})();

module.exports = promisePool;
