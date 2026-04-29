/**
 * PK (Patologi Klinis) Routes
 * All routes for PK lab type
 */

const express = require('express');
const router = express.Router();

// Import controllers
const patientController = require('./controllers/patient-registration-pk.controller');
const labResultsController = require('./controllers/lab-results-pk.controller');
const postLabController = require('./controllers/post-lab-pk.controller');

/**
 * GET /adam-lis/bridging/pk/:limit/:noorder
 * Search patient registration by noorder
 */
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

/**
 * GET /adam-lis/bridging/pk/lab-results/:limit/:noorder
 * Get lab results by noorder
 */
router.get('/lab-results/:limit/:noorder', labResultsController.getLabResultsByNoorder);

/**
 * POST /adam-lis/bridging/pk/update-hasil
 * Update/create PK lab results from Adam LIS callback
 */
router.post('/update-hasil', postLabController.updateHasil);

/**
 * POST /adam-lis/bridging/pk
 * Post lab results
 */
router.post('/', postLabController.postLabResults);

module.exports = router;

