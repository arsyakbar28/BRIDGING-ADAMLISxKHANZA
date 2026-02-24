/**
 * Main Bridging Routes
 * Aggregate all lab type routes (PK, PA, MB)
 * 
 * Backend: Modular structure (PK/PA/MB separated)
 * Frontend: Backward compatible endpoints (no /pk prefix for PK)
 */

const express = require('express');
const router = express.Router();

/**
 * ========================================
 * PK Routes (Patologi Klinis)
 * Backward Compatible - no /pk prefix
 * ========================================
 */
const patientControllerPk = require('./pk/controllers/patient-registration-pk.controller');
const labResultsControllerPk = require('./pk/controllers/lab-results-pk.controller');
const postLabControllerPk = require('./pk/controllers/post-lab-pk.controller');

// GET /adam-lis/bridging/:limit/:noorder
router.get('/:limit/:noorder', patientControllerPk.searchPatientRegistration);

// GET /adam-lis/bridging/lab-results-pk/:limit/:noorder
router.get('/lab-results-pk/:limit/:noorder', labResultsControllerPk.getLabResultsByNoorder);

// POST /adam-lis/bridging/
router.post('/', postLabControllerPk.postLabResults);

/**
 * ========================================
 * MB Routes (Mikrobiologi)
 * ========================================
 */
const patientControllerMb = require('./mb/controllers/patient-registration-mb.controller');
const labResultsControllerMb = require('./mb/controllers/lab-results-mb.controller');
const postLabControllerMb = require('./mb/controllers/post-lab-mb.controller');

// GET /adam-lis/bridging/mb/:limit/:noorder
router.get('/mb/:limit/:noorder', patientControllerMb.searchPatientRegistration);

// GET /adam-lis/bridging/mb/lab-results/:limit/:noorder
router.get('/mb/lab-results/:limit/:noorder', labResultsControllerMb.getLabResultsByNoorder);

// POST /adam-lis/bridging/mb
router.post('/mb', postLabControllerMb.postLabResults);

/**
 * ========================================
 * PA Routes (Patologi Anatomi)
 * ========================================
 */
const patientControllerPa = require('./pa/controllers/patient-registration-pa.controller');
const labResultsControllerPa = require('./pa/controllers/lab-results-pa.controller');
const postLabControllerPa = require('./pa/controllers/post-lab-pa.controller');

// GET /adam-lis/bridging/pa/:limit/:noorder
router.get('/pa/:limit/:noorder', patientControllerPa.searchPatientRegistration);

// GET /adam-lis/bridging/pa/lab-results/:limit/:noorder
router.get('/pa/lab-results/:limit/:noorder', labResultsControllerPa.getLabResultsByNoorder);

// POST /adam-lis/bridging/pa
router.post('/pa', postLabControllerPa.postLabResults);

module.exports = router;
