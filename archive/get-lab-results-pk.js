/**
 * Lab Results PK API
 * Endpoint: GET /api/adam-lis/bridging/lab-results-pk/:no_rawat/:tgl_periksa/:jam
 * Based on listhasillabpk.php reference
 */

const { getDbConnection, closeDbConnection } = require('../config/database');

/**
 * Get lab results for Patologi Klinis (PK) by noorder
 * @param {string} noorder - Lab order number (partial or complete)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Object>} API response
 */
async function getLabResultsPKByNoorder(noorder, limit = 10) {
    const conn = await getDbConnection();
    
    try {
        // Query untuk mengambil data periksa lab PK berdasarkan noorder (mendukung partial search)
        const queryPeriksaLab = `
            SELECT 
                pl.no_rawat,
                pl.tgl_periksa,
                pl.jam,
                pl.kategori,
                pm.noorder
            FROM periksa_lab pl
            INNER JOIN permintaan_lab pm ON pl.no_rawat = pm.no_rawat
            WHERE pl.kategori = 'PK' 
                AND pm.noorder LIKE ?
            GROUP BY CONCAT(pl.no_rawat, pl.tgl_periksa, pl.jam)
            ORDER BY pl.tgl_periksa DESC, pl.jam DESC
            LIMIT ?
        `;

        const [periksaResults] = await conn.execute(queryPeriksaLab, [`%${noorder}%`, limit]);

        if (periksaResults.length === 0) {
            return {
                success: false,
                message: `No lab examination results found for noorder containing: ${noorder}`,
                payload: []
            };
        }

        // Ambil data untuk setiap periksa lab
        const allResults = [];
        
        for (const periksa of periksaResults) {
            // Query untuk mengambil detail periksa lab
            const queryDetailPeriksa = `
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

            const [detailResults] = await conn.execute(queryDetailPeriksa, [
                periksa.no_rawat, 
                periksa.tgl_periksa, 
                periksa.jam
            ]);

            // Process each examination type
            for (let i = 0; i < detailResults.length; i++) {
                const detail = detailResults[i];
                
                // Query untuk mengambil detail pemeriksaan lab
                const queryDetailPemeriksaan = `
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

                const [pemeriksaanResults] = await conn.execute(queryDetailPemeriksaan, [
                    periksa.no_rawat, 
                    detail.kd_jenis_prw, 
                    periksa.tgl_periksa, 
                    periksa.jam
                ]);

                // Format pemeriksaan results
                const pemeriksaanData = pemeriksaanResults.map(pemeriksaan => ({
                    nama_pemeriksaan: pemeriksaan.Pemeriksaan,
                    hasil: pemeriksaan.nilai,
                    satuan: pemeriksaan.satuan,
                    nilai_rujukan: pemeriksaan.nilai_rujukan,
                    keterangan: pemeriksaan.keterangan,
                    status: getStatusFromKeterangan(pemeriksaan.keterangan)
                }));

                // Add examination data to results
                allResults.push({
                    no_urut: allResults.length + 1,
                    kode_jenis_perawatan: detail.kd_jenis_prw,
                    nama_perawatan: detail.nm_perawatan,
                    dokter_pj: detail.nm_dokter,
                    petugas: detail.nama_petugas,
                    dokter_perujuk: detail.dokter_perujuk,
                    tgl_periksa: periksa.tgl_periksa,
                    jam_periksa: periksa.jam,
                    no_rawat: periksa.no_rawat,
                    detail_pemeriksaan: pemeriksaanData
                });
            }
        }

        // Query untuk mengambil saran dan kesan (ambil yang terbaru)
        const latestPeriksa = periksaResults[0];
        const querySaranKesan = `
            SELECT 
                saran,
                kesan
            FROM saran_kesan_lab
            WHERE no_rawat = ? 
                AND tgl_periksa = ? 
                AND jam = ?
        `;

        const [saranKesanResults] = await conn.execute(querySaranKesan, [
            latestPeriksa.no_rawat, 
            latestPeriksa.tgl_periksa, 
            latestPeriksa.jam
        ]);

        // Query untuk mengambil biaya periksa
        const queryBiayaPeriksa = `
            SELECT 
                SUM(jpl.total_byr) as total_biaya
            FROM periksa_lab pl
            INNER JOIN jns_perawatan_lab jpl ON pl.kd_jenis_prw = jpl.kd_jenis_prw
            WHERE pl.kategori = 'PK' 
                AND pl.no_rawat = ?
                AND pl.tgl_periksa = ?
                AND pl.jam = ?
        `;

        const [biayaResults] = await conn.execute(queryBiayaPeriksa, [
            latestPeriksa.no_rawat, 
            latestPeriksa.tgl_periksa, 
            latestPeriksa.jam
        ]);

        const response = {
            success: true,
            message: `Found ${allResults.length} lab examination results for noorder containing: ${noorder}`,
            payload: allResults
        };

        // Add biaya periksa
        if (biayaResults.length > 0 && biayaResults[0].total_biaya) {
            response.biaya_periksa = {
                total: biayaResults[0].total_biaya,
                mata_uang: "IDR"
            };
        }

        // Add saran dan kesan
        if (saranKesanResults.length > 0) {
            response.saran_kesan = {
                kesan: saranKesanResults[0].kesan || "",
                saran: saranKesanResults[0].saran || ""
            };
        }

        return response;

    } catch (error) {
        return {
            success: false,
            message: `Database error: ${error.message}`,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

/**
 * Get lab results for Patologi Klinis (PK) by no_rawat, tgl_periksa, and jam
 * @param {string} no_rawat - Patient registration number
 * @param {string} tgl_periksa - Examination date (YYYY-MM-DD)
 * @param {string} jam - Examination time (HH:MM:SS)
 * @returns {Promise<Object>} API response
 */
async function getLabResultsPK(no_rawat, tgl_periksa, jam) {
    const conn = await getDbConnection();
    
    try {
        // Query untuk mengambil data periksa lab PK berdasarkan parameter
        const queryPeriksaLab = `
            SELECT 
                pl.tgl_periksa,
                pl.jam
            FROM periksa_lab pl
            WHERE pl.kategori = 'PK' 
                AND pl.no_rawat = ? 
                AND pl.tgl_periksa = ? 
                AND pl.jam = ?
            GROUP BY CONCAT(pl.no_rawat, pl.tgl_periksa, pl.jam)
            ORDER BY pl.tgl_periksa, pl.jam
        `;

        const [periksaResults] = await conn.execute(queryPeriksaLab, [no_rawat, tgl_periksa, jam]);

        if (periksaResults.length === 0) {
            return {
                success: false,
                message: "No lab examination results found for the given parameters",
                payload: []
            };
        }

        // Query untuk mengambil detail periksa lab
        const queryDetailPeriksa = `
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

        const [detailResults] = await conn.execute(queryDetailPeriksa, [no_rawat, tgl_periksa, jam]);

        const response = {
            success: true,
            message: `Lab examination results retrieved successfully for no_rawat: ${no_rawat}`,
            payload: []
        };

        // Process each examination type
        for (let i = 0; i < detailResults.length; i++) {
            const detail = detailResults[i];
            
            // Query untuk mengambil detail pemeriksaan lab
            const queryDetailPemeriksaan = `
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

            const [pemeriksaanResults] = await conn.execute(queryDetailPemeriksaan, [
                no_rawat, 
                detail.kd_jenis_prw, 
                tgl_periksa, 
                jam
            ]);

            // Format pemeriksaan results
            const pemeriksaanData = pemeriksaanResults.map(pemeriksaan => ({
                nama_pemeriksaan: pemeriksaan.Pemeriksaan,
                hasil: pemeriksaan.nilai,
                satuan: pemeriksaan.satuan,
                nilai_rujukan: pemeriksaan.nilai_rujukan,
                keterangan: pemeriksaan.keterangan,
                status: getStatusFromKeterangan(pemeriksaan.keterangan)
            }));

            // Add examination data to response
            response.payload.push({
                no_urut: i + 1,
                kode_jenis_perawatan: detail.kd_jenis_prw,
                nama_perawatan: detail.nm_perawatan,
                dokter_pj: detail.nm_dokter,
                petugas: detail.nama_petugas,
                dokter_perujuk: detail.dokter_perujuk,
                detail_pemeriksaan: pemeriksaanData
            });
        }

        // Query untuk mengambil saran dan kesan
        const querySaranKesan = `
            SELECT 
                saran,
                kesan
            FROM saran_kesan_lab
            WHERE no_rawat = ? 
                AND tgl_periksa = ? 
                AND jam = ?
        `;

        const [saranKesanResults] = await conn.execute(querySaranKesan, [no_rawat, tgl_periksa, jam]);

        // Query untuk mengambil biaya periksa
        const queryBiayaPeriksa = `
            SELECT 
                SUM(jpl.total_byr) as total_biaya
            FROM periksa_lab pl
            INNER JOIN jns_perawatan_lab jpl ON pl.kd_jenis_prw = jpl.kd_jenis_prw
            WHERE pl.kategori = 'PK' 
                AND pl.no_rawat = ?
                AND pl.tgl_periksa = ?
                AND pl.jam = ?
        `;

        const [biayaResults] = await conn.execute(queryBiayaPeriksa, [no_rawat, tgl_periksa, jam]);

        // Add biaya periksa
        if (biayaResults.length > 0 && biayaResults[0].total_biaya) {
            response.biaya_periksa = {
                total: biayaResults[0].total_biaya,
                mata_uang: "IDR"
            };
        }

        if (saranKesanResults.length > 0) {
            response.saran_kesan = {
                kesan: saranKesanResults[0].kesan || "",
                saran: saranKesanResults[0].saran || ""
            };
        }

        return response;

    } catch (error) {
        return {
            success: false,
            message: `Database error: ${error.message}`,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

/**
 * Get status from keterangan field
 * @param {string} keterangan - Keterangan field (L, H, T, or empty)
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
        default:
            return 'Normal';
    }
}

/**
 * Get all lab results PK with date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object>} API response
 */
async function getAllLabResultsPK(startDate, endDate, limit = 50) {
    const conn = await getDbConnection();
    
    try {
        // Query untuk mengambil semua data periksa lab PK dalam rentang tanggal
        const query = `
            SELECT DISTINCT
                pl.no_rawat,
                pl.tgl_periksa,
                pl.jam,
                p.nm_pasien,
                p.no_rkm_medis,
                d.nm_dokter,
                pt.nama as nama_petugas,
                jpl.nm_perawatan,
                jpl.total_byr,
                penjab.png_jawab,
                rp.kd_poli,
                pol.nm_poli
            FROM periksa_lab pl
            INNER JOIN reg_periksa rp ON pl.no_rawat = rp.no_rawat
            INNER JOIN pasien p ON rp.no_rkm_medis = p.no_rkm_medis
            INNER JOIN dokter d ON pl.kd_dokter = d.kd_dokter
            INNER JOIN petugas pt ON pl.nip = pt.nip
            INNER JOIN jns_perawatan_lab jpl ON pl.kd_jenis_prw = jpl.kd_jenis_prw
            LEFT JOIN poliklinik pol ON rp.kd_poli = pol.kd_poli
            LEFT JOIN penjab ON rp.kd_pj = penjab.kd_pj
            WHERE pl.kategori = 'PK'
                AND pl.tgl_periksa BETWEEN ? AND ?
            ORDER BY pl.tgl_periksa DESC, pl.jam DESC
            LIMIT ?
        `;

        const [results] = await conn.execute(query, [startDate, endDate, limit]);

        if (results.length === 0) {
            return {
                success: false,
                message: `No lab examination results found for date range: ${startDate} to ${endDate}`,
                payload: []
            };
        }

        const response = {
            success: true,
            message: `Found ${results.length} lab examination records for date range: ${startDate} to ${endDate}`,
            payload: results.map(result => ({
                no_rawat: result.no_rawat,
                tgl_periksa: result.tgl_periksa,
                jam_periksa: result.jam,
                pasien: {
                    no_rm: result.no_rkm_medis,
                    nama: result.nm_pasien
                },
                dokter_perujuk: result.nm_dokter,
                penanggung_jawab: result.nama_petugas,
                cara_bayar: result.png_jawab,
                unit: result.nm_poli,
                pemeriksaan: result.nm_perawatan,
                biaya_periksa: {
                    total: result.total_byr || 0,
                    mata_uang: "IDR"
                }
            }))
        };

        return response;

    } catch (error) {
        return {
            success: false,
            message: `Database error: ${error.message}`,
            payload: []
        };
    } finally {
        await closeDbConnection(conn);
    }
}

module.exports = {
    getLabResultsPK,
    getLabResultsPKByNoorder,
    getAllLabResultsPK
};
