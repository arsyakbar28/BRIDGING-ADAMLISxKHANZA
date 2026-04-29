/**
 * MB Repository
 * Database operations for Mikrobiologi bridging.
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

async function getMbTindakan(conn, kdJenisPrw) {
    const query = `
        SELECT kd_jenis_prw, nm_perawatan, total_byr, bagian_rs, bhp,
               tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas,
               kso, menejemen, kategori
        FROM jns_perawatan_lab
        WHERE kd_jenis_prw = ? AND kategori = 'MB'
    `;
    const [results] = await conn.execute(query, [kdJenisPrw]);
    return results.length > 0 ? results[0] : null;
}

async function getTemplatesByTindakan(conn, kdJenisPrw) {
    const query = `
        SELECT id_template, kd_jenis_prw, Pemeriksaan as nama_pemeriksaan,
               satuan, nilai_rujukan_ld, nilai_rujukan_la, nilai_rujukan_pd,
               nilai_rujukan_pa, bagian_rs, bhp, bagian_perujuk, bagian_dokter,
               bagian_laborat, kso, menejemen, biaya_item, urut
        FROM template_laboratorium
        WHERE kd_jenis_prw = ?
        ORDER BY urut, id_template
    `;
    const [results] = await conn.execute(query, [kdJenisPrw]);
    return results;
}

async function createRegistration(conn, data) {
    const query = `
        INSERT INTO permintaan_labmb
            (noorder, no_rawat, tgl_permintaan, jam_permintaan, tgl_sampel, jam_sampel,
             tgl_hasil, jam_hasil, dokter_perujuk, status, informasi_tambahan, diagnosa_klinis)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.diagnosa_klinis
    ]);
}

async function createRegistrationTindakan(conn, noorder, kdJenisPrw) {
    const query = `
        INSERT INTO permintaan_pemeriksaan_labmb (noorder, kd_jenis_prw, stts_bayar)
        VALUES (?, ?, 'Belum')
    `;
    await conn.execute(query, [noorder, kdJenisPrw]);
}

async function createRegistrationTemplate(conn, noorder, kdJenisPrw, idTemplate) {
    const query = `
        INSERT INTO permintaan_detail_permintaan_labmb (noorder, kd_jenis_prw, id_template, stts_bayar)
        VALUES (?, ?, ?, 'Belum')
    `;
    await conn.execute(query, [noorder, kdJenisPrw, idTemplate]);
}

async function getMbRequestInfo(conn, noorder) {
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
            pl.diagnosa_klinis
        FROM permintaan_labmb pl
        WHERE pl.noorder = ?
    `;
    const [results] = await conn.execute(query, [noorder]);
    return results.length > 0 ? results[0] : null;
}

async function getRequestedTindakan(conn, noorder) {
    const query = `
        SELECT pp.kd_jenis_prw, jpl.nm_perawatan
        FROM permintaan_pemeriksaan_labmb pp
        LEFT JOIN jns_perawatan_lab jpl ON jpl.kd_jenis_prw = pp.kd_jenis_prw
        WHERE pp.noorder = ?
        ORDER BY pp.kd_jenis_prw
    `;
    const [results] = await conn.execute(query, [noorder]);
    return results;
}

async function upsertPeriksaLab(conn, data) {
    const query = `
        INSERT INTO periksa_lab
            (no_rawat, nip, kd_jenis_prw, tgl_periksa, jam, dokter_perujuk, bagian_rs, bhp,
             tarif_perujuk, tarif_tindakan_dokter, tarif_tindakan_petugas, kso, menejemen,
             biaya, kd_dokter, status, kategori)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MB')
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

async function upsertDetailPeriksaLab(conn, data) {
    const query = `
        INSERT INTO detail_periksa_lab
            (no_rawat, kd_jenis_prw, tgl_periksa, jam, id_template, nilai, nilai_rujukan, keterangan,
             bagian_rs, bhp, bagian_perujuk, bagian_dokter, bagian_laborat, kso, menejemen, biaya_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            nilai = VALUES(nilai),
            nilai_rujukan = VALUES(nilai_rujukan),
            keterangan = VALUES(keterangan),
            bagian_rs = VALUES(bagian_rs),
            bhp = VALUES(bhp),
            bagian_perujuk = VALUES(bagian_perujuk),
            bagian_dokter = VALUES(bagian_dokter),
            bagian_laborat = VALUES(bagian_laborat),
            kso = VALUES(kso),
            menejemen = VALUES(menejemen),
            biaya_item = VALUES(biaya_item)
    `;

    await conn.execute(query, [
        data.no_rawat,
        data.kd_jenis_prw,
        data.tgl_periksa,
        data.jam,
        data.id_template,
        data.nilai,
        data.nilai_rujukan,
        data.keterangan,
        data.bagian_rs,
        data.bhp,
        data.bagian_perujuk,
        data.bagian_dokter,
        data.bagian_laborat,
        data.kso,
        data.menejemen,
        data.biaya_item
    ]);
}

async function updateMbRequestResultTime(conn, noorder, tglHasil, jamHasil) {
    const query = `
        UPDATE permintaan_labmb
        SET tgl_hasil = ?, jam_hasil = ?
        WHERE noorder = ?
    `;
    await conn.execute(query, [tglHasil, jamHasil, noorder]);
}

module.exports = {
    findLatestRegistrationByMedicalRecord,
    validateDoctor,
    getMbTindakan,
    getTemplatesByTindakan,
    createRegistration,
    createRegistrationTindakan,
    createRegistrationTemplate,
    getMbRequestInfo,
    getRequestedTindakan,
    upsertPeriksaLab,
    upsertDetailPeriksaLab,
    updateMbRequestResultTime
};
