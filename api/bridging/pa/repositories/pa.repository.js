/**
 * PA Repository
 * Database operations for Patologi Anatomi bridging.
 */

async function findLatestRegistrationByMedicalRecord(conn, noRm) {
    const query = `
        SELECT no_rawat, status_lanjut
        FROM reg_periksa
        WHERE no_rkm_medis = ?
        ORDER BY tgl_registrasi DESC, jam_reg DESC
        LIMIT 1
    `;
    const [results] = await conn.execute(query, [noRm]);
    return results.length > 0 ? results[0] : null;
}

async function validateDoctor(conn, kdDokter) {
    const [results] = await conn.execute('SELECT kd_dokter FROM dokter WHERE kd_dokter = ?', [kdDokter]);
    return results.length > 0;
}

async function validatePaTindakan(conn, kdJenisPrw) {
    const query = `
        SELECT kd_jenis_prw, nm_perawatan
        FROM jns_perawatan_lab
        WHERE kd_jenis_prw = ? AND kategori = 'PA'
    `;
    const [results] = await conn.execute(query, [kdJenisPrw]);
    return results.length > 0 ? results[0] : null;
}

async function createRegistration(conn, data) {
    const query = `
        INSERT INTO permintaan_labpa
            (noorder, no_rawat, tgl_permintaan, jam_permintaan, tgl_sampel, jam_sampel,
             tgl_hasil, jam_hasil, dokter_perujuk, status, informasi_tambahan, diagnosa_klinis,
             pengambilan_bahan, diperoleh_dengan, lokasi_jaringan, diawetkan_dengan,
             pernah_dilakukan_di, tanggal_pa_sebelumnya, nomor_pa_sebelumnya, diagnosa_pa_sebelumnya)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await conn.execute(query, [
        data.noorder,
        data.no_rawat,
        data.tgl_permintaan,
        data.jam_permintaan,
        data.tgl_sampel,
        data.jam_sampel,
        data.tgl_hasil,
        data.jam_hasil,
        data.dokter_perujuk,
        data.status,
        data.informasi_tambahan,
        data.diagnosa_klinis,
        data.pengambilan_bahan,
        data.diperoleh_dengan,
        data.lokasi_jaringan,
        data.diawetkan_dengan,
        data.pernah_dilakukan_di,
        data.tanggal_pa_sebelumnya,
        data.nomor_pa_sebelumnya,
        data.diagnosa_pa_sebelumnya
    ]);
}

async function createRegistrationTindakan(conn, noorder, kdJenisPrw) {
    const query = `
        INSERT INTO permintaan_pemeriksaan_labpa (noorder, kd_jenis_prw, stts_bayar)
        VALUES (?, ?, 'Belum')
    `;
    await conn.execute(query, [noorder, kdJenisPrw]);
}

async function getPaRequestInfo(conn, noorder) {
    const query = `
        SELECT
            pl.noorder,
            pl.no_rawat,
            pl.tgl_permintaan,
            pl.jam_permintaan,
            pl.tgl_hasil,
            pl.jam_hasil,
            pl.dokter_perujuk,
            pl.status,
            pl.diagnosa_klinis,
            pp.kd_jenis_prw,
            jpl.nm_perawatan
        FROM permintaan_labpa pl
        LEFT JOIN permintaan_pemeriksaan_labpa pp ON pp.noorder = pl.noorder
        LEFT JOIN jns_perawatan_lab jpl ON jpl.kd_jenis_prw = pp.kd_jenis_prw
        WHERE pl.noorder = ?
        ORDER BY pp.kd_jenis_prw
        LIMIT 1
    `;
    const [results] = await conn.execute(query, [noorder]);
    return results.length > 0 ? results[0] : null;
}

async function getTarifData(conn, kdJenisPrw) {
    const query = `
        SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp,
               tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas,
               kso, menejemen, kategori
        FROM jns_perawatan_lab
        WHERE kd_jenis_prw = ? AND kategori = 'PA'
    `;
    const [results] = await conn.execute(query, [kdJenisPrw]);
    return results.length > 0 ? results[0] : null;
}

async function upsertPeriksaLab(conn, data) {
    const query = `
        INSERT INTO periksa_lab
            (no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp,
             tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen,
             biaya, kd_dokter, status, kategori)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PA')
        ON DUPLICATE KEY UPDATE
            nip = VALUES(nip),
            dokter_perujuk = VALUES(dokter_perujuk),
            bagian_rs = VALUES(bagian_rs),
            bhp = VALUES(bhp),
            tarif_perujuk = VALUES(tarif_perujuk),
            tarif_tindakan_dokter = VALUES(tarif_tindakan_dokter),
            tarif_tindakan_petugas = VALUES(tarif_tindakan_petugas),
            kso = VALUES(kso),
            menejemen = VALUES(menejemen),
            biaya = VALUES(biaya),
            kd_dokter = VALUES(kd_dokter),
            status = VALUES(status)
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
        data.status
    ]);
}

async function upsertDetailPeriksaLabPa(conn, data) {
    const query = `
        INSERT INTO detail_periksa_labpa
            (no_rawat, kd_jenis_prw, tgl_periksa, jam, diagnosa_klinik,
             makroskopik, mikroskopik, kesimpulan, kesan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            diagnosa_klinik = VALUES(diagnosa_klinik),
            makroskopik = VALUES(makroskopik),
            mikroskopik = VALUES(mikroskopik),
            kesimpulan = VALUES(kesimpulan),
            kesan = VALUES(kesan)
    `;

    await conn.execute(query, [
        data.no_rawat,
        data.kd_jenis_prw,
        data.tgl_periksa,
        data.jam,
        data.diagnosa_klinik,
        data.makroskopik,
        data.mikroskopik,
        data.kesimpulan,
        data.kesan
    ]);
}

async function replacePaImage(conn, data) {
    await conn.execute(
        'DELETE FROM detail_periksa_labpa_gambar WHERE no_rawat = ? AND kd_jenis_prw = ? AND tgl_periksa = ? AND jam = ?',
        [data.no_rawat, data.kd_jenis_prw, data.tgl_periksa, data.jam]
    );

    if (!data.photo) return;

    await conn.execute(
        'INSERT INTO detail_periksa_labpa_gambar (no_rawat, kd_jenis_prw, tgl_periksa, jam, photo) VALUES (?, ?, ?, ?, ?)',
        [data.no_rawat, data.kd_jenis_prw, data.tgl_periksa, data.jam, data.photo]
    );
}

async function updatePaRequestResultTime(conn, noorder, tglHasil, jamHasil) {
    const query = `
        UPDATE permintaan_labpa
        SET tgl_hasil = ?, jam_hasil = ?
        WHERE noorder = ?
    `;
    await conn.execute(query, [tglHasil, jamHasil, noorder]);
}

module.exports = {
    findLatestRegistrationByMedicalRecord,
    validateDoctor,
    validatePaTindakan,
    createRegistration,
    createRegistrationTindakan,
    getPaRequestInfo,
    getTarifData,
    upsertPeriksaLab,
    upsertDetailPeriksaLabPa,
    replacePaImage,
    updatePaRequestResultTime
};
