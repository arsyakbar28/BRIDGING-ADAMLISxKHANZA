/**
 * Patient Registration PA Controller
 * Handle HTTP requests for patient registration (PA)
 */

const patientService = require('../services/patient-registration-pa.service');
const responseHelper = require('../../shared/helpers/response.helper');

async function searchPatientRegistration(req, res) {
    try {
        const { noorder, limit } = req.params;
        const limitNum = parseInt(limit);

        if (limitNum < 1 || limitNum > 10) {
            return responseHelper.badRequest(res, 'Limit must be between 1 and 10');
        }

        console.log(`🔍 [PA] Searching for registration: ${noorder} (limit: ${limitNum})`);

        const result = await patientService.searchPatientRegistration(noorder, limitNum);
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);
    } catch (error) {
        console.error('❌ [PA] Controller Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    searchPatientRegistration
};
