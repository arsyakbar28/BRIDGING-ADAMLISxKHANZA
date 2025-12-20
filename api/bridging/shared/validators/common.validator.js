/**
 * Common Validator
 * Common validation functions
 * SHARED across all lab types (PK, PA, MB)
 */

/**
 * Validate required string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} {valid: boolean, message: string}
 */
function validateRequired(value, fieldName) {
    if (!value || value.toString().trim() === '') {
        return { valid: false, message: `${fieldName} is required and cannot be empty` };
    }
    return { valid: true, message: '' };
}

/**
 * Validate array not empty
 * @param {Array} value - Array to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} {valid: boolean, message: string}
 */
function validateArrayNotEmpty(value, fieldName) {
    if (!Array.isArray(value)) {
        return { valid: false, message: `${fieldName} must be an array` };
    }
    if (value.length === 0) {
        return { valid: false, message: `${fieldName} cannot be empty` };
    }
    return { valid: true, message: '' };
}

/**
 * Validate keterangan value
 * @param {string} keterangan - Keterangan value (L, H, T, N, or empty)
 * @returns {Object} {valid: boolean, message: string}
 */
function validateKeterangan(keterangan) {
    if (!keterangan || keterangan.trim() === '') {
        return { valid: true, message: '' }; // Empty is valid
    }
    
    const validValues = ['L', 'H', 'T', 'N', 'l', 'h', 't', 'n'];
    if (!validValues.includes(keterangan)) {
        return { valid: false, message: 'Keterangan must be L (Low), H (High), T (Abnormal), N (Normal), or empty' };
    }
    
    return { valid: true, message: '' };
}

module.exports = {
    validateRequired,
    validateArrayNotEmpty,
    validateKeterangan
};

