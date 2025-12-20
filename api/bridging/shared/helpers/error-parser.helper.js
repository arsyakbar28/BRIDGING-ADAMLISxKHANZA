/**
 * Error Parser Helper
 * Parse database errors to user-friendly messages
 * SHARED across all lab types (PK, PA, MB)
 */

/**
 * Parse database error to user-friendly message
 * @param {Error} error - Database error object
 * @param {Object} context - Context data (dokter_pj, petugas, etc)
 * @returns {string} User-friendly error message
 */
function parseDatabaseError(error, context = {}) {
    const errorMessage = error.message || '';
    
    // Foreign key constraint errors
    if (errorMessage.includes('foreign key constraint fails')) {
        
        // Check for petugas NIP error
        if (errorMessage.includes('`petugas`') || errorMessage.includes('(`nip`)')) {
            const nipValue = context.petugas || 'tidak diketahui';
            return `Kode petugas tidak valid: "${nipValue}". Pastikan kode petugas terdaftar di sistem.`;
        }
        
        // Check for dokter error
        if (errorMessage.includes('`dokter`') || errorMessage.includes('(`kd_dokter`)')) {
            const dokterValue = context.dokter_pj || context.dokter_perujuk || 'tidak diketahui';
            return `Kode dokter tidak valid: "${dokterValue}". Pastikan kode dokter terdaftar di sistem.`;
        }
        
        // Check for template/pemeriksaan error
        if (errorMessage.includes('`template_laboratorium`')) {
            return `Kode pemeriksaan tidak valid. Pastikan kode pemeriksaan terdaftar di sistem.`;
        }
        
        // Generic foreign key error
        return 'Data referensi tidak valid. Pastikan semua kode (dokter, petugas, pemeriksaan) sudah terdaftar di sistem.';
    }
    
    // Duplicate entry errors
    if (errorMessage.includes('Duplicate entry')) {
        if (errorMessage.includes('PRIMARY')) {
            return 'Data sudah ada untuk kombinasi no_rawat, tanggal, dan jam ini. Gunakan tanggal/jam yang berbeda untuk update.';
        }
        return 'Data duplikat terdeteksi. Periksa kembali data yang dikirim.';
    }
    
    // Data too long errors
    if (errorMessage.includes('Data too long')) {
        return 'Data terlalu panjang untuk salah satu field. Periksa panjang karakter input.';
    }
    
    // Connection errors
    if (errorMessage.includes('connect') || errorMessage.includes('connection')) {
        return 'Gagal terhubung ke database. Silakan coba lagi atau hubungi administrator.';
    }
    
    // Transaction errors
    if (errorMessage.includes('transaction') || errorMessage.includes('deadlock')) {
        return 'Terjadi konflik data. Silakan coba lagi.';
    }
    
    // Default: return generic message without technical details
    return 'Terjadi kesalahan saat memproses data. Silakan periksa kembali data yang dikirim.';
}

module.exports = {
    parseDatabaseError
};

