const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');

// Pass broadcast to controller
router.setBroadcast = (fn) => ambulanceController.setBroadcast(fn);

// POST /ambulance-location  – ambulance driver sends live GPS
router.post('/ambulance-location', ambulanceController.updateLocation);

// GET /ambulances  – list all ambulances and their locations
router.get('/ambulances', ambulanceController.getAllAmbulances);

// GET /nearest-ambulance?latitude=X&longitude=Y  – find nearest available ambulance
router.get('/nearest-ambulance', ambulanceController.getNearestAmbulance);

module.exports = router;
