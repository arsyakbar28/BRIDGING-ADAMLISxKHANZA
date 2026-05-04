const { validateDateFormat, validateTimeFormat } = require('../../shared/validators/date-time.validator');
const { validateRequired } = require('../../shared/validators/common.validator');

function validateLabData(labData) {
    const errors = [];
    [
        ['noorder', labData.noorder],
        ['dokter_pj', labData.dokter_pj],
        ['petugas', labData.petugas],
        ['dokter_perujuk', labData.dokter_perujuk]
    ].forEach(([field, value]) => {
        const v = validateRequired(value, field);
        if (!v.valid) errors.push({ field, message: v.message });
    });

    const d = validateDateFormat(labData.tgl_periksa);
    if (!d.valid) errors.push({ field: 'tgl_periksa', message: d.message });

    const t = validateTimeFormat(labData.jam_periksa);
    if (!t.valid) errors.push({ field: 'jam_periksa', message: t.message });

    if (!labData.hasil_pa || typeof labData.hasil_pa !== 'object' || Array.isArray(labData.hasil_pa)) {
        errors.push({ field: 'hasil_pa', message: 'hasil_pa object is required' });
    } else {
        const hasAnyResult = ['diagnosa_klinik', 'makroskopik', 'mikroskopik', 'kesimpulan', 'kesan']
            .some(field => labData.hasil_pa[field] !== null && labData.hasil_pa[field] !== undefined && String(labData.hasil_pa[field]).trim() !== '');
        if (!hasAnyResult) {
            errors.push({ field: 'hasil_pa', message: 'At least one PA result field must be filled' });
        }
    }

    return { valid: errors.length === 0, errors };
}

module.exports = { validateLabData };
