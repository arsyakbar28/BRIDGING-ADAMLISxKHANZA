/**
 * Authentication Routes
 * Handles login and token generation
 */

const express = require('express');
const router = express.Router();
const { generateToken, verifyToken } = require('../../middleware/auth.middleware');
require('dotenv').config();

// Default credentials (in production, use database)
const DEFAULT_USERNAME = process.env.AUTH_USERNAME ;
const DEFAULT_PASSWORD = process.env.AUTH_PASSWORD ;

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
                payload: []
            });
        }

        // Simple authentication (in production, check against database)
        if (username !== DEFAULT_USERNAME || password !== DEFAULT_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password',
                payload: []
            });
        }

        // Generate token with user info
        const tokenPayload = {
            username: username,
            userId: 'admin', // In production, use actual user ID from database
            role: 'admin',
            iat: Math.floor(Date.now() / 1000)
        };

        const token = generateToken(tokenPayload);

        // Calculate expiration time
        const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
        const NO_EXPIRY = expiresIn.toLowerCase() === 'never';
        
        let responsePayload = {
            token: token,
            tokenType: 'Bearer',
            expiresIn: NO_EXPIRY ? 'never' : expiresIn,
            user: {
                username: username,
                role: 'admin'
            }
        };

        // Only add expiresAt if token has expiry
        if (!NO_EXPIRY) {
            let expiresInSeconds = 86400; // Default 24 hours
            if (expiresIn.includes('h')) {
                expiresInSeconds = parseInt(expiresIn) * 3600;
            } else if (expiresIn.includes('m')) {
                expiresInSeconds = parseInt(expiresIn) * 60;
            } else if (expiresIn.includes('d')) {
                expiresInSeconds = parseInt(expiresIn) * 86400;
            }
            responsePayload.expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
        } else {
            responsePayload.expiresAt = null;
            responsePayload.message = 'Token never expires';
        }

        res.json({
            success: true,
            message: 'Login successful',
            payload: responsePayload
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            payload: []
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify token validity
 */
router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                payload: []
            });
        }

        const decoded = verifyToken(token);
        
        const payload = {
            user: {
                username: decoded.username,
                userId: decoded.userId,
                role: decoded.role
            }
        };

        // Check if token has expiry
        if (decoded.exp) {
            payload.expiresAt = new Date(decoded.exp * 1000).toISOString();
            payload.isExpired = decoded.exp < Math.floor(Date.now() / 1000);
        } else {
            payload.expiresAt = null;
            payload.isExpired = false;
            payload.message = 'Token never expires';
        }
        
        res.json({
            success: true,
            message: 'Token is valid',
            payload: payload
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired',
                payload: []
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token',
                payload: []
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Token verification failed',
                payload: []
            });
        }
    }
});

module.exports = router;

