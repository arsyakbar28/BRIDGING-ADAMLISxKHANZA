/**
 * PA (Patologi Anatomi) Routes
 * All routes for PA lab type
 */

const express = require('express');
const router = express.Router();
const patientController = require('./controllers/patient-registration-pa.controller');
const postLabController = require('./controllers/post-lab-pa.controller');

// GET /adam-lis/bridging/pa/:limit/:noorder
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

// POST /adam-lis/bridging/pa
router.post('/', postLabController.postLabResults);

module.exports = router;
