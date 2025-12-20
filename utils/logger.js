/**
 * Logger Utility
 * Centralized logging using Winston with daily rotate file
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log directory
const logDir = path.join(__dirname, '..', 'logs');

// Custom format for logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format (more readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta, null, 2)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'adam-lis-api' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: consoleFormat
        }),
        
        // Write all logs to app.log
        new DailyRotateFile({
            filename: path.join(logDir, 'app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        }),
        
        // Write error logs to error.log
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            format: logFormat
        })
    ]
});

// Special transport for POST request errors
const postErrorTransport = new DailyRotateFile({
    filename: path.join(logDir, 'post-errors-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '90d', // Keep POST error logs for 90 days
    format: logFormat
});

// Add POST error transport
logger.add(postErrorTransport);

/**
 * Log POST request error with detailed information
 * @param {Object} errorInfo - Error information object
 * @param {Error} errorInfo.error - Error object
 * @param {string} errorInfo.noorder - Order number
 * @param {Object} errorInfo.requestBody - Request body (optional, sanitized)
 * @param {string} errorInfo.endpoint - API endpoint
 * @param {string} errorInfo.method - HTTP method
 * @param {Object} errorInfo.user - User information (optional)
 */
function logPostError({ error, noorder, requestBody, endpoint, method = 'POST', user }) {
    const errorData = {
        timestamp: new Date().toISOString(),
        type: 'POST_ERROR',
        method,
        endpoint: endpoint || '/adam-lis/bridging/pk',
        noorder: noorder || 'UNKNOWN',
        error: {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            name: error?.name
        },
        request: {
            body: sanitizeRequestBody(requestBody)
        },
        user: user || null
    };

    logger.error('POST Request Error', errorData);
}

/**
 * Sanitize request body to remove sensitive data and limit size
 * @param {Object} body - Request body
 * @returns {Object} Sanitized request body
 */
function sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields (if any)
    delete sanitized.password;
    delete sanitized.token;
    
    // Limit pemeriksaan array size for logging (keep first 5 only)
    if (sanitized.pemeriksaan && Array.isArray(sanitized.pemeriksaan)) {
        if (sanitized.pemeriksaan.length > 5) {
            sanitized.pemeriksaan = sanitized.pemeriksaan.slice(0, 5);
            sanitized.pemeriksaan_truncated = true;
            sanitized.total_pemeriksaan = body.pemeriksaan.length;
        }
    }
    
    return sanitized;
}

/**
 * Log successful POST request (optional, for tracking)
 * @param {Object} info - Success information
 * @param {string} info.noorder - Order number
 * @param {string} info.endpoint - API endpoint
 * @param {Object} info.summary - Summary of the operation
 */
function logPostSuccess({ noorder, endpoint, summary }) {
    logger.info('POST Request Success', {
        type: 'POST_SUCCESS',
        timestamp: new Date().toISOString(),
        endpoint: endpoint || '/adam-lis/bridging/pk',
        noorder: noorder || 'UNKNOWN',
        summary
    });
}

module.exports = {
    logger,
    logPostError,
    logPostSuccess
};

