/**
 * Main Bridging Routes
 * Aggregate all lab type routes (PK, PA, MB)
 * 
 * Backend: Modular structure (PK/PA/MB separated)
 * Frontend: Backward compatible endpoints (no /pk prefix)
 */

const express = require('express');
const router = express.Router();

// Import routes/controllers
const paRoutes = require('./pa/routes');
const mbRoutes = require('./mb/routes');
const patientController = require('./pk/controllers/patient-registration-pk.controller');
const labResultsController = require('./pk/controllers/lab-results-pk.controller');
const postLabController = require('./pk/controllers/post-lab-pk.controller');

/**
 * PA Routes
 * Keep specific prefixes before dynamic PK route.
 */
router.use('/pa', paRoutes);
router.use('/mb', mbRoutes);

/**
 * PK Routes (Backward Compatible - no /pk prefix)
 */

// GET /adam-lis/bridging/:limit/:noorder
// Search patient registration
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

// GET /adam-lis/bridging/lab-results-pk/:limit/:noorder
// Get lab results by noorder
router.get('/lab-results-pk/:limit/:noorder', labResultsController.getLabResultsByNoorder);

// POST /adam-lis/bridging/
// Post lab results
router.post('/', postLabController.postLabResults);

module.exports = router;
