/**
 * Lab Results MB Validator
 * Validation logic for lab results (MB - Mikrobiologi)
 */

const { validateDateFormat, validateTimeFormat } = require('../../shared/validators/date-time.validator');
const { validateRequired, validateArrayNotEmpty, validateKeterangan } = require('../../shared/validators/common.validator');

/**
 * Validate that nilai_rujukan is provided
 * @param {string|null} nilaiRujukan - Nilai rujukan value
 * @returns {boolean} True if valid
 */
function validateNilaiRujukan(nilaiRujukan) {
    if (nilaiRujukan === null || nilaiRujukan === undefined) {
        return false;
    }
    
    const trimmed = nilaiRujukan.toString().trim();
    if (trimmed === '') {
        return false;
    }
    
    return true;
}

/**
 * Comprehensive validation of lab data BEFORE database operations
 * @param {Object} labData - Lab data to validate
 * @returns {Object} {valid: boolean, errors: Array}
 */
function validateLabData(labData) {
    const errors = [];
    
    // 1. Validate required root fields
    const requiredFields = [
        { field: 'noorder', value: labData.noorder },
        { field: 'dokter_pj', value: labData.dokter_pj },
        { field: 'petugas', value: labData.petugas },
        { field: 'dokter_perujuk', value: labData.dokter_perujuk }
    ];

    requiredFields.forEach(({ field, value }) => {
        const validation = validateRequired(value, field);
        if (!validation.valid) {
            errors.push({ field, message: validation.message });
        }
    });
    
    // 2. Validate date format
    const dateValidation = validateDateFormat(labData.tgl_periksa);
    if (!dateValidation.valid) {
        errors.push({ field: 'tgl_periksa', message: dateValidation.message });
    }
    
    // 3. Validate time format
    const timeValidation = validateTimeFormat(labData.jam_periksa);
    if (!timeValidation.valid) {
        errors.push({ field: 'jam_periksa', message: timeValidation.message });
    }
    
    // 4. Validate pemeriksaan array
    const arrayValidation = validateArrayNotEmpty(labData.pemeriksaan, 'pemeriksaan');
    if (!arrayValidation.valid) {
        errors.push({ field: 'pemeriksaan', message: arrayValidation.message });
        return { valid: false, errors }; // Stop here if array invalid
    }
    
    // 5. Validate each pemeriksaan item
    labData.pemeriksaan.forEach((item, index) => {
        const prefix = `pemeriksaan[${index}]`;
        
        // Validate kode_pemeriksaan
        if (!item.kode_pemeriksaan || item.kode_pemeriksaan.toString().trim() === '') {
            errors.push({ 
                field: `${prefix}.kode_pemeriksaan`, 
                message: 'kode_pemeriksaan is required and cannot be empty',
                index: index
            });
        }
        
        // Validate hasil
        if (item.hasil === null || item.hasil === undefined || item.hasil.toString().trim() === '') {
            errors.push({ 
                field: `${prefix}.hasil`, 
                message: 'hasil is required and cannot be empty',
                index: index
            });
        }
        
        // nilai_rujukan is optional - no validation needed
        // If null/undefined, will be handled in service with default value ""
    });
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

module.exports = {
    validateLabData,
    validateNilaiRujukan
};
