/**
 * Authentication Middleware
 * Validates JWT token and checks expiration
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const NO_EXPIRY = JWT_EXPIRES_IN.toLowerCase() === 'never';

/**
 * Verify JWT token middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function authenticateToken(req, res, next) {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.',
            payload: []
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if token is expired (skip if no expiry is set)
        if (!NO_EXPIRY) {
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < now) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has expired. Please login again.',
                    payload: []
                });
            }
        }

        // Attach user info to request
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.',
                payload: []
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token.',
                payload: []
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Token verification failed.',
                payload: []
            });
        }
    }
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload (user data)
 * @returns {String} JWT token
 */
function generateToken(payload) {
    // If no expiry is set, sign token without expiresIn option
    if (NO_EXPIRY) {
        return jwt.sign(payload, JWT_SECRET);
    } else {
        return jwt.sign(payload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN
        });
    }
}

/**
 * Verify token and return decoded payload
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
}

module.exports = {
    authenticateToken,
    generateToken,
    verifyToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};

