/**
 * Database Configuration
 * Centralized database configuration for all APIs
 * 
 * OPTIMIZED: Uses connection pooling for better performance
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration with connection pool settings
const dbConfig = {
    host: process.env.DB_HOST || '192.168.75.200',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'adhyaksa_db',
    user: process.env.DB_USER || 'adhyaksa',
    password: process.env.DB_PASSWORD || 'Adhyaksa123@',
    // Connection pool settings
    waitForConnections: true,
    connectionLimit: 10, // Max 10 concurrent connections
    queueLimit: 0,       // Unlimited queue
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool (initialized once)
const pool = mysql.createPool(dbConfig);

/**
 * Get database connection from pool
 * @returns {Promise<mysql.PoolConnection>} Database connection from pool
 */
async function getDbConnection() {
    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (error) {
        console.error('❌ Error getting connection from pool:', error);
        throw error;
    }
}

/**
 * Release connection back to pool
 * @param {mysql.PoolConnection} connection Database connection
 */
async function closeDbConnection(connection) {
    if (connection) {
        connection.release(); // Release back to pool (not end())
    }
}

/**
 * Close entire connection pool (for graceful shutdown)
 */
async function closePool() {
    await pool.end();
    console.log('🔌 Database connection pool closed');
}

module.exports = {
    getDbConnection,
    closeDbConnection,
    closePool,
    dbConfig,
    pool
};
