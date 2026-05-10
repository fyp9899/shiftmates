const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// For Aiven MySQL (production) - requires SSL
// For local development - no SSL
const isProduction = process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(isProduction && {
        ssl: {
            ca: process.env.DB_CA_CERT || undefined,
            rejectUnauthorized: false
        }
    }),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    enableKeepAlive: true
});

const promisePool = pool.promise();

// Test connection
promisePool.getConnection()
    .then(connection => {
        console.log('✅ MySQL Database connected successfully!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL Database connection failed!');
        console.error('Error:', err.message);
    });

module.exports = promisePool;