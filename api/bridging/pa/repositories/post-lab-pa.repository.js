async function getLabRequestInfo(conn, noorder) {
    const [results] = await conn.execute(
        'SELECT no_rawat, status, dokter_perujuk FROM permintaan_labpa WHERE noorder = ?',
        [noorder]
    );
    return results.length > 0 ? results[0] : null;
}

async function getRequestedTindakan(conn, noorder) {
    const [results] = await conn.execute(
        `SELECT ppl.kd_jenis_prw, jpl.nm_perawatan, jpl.total_byr, jpl.bagian_rs, jpl.bhp,
                jpl.tarif_perujuk, jpl.tarif_tindakan_dokter, jpl.tarif_tindakan_petugas,
                jpl.kso, jpl.menejemen, jpl.kategori
         FROM permintaan_pemeriksaan_labpa ppl
         LEFT JOIN jns_perawatan_lab jpl ON ppl.kd_jenis_prw = jpl.kd_jenis_prw
         WHERE ppl.noorder = ?
         ORDER BY ppl.kd_jenis_prw
         LIMIT 1`,
        [noorder]
    );
    return results.length > 0 ? results[0] : null;
}

async function validateDokter(conn, kd_dokter) {
    const [results] = await conn.execute('SELECT kd_dokter FROM dokter WHERE kd_dokter = ?', [kd_dokter]);
    return results.length > 0;
}

async function validatePetugas(conn, nip) {
    const [results] = await conn.execute('SELECT nip FROM petugas WHERE nip = ?', [nip]);
    return results.length > 0;
}

async function deleteOldLabData(conn, no_rawat, tgl_periksa, jam) {
    await conn.execute('DELETE FROM detail_periksa_labpa WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?', [no_rawat, tgl_periksa, jam]);
    await conn.execute('DELETE FROM periksa_lab WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ? AND kategori = ?', [no_rawat, tgl_periksa, jam, 'PA']);
    await conn.execute('DELETE FROM saran_kesan_lab WHERE no_rawat = ? AND tgl_periksa = ? AND jam = ?', [no_rawat, tgl_periksa, jam]);
}

async function insertPeriksaLab(conn, data) {
    await conn.execute(
        `INSERT INTO periksa_lab
         (no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp,
          tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen,
          biaya, kd_dokter, status, kategori)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.no_rawat, data.nip, data.kd_jenis_prw, data.tgl_periksa, data.jam,
            data.dokter_perujuk, data.bagian_rs, data.bhp, data.tarif_perujuk,
            data.tarif_tindakan_dokter, data.tarif_tindakan_petugas, data.kso,
            data.menejemen, data.biaya, data.kd_dokter, data.status, data.kategori
        ]
    );
}

async function insertDetailPeriksaLabPa(conn, data) {
    await conn.execute(
        `INSERT INTO detail_periksa_labpa
         (no_rawat, kd_jenis_prw, tgl_periksa, jam, diagnosa_klinik, makroskopik, mikroskopik, kesimpulan, kesan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.no_rawat, data.kd_jenis_prw, data.tgl_periksa, data.jam, data.diagnosa_klinik, data.makroskopik, data.mikroskopik, data.kesimpulan, data.kesan]
    );
}

async function updatePermintaanLabPa(conn, noorder, tgl_periksa, jam_periksa) {
    await conn.execute('UPDATE permintaan_labpa SET tgl_hasil = ?, jam_hasil = ? WHERE noorder = ?', [tgl_periksa, jam_periksa, noorder]);
}

async function insertSaranKesanLab(conn, no_rawat, tgl_periksa, jam_periksa, kesan, saran) {
    await conn.execute(
        'INSERT INTO saran_kesan_lab (no_rawat, tgl_periksa, jam, kesan, saran) VALUES (?, ?, ?, ?, ?)',
        [no_rawat, tgl_periksa, jam_periksa, kesan || '', saran || '']
    );
}

module.exports = {
    getLabRequestInfo,
    getRequestedTindakan,
    validateDokter,
    validatePetugas,
    deleteOldLabData,
    insertPeriksaLab,
    insertDetailPeriksaLabPa,
    updatePermintaanLabPa,
    insertSaranKesanLab
};
