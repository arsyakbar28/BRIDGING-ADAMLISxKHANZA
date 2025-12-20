/**
 * Date Time Validator
 * Validate date and time formats
 * SHARED across all lab types (PK, PA, MB)
 */

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {Object} {valid: boolean, message: string}
 */
function validateDateFormat(dateString) {
    if (!dateString) {
        return { valid: false, message: 'Date is required' };
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return { valid: false, message: 'Date must be in format YYYY-MM-DD' };
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return { valid: false, message: 'Invalid date value' };
    }
    
    return { valid: true, message: '' };
}

/**
 * Validate time format (HH:MM:SS)
 * @param {string} timeString - Time string to validate
 * @returns {Object} {valid: boolean, message: string}
 */
function validateTimeFormat(timeString) {
    if (!timeString) {
        return { valid: false, message: 'Time is required' };
    }
    
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(timeString)) {
        return { valid: false, message: 'Time must be in format HH:MM:SS (e.g., 15:30:00)' };
    }
    
    return { valid: true, message: '' };
}

module.exports = {
    validateDateFormat,
    validateTimeFormat
};

