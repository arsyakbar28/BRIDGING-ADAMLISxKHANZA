/**
 * POST Lab PA Controller
 * Handle HTTP requests for posting lab results (PA - Patologi Anatomi)
 */

const postLabService = require('../services/post-lab-pa.service');
const responseHelper = require('../../shared/helpers/response.helper');
const { logPostError } = require('../../../../utils/logger');

/**
 * POST lab results
 * POST /adam-lis/bridging/pa
 */
async function postLabResults(req, res) {
    try {
        const labData = req.body;
        const { noorder } = labData;

        // Validate input (basic check)
        // PA format: noorder, kd_jenis_prw, hasil_pa, dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa
        if (!noorder || !labData.kd_jenis_prw || !labData.hasil_pa || typeof labData.hasil_pa !== 'object' ||
            !labData.dokter_pj || !labData.petugas || !labData.dokter_perujuk || 
            !labData.tgl_periksa || !labData.jam_periksa) {
            
            // Log validation error
            logPostError({
                error: new Error("Required fields missing: noorder, kd_jenis_prw, hasil_pa (object), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"),
                noorder: labData?.noorder || 'UNKNOWN',
                requestBody: labData,
                endpoint: req.originalUrl || req.path || '/adam-lis/bridging/pa',
                method: req.method
            });
            
            return responseHelper.badRequest(
                res, 
                "Required fields: noorder, kd_jenis_prw, hasil_pa (object), dokter_pj, petugas, dokter_perujuk, tgl_periksa, jam_periksa"
            );
        }

        console.log(`🔬 [PA] Posting lab results for noorder: ${noorder}`);
        console.log(`📊 [PA] Kd Jenis Prw: ${labData.kd_jenis_prw}`);

        // Call service
        const result = await postLabService.postLabResults(noorder, labData);

        // Return response
        const statusCode = result.success ? 200 : 400;
        return res.status(statusCode).json(result);

    } catch (error) {
        console.error('❌ [PA] Controller Error:', error);
        
        // Log POST error with detailed information
        logPostError({
            error,
            noorder: req.body?.noorder || 'UNKNOWN',
            requestBody: req.body,
            endpoint: req.originalUrl || req.path || '/adam-lis/bridging/pa',
            method: req.method,
            user: req.user || null
        });
        
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    postLabResults
};
