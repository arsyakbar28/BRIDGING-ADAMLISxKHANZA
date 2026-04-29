/**
 * MB (Mikrobiologi) Routes
 * All routes for MB lab type
 * 
 * TODO: Implement MB endpoints
 */

const express = require('express');
const router = express.Router();

const patientController = require('./controllers/patient-registration-mb.controller');

router.post('/registrasi', patientController.createRegistration);
router.get('/registrasi/:no_reg_rs', patientController.getRegistrationByNoRegRs);
router.post('/arsip', patientController.postArchive);
router.put('/arsip/:no_lab', patientController.updateArchive);
router.put('/arsip', patientController.updateArchive);
router.get('/:limit/:noorder', patientController.searchPatientRegistration);

module.exports = router;

