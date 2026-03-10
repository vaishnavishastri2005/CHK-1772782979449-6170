const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

// Pass broadcast to controller
router.setBroadcast = (fn) => emergencyController.setBroadcast(fn);

// POST /report-emergency
router.post('/report-emergency', emergencyController.reportEmergency);

// GET /emergencies  (bonus: view all reported emergencies)
router.get('/emergencies', emergencyController.getEmergencies);

module.exports = router;
