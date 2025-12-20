/**
 * Lab Results PK Controller
 * Handle HTTP requests for lab results (PK)
 */

const labResultsService = require('../services/lab-results-pk.service');
const responseHelper = require('../../shared/helpers/response.helper');

/**
 * Get lab results PK by noorder
 * GET /adam-lis/bridging/pk/lab-results/:limit/:noorder
 */
async function getLabResultsByNoorder(req, res) {
    try {
        const { noorder, limit } = req.params;
        const limitNum = parseInt(limit);

        // Validate limit
        if (limitNum < 1 || limitNum > 10) {
            return responseHelper.badRequest(res, "Limit must be between 1 and 10");
        }

        console.log(`🔬 [PK] Getting lab results for noorder: ${noorder} (limit: ${limitNum})`);

        // Call service
        const result = await labResultsService.getLabResultsByNoorder(noorder, limitNum);

        // Return response
        const statusCode = result.success ? 200 : 404;
        return res.status(statusCode).json(result);

    } catch (error) {
        console.error('❌ [PK] Controller Error:', error);
        return responseHelper.serverError(res, `Server error: ${error.message}`);
    }
}

module.exports = {
    getLabResultsByNoorder
};

