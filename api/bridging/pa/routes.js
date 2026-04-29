/**
 * PA (Patologi Anatomi) Routes
 * All routes for PA lab type
 * 
 * TODO: Implement PA endpoints
 */

const express = require('express');
const router = express.Router();

const patientController = require('./controllers/patient-registration-pa.controller');

router.post('/registrasi', patientController.createRegistration);
router.get('/registrasi/:no_reg_rs', patientController.getRegistrationByNoRegRs);
router.post('/arsip', patientController.postArchive);
router.put('/arsip', patientController.updateArchive);
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

module.exports = router;

