/**
 * POST Lab PA Repository
 * Database operations for posting lab results (PA - Patologi Anatomi)
 */

/**
 * Get lab request info by noorder
 */
async function getLabRequestInfo(conn, noorder) {
    try {
        const query = "SELECT no_rawat FROM permintaan_labpa WHERE noorder = ?";
        const [results] = await conn.execute(query, [noorder]);
        return results.length > 0 ? results[0].no_rawat : null;
    } catch (error) {
        console.error('❌ Error getting lab request info:', error);
        return null;
    }
}

/**
 * Get tarif data for jenis perawatan
 */
async function getTarifData(conn, kd_jenis_prw) {
    const query = `
        SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp,
               tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas,
               kso, menejemen, kategori, status
        FROM jns_perawatan_lab
        WHERE kd_jenis_prw = ?
    `;
    const [results] = await conn.execute(query, [kd_jenis_prw]);
    
    if (results.length === 0) return null;
    
    const row = results[0];
    return {
        kd_jenis_prw: row.kd_jenis_prw,
        nm_perawatan: row.nm_perawatan,
        biaya_tindakan: parseFloat(row.total_byr) || 0,
        bagian_rs: parseFloat(row.bagian_rs) || 0,
        bhp: parseFloat(row.bhp) || 0,
        tarif_perujuk: parseFloat(row.tarif_perujuk) || 0,
        tarif_tindakan_dokter: parseFloat(row.tarif_tindakan_dokter) || 0,
        tarif_tindakan_petugas: parseFloat(row.tarif_tindakan_petugas) || 0,
        kso: parseFloat(row.kso) || 0,
        menejemen: parseFloat(row.menejemen) || 0,
        kategori: row.kategori,
        status: row.status
    };
}

/**
 * Validate dokter exists
 */
async function validateDokter(conn, kd_dokter) {
    const query = "SELECT kd_dokter FROM dokter WHERE kd_dokter = ?";
    const [results] = await conn.execute(query, [kd_dokter]);
    return results.length > 0;
}

/**
 * Validate petugas exists
 */
async function validatePetugas(conn, nip) {
    const query = "SELECT nip FROM petugas WHERE nip = ?";
    const [results] = await conn.execute(query, [nip]);
    return results.length > 0;
}

/**
 * Delete old PA lab data for specific order (no_rawat + tgl_periksa + jam)
 */
async function deleteOldLabData(conn, no_rawat, tgl_periksa, jam) {
    // 1. Delete detail_periksa_labpa first (child table)
    await conn.execute(
        "DELETE FROM detail_periksa_labpa WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?",
        [no_rawat, tgl_periksa, jam]
    );
    
    // 2. Delete periksa_lab
    await conn.execute(
        "DELETE FROM periksa_lab WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?",
        [no_rawat, tgl_periksa, jam]
    );
    
    // 3. Delete saran_kesan_lab
    await conn.execute(
        "DELETE FROM saran_kesan_lab WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?",
        [no_rawat, tgl_periksa, jam]
    );
}

/**
 * Insert periksa_lab
 */
async function insertPeriksaLab(conn, data) {
    const query = `
        INSERT INTO periksa_lab 
        (no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp, 
         tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen, 
         biaya, kd_dokter, status, kategori)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await conn.execute(query, [
        data.no_rawat,
        data.nip,
        data.kd_jenis_prw,
        data.tgl_periksa,
        data.jam,
        data.dokter_perujuk,
        data.bagian_rs,
        data.bhp,
        data.tarif_perujuk,
        data.tarif_tindakan_dokter,
        data.tarif_tindakan_petugas,
        data.kso,
        data.menejemen,
        data.biaya,
        data.kd_dokter,
        data.status,
        data.kategori
    ]);
}

/**
 * Insert detail_periksa_labpa (PA specific - narrative format)
 */
async function insertDetailPeriksaLabPA(conn, data) {
    const query = `
        INSERT INTO detail_periksa_labpa 
        (no_rawat, kd_jenis_prw, tgl_periksa, jam, diagnosa_klinik, 
         makroskopik, mikroskopik, kesimpulan, kesan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await conn.execute(query, [
        data.no_rawat,
        data.kd_jenis_prw,
        data.tgl_periksa,
        data.jam,
        data.diagnosa_klinik || '',
        data.makroskopik || '',
        data.mikroskopik || '',
        data.kesimpulan || '',
        data.kesan || ''
    ]);
}

/**
 * Update permintaan_labpa
 */
async function updatePermintaanLab(conn, noorder, tgl_periksa, jam_periksa) {
    const query = `
        UPDATE permintaan_labpa 
        SET tgl_hasil = ?, jam_hasil = ?
        WHERE noorder = ?
    `;
    await conn.execute(query, [tgl_periksa, jam_periksa, noorder]);
}

/**
 * Insert saran kesan lab
 */
async function insertSaranKesanLab(conn, no_rawat, tgl_periksa, jam_periksa, kesan, saran) {
    const query = `
        INSERT INTO saran_kesan_lab 
        (no_rawat, tgl_periksa, jam, kesan, saran)
        VALUES (?, ?, ?, ?, ?)
    `;
    await conn.execute(query, [no_rawat, tgl_periksa, jam_periksa, kesan || '', saran || '']);
}

module.exports = {
    getLabRequestInfo,
    getTarifData,
    validateDokter,
    validatePetugas,
    deleteOldLabData,
    insertPeriksaLab,
    insertDetailPeriksaLabPA,
    updatePermintaanLab,
    insertSaranKesanLab
};
