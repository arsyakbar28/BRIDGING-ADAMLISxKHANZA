/**
 * Shared Lab Registration Repository
 * Database operations for lab order registration across lab types.
 */

const LAB_CONFIGS = {
    mb: {
        requestTable: 'permintaan_labmb',
        examinationTable: 'permintaan_pemeriksaan_labmb',
        detailTemplateTable: 'permintaan_detail_permintaan_labmb'
    },
    pa: {
        requestTable: 'permintaan_labpa',
        examinationTable: 'permintaan_pemeriksaan_labpa',
        detailTemplateTable: null,
        extraSelect: `
                pl.pengambilan_bahan,
                pl.diperoleh_dengan,
                pl.lokasi_jaringan,
                pl.diawetkan_dengan,
                pl.pernah_dilakukan_di,
                pl.tanggal_pa_sebelumnya,
                pl.nomor_pa_sebelumnya,
                pl.diagnosa_pa_sebelumnya,`
    }
};

function getLabConfig(labType) {
    const config = LAB_CONFIGS[String(labType).toLowerCase()];
    if (!config) {
        throw new Error(`Unsupported lab type: ${labType}`);
    }
    return config;
}

async function searchRegistration(conn, labType, noorder, limit) {
    const config = getLabConfig(labType);
    const extraSelect = config.extraSelect || '';
    let whereClause = '';
    let queryParams = [];

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
            pl.tgl_sampel,
            pl.jam_sampel,
            pl.tgl_hasil,
            pl.jam_hasil,
            pl.dokter_perujuk,
            pl.status,
            pl.informasi_tambahan,
            pl.diagnosa_klinis,
            ${extraSelect}
            p.nm_pasien,
            p.no_rkm_medis,
            p.jk,
            p.tmp_lahir,
            p.tgl_lahir,
            p.alamat,
            p.no_tlp,
            p.no_ktp,
            p.kd_prop,
            p.kd_kab,
            p.kd_kec,
            p.kabupatenpj,
            p.kecamatanpj,
            p.propinsipj,
            rp.tgl_registrasi,
            rp.kd_poli,
            rp.kd_dokter,
            rp.status_lanjut,
            d.nm_dokter,
            d_perujuk.nm_dokter as nm_dokter_perujuk,
            pol.nm_poli,
            rp.kd_pj,
            penjab.png_jawab,
            ki.kd_kamar,
            ki.tgl_masuk as tgl_masuk_ranap,
            ki.jam_masuk as jam_masuk_ranap,
            k.kd_bangsal,
            b.nm_bangsal
        FROM ${config.requestTable} pl
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

async function getSelectedPemeriksaan(conn, labType, noorder) {
    const config = getLabConfig(labType);

    if (config.detailTemplateTable) {
        const query = `
            SELECT DISTINCT
                tl.id_template as kode_pemeriksaan,
                tl.Pemeriksaan as nama_pemeriksaan,
                pdpl.kd_jenis_prw,
                jpl.nm_perawatan
            FROM ${config.detailTemplateTable} pdpl
            INNER JOIN template_laboratorium tl ON pdpl.id_template = tl.id_template
            LEFT JOIN jns_perawatan_lab jpl ON pdpl.kd_jenis_prw = jpl.kd_jenis_prw
            WHERE pdpl.noorder = ?
            ORDER BY tl.urut, tl.id_template
        `;
        const [templateResults] = await conn.execute(query, [noorder]);
        if (templateResults.length > 0) return templateResults;
    }

    const query = `
        SELECT DISTINCT
            pp.kd_jenis_prw as kode_pemeriksaan,
            jpl.nm_perawatan as nama_pemeriksaan,
            pp.kd_jenis_prw,
            jpl.nm_perawatan
        FROM ${config.examinationTable} pp
        LEFT JOIN jns_perawatan_lab jpl ON pp.kd_jenis_prw = jpl.kd_jenis_prw
        WHERE pp.noorder = ?
        ORDER BY pp.kd_jenis_prw
    `;

    const [results] = await conn.execute(query, [noorder]);
    return results;
}

async function getDiagnosa(conn, no_rawat) {
    const query = `
        SELECT
            dp.kd_penyakit,
            pen.nm_penyakit
        FROM diagnosa_pasien dp
        LEFT JOIN penyakit pen ON dp.kd_penyakit = pen.kd_penyakit
        WHERE dp.no_rawat = ?
        ORDER BY dp.kd_penyakit
    `;

    const [results] = await conn.execute(query, [no_rawat]);
    return results;
}

module.exports = {
    searchRegistration,
    getSelectedPemeriksaan,
    getDiagnosa
};
