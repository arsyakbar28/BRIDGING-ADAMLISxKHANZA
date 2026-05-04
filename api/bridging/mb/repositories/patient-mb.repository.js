/**
 * Patient MB Repository
 * Database operations for patient registration (MB)
 */

const { getDbConnection, closeDbConnection} = require('../../../../config/database');

/**
 * Search patient registration by noorder
 * @param {Object} conn - Database connection
 * @param {string} noorder - Order number
 * @param {number} limit - Result limit
 * @returns {Promise<Array>} Patient registration results
 */
async function searchPatientByNoorder(conn, noorder, limit) {
    let query, queryParams;
    
    if (noorder && noorder.trim() !== '') {
        query = `
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
            FROM permintaan_labmb pl
            LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
            LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
            LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
            LEFT JOIN dokter d_perujuk ON pl.dokter_perujuk = d_perujuk.kd_dokter
            LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
            LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
            LEFT JOIN kamar_inap ki ON pl.no_rawat = ki.no_rawat
            LEFT JOIN kamar k ON ki.kd_kamar = k.kd_kamar
            LEFT JOIN bangsal b ON k.kd_bangsal = b.kd_bangsal
            WHERE pl.noorder LIKE ?
            ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC
            LIMIT ?
        `;
        queryParams = [`%${noorder}%`, limit];
    } else {
        query = `
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
            FROM permintaan_labmb pl
            LEFT JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
            LEFT JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
            LEFT JOIN dokter d ON rp.kd_dokter = d.kd_dokter
            LEFT JOIN dokter d_perujuk ON pl.dokter_perujuk = d_perujuk.kd_dokter
            LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
            LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
            LEFT JOIN kamar_inap ki ON pl.no_rawat = ki.no_rawat
            LEFT JOIN kamar k ON ki.kd_kamar = k.kd_kamar
            LEFT JOIN bangsal b ON k.kd_bangsal = b.kd_bangsal
            ORDER BY pl.tgl_permintaan DESC, pl.jam_permintaan DESC
            LIMIT ?
        `;
        queryParams = [limit];
    }

    const [results] = await conn.execute(query, queryParams);
    return results;
}

/**
 * Get requested tindakan for noorder
 * @param {Object} conn - Database connection
 * @param {string} noorder - Order number
 * @returns {Promise<Array>} Tindakan list
 */
async function getRequestedTindakan(conn, noorder) {
    const query = `
        SELECT DISTINCT 
            pdpl.kd_jenis_prw,
            jpl.nm_perawatan
        FROM permintaan_detail_permintaan_labmb pdpl
        LEFT JOIN jns_perawatan_lab jpl ON pdpl.kd_jenis_prw = jpl.kd_jenis_prw
        WHERE pdpl.noorder = ?
        ORDER BY pdpl.kd_jenis_prw
    `;
    
    const [results] = await conn.execute(query, [noorder]);
    return results;
}

/**
 * Get all pemeriksaan for tindakan
 * @param {Object} conn - Database connection
 * @param {string} kd_jenis_prw - Jenis perawatan code
 * @returns {Promise<Array>} Pemeriksaan list
 */
async function getPemeriksaanByTindakan(conn, kd_jenis_prw) {
    const query = `
        SELECT 
            tl.id_template as kode_pemeriksaan,
            tl.Pemeriksaan as nama_pemeriksaan
        FROM template_laboratorium tl
        WHERE tl.kd_jenis_prw = ?
        ORDER BY tl.urut, tl.id_template
    `;
    
    const [results] = await conn.execute(query, [kd_jenis_prw]);
    return results;
}

/**
 * Get selected pemeriksaan (template) for noorder
 * Only returns template_laboratorium that are actually selected/requested
 * @param {Object} conn - Database connection
 * @param {string} noorder - Order number
 * @returns {Promise<Array>} Selected pemeriksaan list
 */
async function getSelectedPemeriksaan(conn, noorder) {
    const query = `
        SELECT DISTINCT
            tl.id_template as kode_pemeriksaan,
            tl.Pemeriksaan as nama_pemeriksaan
        FROM permintaan_detail_permintaan_labmb pdpl
        INNER JOIN template_laboratorium tl ON pdpl.id_template = tl.id_template
        WHERE pdpl.noorder = ?
        ORDER BY tl.urut, tl.id_template
    `;
    
    const [results] = await conn.execute(query, [noorder]);
    return results;
}

/**
 * Get diagnosa for patient
 * @param {Object} conn - Database connection
 * @param {string} no_rawat - No rawat
 * @returns {Promise<Array>} Diagnosa list
 */
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
    searchPatientByNoorder,
    getRequestedTindakan,
    getPemeriksaanByTindakan,
    getSelectedPemeriksaan,
    getDiagnosa
};

