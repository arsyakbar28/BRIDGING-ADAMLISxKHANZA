/**
 * Lab Results PA Service
 * Business logic for lab results operations (PA - Patologi Anatomi)
 */

const { getDbConnection, closeDbConnection } = require('../../../../config/database');
const labRepository = require('../repositories/lab-pa.repository');

/**
 * Get lab results by noorder
 * @param {string} noorder - Order number
 * @param {number} limit - Result limit
 * @returns {Promise<Object>} Service response
 */
async function getLabResultsByNoorder(noorder, limit = 10) {
    const conn = await getDbConnection();
    
    try {
        // Get lab results
        const periksaResults = await labRepository.getLabResultsByNoorder(conn, noorder, limit);

        if (periksaResults.length === 0) {
            return {
                success: false,
                message: `No lab examination results found for noorder containing: ${noorder}`,
                payload: []
            };
        }

        // Process each periksa lab
        const allResults = [];
        
        for (const periksa of periksaResults) {
            const detailResults = await labRepository.getDetailPeriksaLab(
                conn, 
                periksa.no_rawat, 
                periksa.tgl_periksa, 
                periksa.jam
            );

            // Process each examination type
            for (let i = 0; i < detailResults.length; i++) {
                const detail = detailResults[i];
                
                // Get narrative PA results
                const pemeriksaanData = await labRepository.getDetailPemeriksaan(
                    conn,
                    periksa.no_rawat,
                    detail.kd_jenis_prw,
                    periksa.tgl_periksa,
                    periksa.jam
                );

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
                    hasil_pa: pemeriksaanData ? {
                        diagnosa_klinik: pemeriksaanData.diagnosa_klinik || "",
                        makroskopik: pemeriksaanData.makroskopik || "",
                        mikroskopik: pemeriksaanData.mikroskopik || "",
                        kesimpulan: pemeriksaanData.kesimpulan || "",
                        kesan: pemeriksaanData.kesan || ""
                    } : null
                });
            }
        }

        // Get saran kesan (from latest result)
        const latestPeriksa = periksaResults[0];
        const saranKesan = await labRepository.getSaranKesan(
            conn,
            latestPeriksa.no_rawat,
            latestPeriksa.tgl_periksa,
            latestPeriksa.jam
        );

        // Get biaya periksa
        const totalBiaya = await labRepository.getBiayaPeriksa(
            conn,
            latestPeriksa.no_rawat,
            latestPeriksa.tgl_periksa,
            latestPeriksa.jam
        );

        // Build response
        const response = {
            success: true,
            message: `Found ${allResults.length} lab examination results for noorder containing: ${noorder}`,
            payload: allResults
        };

        if (totalBiaya > 0) {
            response.biaya_periksa = {
                total: totalBiaya,
                mata_uang: "IDR"
            };
        }

        if (saranKesan) {
            response.saran_kesan = {
                kesan: saranKesan.kesan || "",
                saran: saranKesan.saran || ""
            };
        }

        return response;

    } catch (error) {
        console.error('❌ Service Error:', error);
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
    getLabResultsByNoorder
};
