/**
 * Patient PA Repository
 * Database operations for patient registration (PA)
 */

async function searchPatientByNoorder(conn, noorder, limit) {
    let whereClause = '';
    const queryParams = [];

    if (noorder && noorder.trim() !== '') {
        whereClause = 'WHERE pl.noorder LIKE ?';
        queryParams.push(`%${noorder}%`);
    }

    queryParams.push(limit);

    const query = `
        SELECT
            pl.noorder,
            pl.no_rawat,
            pl.tgl_permintaan,
            pl.jam_permintaan,
            CONCAT(pl.tgl_permintaan, ' ', pl.jam_permintaan) as waktu_registrasi_formatted,
            pl.dokter_perujuk,
            pl.status,
            pl.informasi_tambahan,
            pl.diagnosa_klinis,
            pl.pengambilan_bahan,
            pl.diperoleh_dengan,
            pl.lokasi_jaringan,
            pl.diawetkan_dengan,
            pl.pernah_dilakukan_di,
            pl.tanggal_pa_sebelumnya,
            pl.nomor_pa_sebelumnya,
            pl.diagnosa_pa_sebelumnya,
            p.nm_pasien,
            p.no_rkm_medis,
            p.jk,
            p.tgl_lahir,
            p.alamat,
            p.no_tlp,
            p.no_ktp,
            p.kabupatenpj,
            p.kecamatanpj,
            p.propinsipj,
            rp.kd_poli,
            rp.kd_dokter,
            d.nm_dokter,
            d_perujuk.nm_dokter as nm_dokter_perujuk,
            pol.nm_poli,
            rp.kd_pj,
            penjab.png_jawab,
            ki.tgl_masuk as tgl_masuk_ranap,
            ki.jam_masuk as jam_masuk_ranap,
            k.kd_bangsal,
            b.nm_bangsal
        FROM permintaan_labpa pl
        LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
        LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
        LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
        LEFT JOIN dokter d_perujuk ON pl.dokter_perujuk = d_perujuk.kd_dokter
        LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
        LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
        LEFT JOIN kamar_inap ki ON pl.no_rawat = ki.no_rawat
        LEFT JOIN kamar k ON ki.kd_kamar = k.kd_kamar
        LEFT JOIN bangsal b ON k.kd_bangsal = b.kd_bangsal
        ${whereClause}
        ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC
        LIMIT ?
    `;

    const [results] = await conn.execute(query, queryParams);
    return results;
}

async function getDiagnosa(conn, no_rawat) {
    const query = `
        SELECT dp.kd_penyakit, pen.nm_penyakit
        FROM diagnosa_pasien dp
        LEFT JOIN penyakit pen ON dp.kd_penyakit = pen.kd_penyakit
        WHERE dp.no_rawat = ?
        ORDER BY dp.kd_penyakit
    `;
    const [results] = await conn.execute(query, [no_rawat]);
    return results;
}

async function getTindakan(conn, noorder) {
    const query = `
        SELECT ppl.kd_jenis_prw as kode_tindakan, jpl.nm_perawatan as nama_tindakan
        FROM permintaan_pemeriksaan_labpa ppl
        LEFT JOIN jns_perawatan_lab jpl ON ppl.kd_jenis_prw = jpl.kd_jenis_prw
        WHERE ppl.noorder = ?
        ORDER BY ppl.kd_jenis_prw
        LIMIT 1
    `;
    const [results] = await conn.execute(query, [noorder]);
    return results;
}

module.exports = {
    searchPatientByNoorder,
    getDiagnosa,
    getTindakan
};
