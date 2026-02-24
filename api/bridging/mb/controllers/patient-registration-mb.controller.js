/**
 * Patient Registration MB Controller
 * Handle HTTP requests for patient registration (MB - Mikrobiologi)
 */

const patientService = require('../services/patient-registration-mb.service');
const responseHelper = require('../../shared/helpers/response.helper');

/**
 * Search patient registration by noorder
 * GET /adam-lis/bridging/mb/:limit/:noorder
 */
async function searchPatientRegistration(req, res) {
    try {
        const { noorder, limit } = req.params;
        const limitNum = parseInt(limit);

        // Validate limit
        if (limitNum < 1 || limitNum > 10) {
            return responseHelper.badRequest(res, "Limit must be between 1 and 10");
        }

        console.log(`🔍 [MB] Searching for registration: ${noorder} (limit: ${limitNum})`);

        // Call service
        const result = await patientService.searchPatientRegistration(noorder, limitNum);

        // Return response
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);

    } catch (error) {
        console.error('❌ [MB] Controller Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    searchPatientRegistration
};
