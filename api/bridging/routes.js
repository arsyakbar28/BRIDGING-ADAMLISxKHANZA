/**
 * Main Bridging Routes
 * Aggregate all lab type routes (PK, PA, MB)
 * 
 * Backend: Modular structure (PK/PA/MB separated)
 * Frontend: Backward compatible endpoints (no /pk prefix)
 */

const express = require('express');
const router = express.Router();

// Import PK controllers directly (backward compatible)
const patientController = require('./pk/controllers/patient-registration-pk.controller');
const labResultsController = require('./pk/controllers/lab-results-pk.controller');
const postLabController = require('./pk/controllers/post-lab-pk.controller');
const mbRoutes = require('./mb/routes');
const paRoutes = require('./pa/routes');

/**
 * PK Routes (Backward Compatible - no /pk prefix)
 */

// GET /adam-lis/bridging/mb/:limit/:noorder
// MB registration lookup
router.use('/mb', mbRoutes);

// GET /adam-lis/bridging/pa/:limit/:noorder
// PA registration lookup
router.use('/pa', paRoutes);

// GET /adam-lis/bridging/:limit/:noorder
// Search patient registration
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

// GET /adam-lis/bridging/lab-results-pk/:limit/:noorder
// Get lab results by noorder
router.get('/lab-results-pk/:limit/:noorder', labResultsController.getLabResultsByNoorder);

// POST /adam-lis/bridging/update-hasil
// Update/create PK lab results from Adam LIS callback
router.post('/update-hasil', postLabController.updateHasil);

// POST /adam-lis/bridging/
// Post lab results
router.post('/', postLabController.postLabResults);

module.exports = router;
