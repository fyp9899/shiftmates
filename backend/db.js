const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from root directory - with explicit path
const envPath = path.join(__dirname, '../.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
} else {
    console.log('.env file loaded successfully');
    console.log('ADMIN_USERNAME from env:', process.env.ADMIN_USERNAME);
    console.log('ADMIN_PASSWORD from env:', process.env.ADMIN_PASSWORD ? '***set***' : 'not set');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'askarikazmi123',
    database: process.env.DB_NAME || 'shiftmates',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test database connection
promisePool.getConnection()
    .then(connection => {
        console.log('Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
    });

module.exports = promisePool;