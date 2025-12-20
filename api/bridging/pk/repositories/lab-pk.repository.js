/**
 * Lab PK Repository
 * Database operations for lab results (PK)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const statusMapper = require('../../shared/helpers/status-mapper.helper');

/**
 * Get lab results by noorder (with partial search)
 * Fixed: Match based on time to ensure correct noorder mapping for patients with multiple orders
 */
async function getLabResultsByNoorder(conn, noorder, limit) {
    const query = `
        SELECT
            pl.no_rawat,
            pl.tgl_periksa,
            pl.jam,
            pl.kategori,
            pm.noorder
        FROM periksa_lab pl
        INNER JOIN permintaan_lab pm ON pl.no_rawat = pm.no_rawat
            AND pl.tgl_periksa = pm.tgl_hasil
            AND pl.jam = pm.jam_hasil
        WHERE pl.kategori = 'PK'
            AND pm.noorder LIKE ?
        GROUP BY CONCAT(pl.no_rawat, pl.tgl_periksa, pl.jam)
        ORDER BY pl.tgl_periksa DESC, pl.jam DESC
        LIMIT ?
    `;

    const [results] = await conn.execute(query, [`%${noorder}%`, limit]);
    return results;
}

/**
 * Get detail periksa lab
 */
async function getDetailPeriksaLab(conn, no_rawat, tgl_periksa, jam) {
    const query = `
        SELECT 
            jpl.kd_jenis_prw,
            jpl.nm_perawatan,
            pt.nama as nama_petugas,
            pl.dokter_perujuk,
            d.nm_dokter
        FROM periksa_lab pl
        INNER JOIN jns_perawatan_lab jpl ON pl.kd_jenis_prw = jpl.kd_jenis_prw
        INNER JOIN petugas pt ON pl.nip = pt.nip
        INNER JOIN dokter d ON pl.kd_dokter = d.kd_dokter
        WHERE pl.kategori = 'PK' 
            AND pl.no_rawat = ?
            AND pl.tgl_periksa = ?
            AND pl.jam = ?
    `;

    const [results] = await conn.execute(query, [no_rawat, tgl_periksa, jam]);
    return results;
}

/**
 * Get detail pemeriksaan
 */
async function getDetailPemeriksaan(conn, no_rawat, kd_jenis_prw, tgl_periksa, jam) {
    const query = `
        SELECT 
            tl.Pemeriksaan,
            dpl.nilai,
            tl.satuan,
            dpl.nilai_rujukan,
            dpl.keterangan
        FROM detail_periksa_lab dpl
        INNER JOIN template_laboratorium tl ON dpl.id_template = tl.id_template
        WHERE dpl.no_rawat = ? 
            AND dpl.kd_jenis_prw = ? 
            AND dpl.tgl_periksa = ? 
            AND dpl.jam = ?
        ORDER BY dpl.kd_jenis_prw, tl.urut
    `;

    const [results] = await conn.execute(query, [no_rawat, kd_jenis_prw, tgl_periksa, jam]);
    
    // Format results
    return results.map(item => ({
        nama_pemeriksaan: item.Pemeriksaan,
        hasil: item.nilai,
        satuan: item.satuan,
        nilai_rujukan: item.nilai_rujukan,
        keterangan: item.keterangan,
        status: statusMapper.getStatusFromKeterangan(item.keterangan)
    }));
}

/**
 * Get saran dan kesan
 */
async function getSaranKesan(conn, no_rawat, tgl_periksa, jam) {
    const query = `
        SELECT saran, kesan
        FROM saran_kesan_lab
        WHERE no_rawat = ? 
            AND tgl_periksa = ? 
            AND jam = ?
    `;

    const [results] = await conn.execute(query, [no_rawat, tgl_periksa, jam]);
    return results.length > 0 ? results[0] : null;
}

/**
 * Get biaya periksa
 */
async function getBiayaPeriksa(conn, no_rawat, tgl_periksa, jam) {
    const query = `
        SELECT SUM(jpl.total_byr) as total_biaya
        FROM periksa_lab pl
        INNER JOIN jns_perawatan_lab jpl ON pl.kd_jenis_prw = jpl.kd_jenis_prw
        WHERE pl.kategori = 'PK' 
            AND pl.no_rawat = ?
            AND pl.tgl_periksa = ?
            AND pl.jam = ?
    `;

    const [results] = await conn.execute(query, [no_rawat, tgl_periksa, jam]);
    return results.length > 0 && results[0].total_biaya ? results[0].total_biaya : 0;
}

module.exports = {
    getLabResultsByNoorder,
    getDetailPeriksaLab,
    getDetailPemeriksaan,
    getSaranKesan,
    getBiayaPeriksa
};

