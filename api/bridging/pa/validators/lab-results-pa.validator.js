/**
 * Lab Results PA Validator
 * Validation logic for lab results (PA - Patologi Anatomi)
 * PA uses narrative format, not itemized results
 */

const { validateDateFormat, validateTimeFormat } = require('../../shared/validators/date-time.validator');
const { validateRequired } = require('../../shared/validators/common.validator');

/**
 * Comprehensive validation of PA lab data BEFORE database operations
 * PA format is different from PK/MB: narrative format, single kd_jenis_prw, hasil_pa object
 * @param {Object} labData - Lab data to validate
 * @returns {Object} {valid: boolean, errors: Array}
 */
function validateLabData(labData) {
    const errors = [];
    
    // 1. Validate required root fields
    const requiredFields = [
        { field: 'noorder', value: labData.noorder },
        { field: 'kd_jenis_prw', value: labData.kd_jenis_prw },
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
    
    // 4. Validate hasil_pa object exists (required for PA)
    if (!labData.hasil_pa || typeof labData.hasil_pa !== 'object') {
        errors.push({ 
            field: 'hasil_pa', 
            message: 'hasil_pa object is required for PA results' 
        });
        return { valid: false, errors }; // Stop here if object missing
    }
    
    // 5. Validate hasil_pa fields (all are optional, but object must exist)
    // No strict validation needed for narrative fields (can be empty strings)
    // Fields: diagnosa_klinik, makroskopik, mikroskopik, kesimpulan, kesan
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

module.exports = {
    validateLabData
};
