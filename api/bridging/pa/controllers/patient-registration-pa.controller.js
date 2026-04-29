/**
 * Patient Registration PA Controller
 * Handle HTTP requests for anatomical pathology registration lookup.
 */

const labRegistrationService = require('../../shared/services/lab-registration.service');
const responseHelper = require('../../shared/helpers/response.helper');
const paBridgingService = require('../services/pa-bridging.service');

async function searchPatientRegistration(req, res) {
    try {
        const { noorder, limit } = req.params;
        const limitNum = Number(limit);

        if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 10) {
            return responseHelper.badRequest(res, 'Limit must be a number between 1 and 10');
        }

        console.log(`🔍 [PA] Searching for registration: ${noorder} (limit: ${limitNum})`);

        const result = await labRegistrationService.searchLabRegistration('pa', noorder, limitNum);
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);
    } catch (error) {
        console.error('❌ [PA] Controller Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

async function createRegistration(req, res) {
    try {
        const result = await paBridgingService.createRegistrationFromSpec(req.body || {});
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('❌ [PA] Create Registration Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

async function getRegistrationByNoRegRs(req, res) {
    try {
        const result = await paBridgingService.getRegistrationByNoRegRs(req.params.no_reg_rs);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('❌ [PA] Get Registration Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

async function postArchive(req, res) {
    try {
        const result = await paBridgingService.saveArchiveFromSpec(req.body || {}, 'create');
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('❌ [PA] Post Archive Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

async function updateArchive(req, res) {
    try {
        const result = await paBridgingService.saveArchiveFromSpec(req.body || {}, 'update');
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        console.error('❌ [PA] Update Archive Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    searchPatientRegistration,
    createRegistration,
    getRegistrationByNoRegRs,
    postArchive,
    updateArchive
};
