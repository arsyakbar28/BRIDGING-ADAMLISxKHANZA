/**
 * Response Helper
 * Standardized response format
 * SHARED across all lab types (PK, PA, MB)
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} payload - Response data
 * @param {Object} extra - Extra data (optional)
 */
function success(res, message, payload = [], extra = {}) {
    return res.status(200).json({
        success: true,
        message,
        ...extra,
        payload
    });
}

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} payload - Response data
 */
function created(res, message, payload = []) {
    return res.status(201).json({
        success: true,
        message,
        payload
    });
}

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Array} errors - Validation errors (optional)
 */
function badRequest(res, message, errors = []) {
    const response = {
        success: false,
        message,
        payload: []
    };
    
    if (errors.length > 0) {
        response.errors = errors;
    }
    
    return res.status(400).json(response);
}

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function notFound(res, message) {
    return res.status(404).json({
        success: false,
        message,
        payload: []
    });
}

/**
 * Server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function serverError(res, message) {
    return res.status(500).json({
        success: false,
        message,
        payload: []
    });
}

module.exports = {
    success,
    created,
    badRequest,
    notFound,
    serverError
};

