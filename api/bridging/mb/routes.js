/**
 * MB (Mikrobiologi) Routes
 * All routes for MB lab type
 */

const express = require('express');
const router = express.Router();
const patientController = require('./controllers/patient-registration-mb.controller');
const labResultsController = require('./controllers/lab-results-mb.controller');
const postLabController = require('./controllers/post-lab-mb.controller');

// GET /adam-lis/bridging/mb/:limit/:noorder
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

// GET /adam-lis/bridging/mb/lab-results/:limit/:noorder
router.get('/lab-results/:limit/:noorder', labResultsController.getLabResultsByNoorder);

// POST /adam-lis/bridging/mb
router.post('/', postLabController.postLabResults);

module.exports = router;
