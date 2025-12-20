/**
 * Main Application Server
 * Adam LIS API Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const bridgingRoutes = require('./api/bridging/routes');
const authRoutes = require('./api/auth/routes');

// Import middleware
const { authenticateToken } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected API Routes (authentication required)
app.use('/adam-lis/bridging', authenticateToken, bridgingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: "API is running",
        timestamp: new Date().toISOString()
    });
});

// Root endpoint


// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    
    // Handle JSON parse errors specifically
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: `Invalid JSON format: ${err.message}`,
            hint: "Please check your JSON syntax, especially missing commas or brackets",
            payload: []
        });
    }
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        payload: []
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        payload: []
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log('🚀 Adam LIS API Server Started');
    console.log(`📍 Server berjalan di port: ${PORT}`);
    console.log(`🌐 URL API: http://localhost:${PORT}`);
    console.log(`📋 Endpoints tersedia:`);
    console.log(`   ✅ Health Check: http://localhost:${PORT}/api/health`);
    console.log(``);
    console.log(`   🔐 Authentication (Public):`);
    console.log(`      POST /api/auth/login - Login dan dapatkan token`);
    console.log(`      POST /api/auth/verify - Verifikasi token`);
    console.log(``);
    console.log(`   🔬 PK (Patologi Klinis) - Protected (requires token):`);
    console.log(`      GET  /adam-lis/bridging/:limit/:noorder`);
    console.log(`      GET  /adam-lis/bridging/lab-results-pk/:limit/:noorder`);
    console.log(`      POST /adam-lis/bridging/`);
    console.log(`   📝 Note: Tambahkan header "Authorization: Bearer <token>" untuk akses`);
    console.log(``);
    console.log(`   🚧 PA (Patologi Anatomi): Coming Soon`);
    console.log(`   🚧 MB (Mikrobiologi): Coming Soon`);
    console.log(``);
    console.log(`✅ Connection pool initialized (max 10 connections)`);
    console.log(`✅ Modular backend structure (PK/PA/MB separated)`);
    console.log(`✅ Authentication & Authorization enabled`);
    console.log(`✅ Token lifetime: ${process.env.JWT_EXPIRES_IN || '24h'}`);
});

// Graceful shutdown handler
const { closePool } = require('./config/database');

process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        console.log('🛑 HTTP server closed');
        await closePool();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\n⚠️ SIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('🛑 HTTP server closed');
        await closePool();
        process.exit(0);
    });
});

module.exports = app;
