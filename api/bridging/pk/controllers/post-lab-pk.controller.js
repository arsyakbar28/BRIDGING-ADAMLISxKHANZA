/**
 * POST Lab PK Controller
 * Handle HTTP requests for posting lab results (PK)
 */

const postLabService = require('../services/post-lab-pk.service');
const responseHelper = require('../../shared/helpers/response.helper');
const { logPostError } = require('../../../../utils/logger');

/**
 * POST lab results
 * POST /adam-lis/bridging/pk
 */
async function postLabResults(req, res) {
    try {
        const labData = req.body;
        const noorder = labData.noorder || labData.no_registrasi;
        if (noorder && !labData.noorder) labData.noorder = noorder;
        if (!labData.dokter_pj && labData.dokter_pengirim?.kode) labData.dokter_pj = labData.dokter_pengirim.kode;
        if (!labData.dokter_perujuk && labData.dokter_pengirim?.kode) labData.dokter_perujuk = labData.dokter_pengirim.kode;
        if (!labData.petugas && labData.kode_pegawai) labData.petugas = labData.kode_pegawai;
        if (!labData.tgl_periksa && labData.waktu_selesai) {
            const s = String(labData.waktu_selesai).trim();
            if (s.length >= 10) {
                labData.tgl_periksa = s.slice(0, 10);
                labData.jam_periksa = s.length >= 19 ? s.slice(11, 19) : (labData.jam_periksa || '00:00:00');
            }
        }

        // Validate input (basic check)
        if (!noorder || !labData.pemeriksaan || !Array.isArray(labData.pemeriksaan) || labData.pemeriksaan.length === 0 ||
            !labData.dokter_pj || !labData.petugas || !labData.dokter_perujuk ||
            !labData.tgl_periksa || !labData.jam_periksa) {
            
            // Log validation error
            logPostError({
                error: new Error("Required fields missing: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"),
                noorder: labData?.noorder || 'UNKNOWN',
                requestBody: labData,
                endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
                method: req.method
            });
            
            return responseHelper.badRequest(
                res, 
                "Required fields: noorder, pemeriksaan (array), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"
            );
        }

        // Validate format pemeriksaan
        for (const pemeriksaan of labData.pemeriksaan) {
            if (!pemeriksaan.kode_pemeriksaan || !pemeriksaan.hasil) {
                // Log validation error
                logPostError({
                    error: new Error("Each pemeriksaan must have kode_pemeriksaan and hasil"),
                    noorder,
                    requestBody: labData,
                    endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
                    method: req.method
                });
                
                return responseHelper.badRequest(
                    res, 
                    "Each pemeriksaan must have kode_pemeriksaan and hasil"
                );
            }
        }

        console.log(`🔬 [PK] Posting lab results for noorder: ${noorder}`);
        console.log(`📊 [PK] Pemeriksaan count: ${labData.pemeriksaan.length}`);

        // Call service
        const result = await postLabService.postLabResults(noorder, labData);

        // Return response
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);

    } catch (error) {
        console.error('❌ [PK] Controller Error:', error);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder: req.body?.noorder || 'UNKNOWN',
            requestBody: req.body,
            endpoint: req.originalUrl || req.path || '/adam-lis/bridging/',
            method: req.method,
            user: req.user || null // If user info is available from auth middleware
        });
        
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    postLabResults
};

