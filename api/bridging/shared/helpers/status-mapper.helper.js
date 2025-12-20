/**
 * Status Mapper Helper
 * Map status codes to descriptions
 * SHARED across all lab types (PK, PA, MB)
 */

/**
 * Get status from keterangan field
 * @param {string} keterangan - Keterangan field (L, H, T, N, or empty)
 * @returns {string} Status description
 */
function getStatusFromKeterangan(keterangan) {
    switch (keterangan?.toLowerCase()) {
        case 'l':
            return 'Low (Rendah)';
        case 'h':
            return 'High (Tinggi)';
        case 't':
            return 'Abnormal';
        case 'n':
            return 'Normal';
        default:
            return 'Normal';
    }
}

module.exports = {
    getStatusFromKeterangan
};

