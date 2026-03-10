const db = require('../models/inMemoryDb');

let broadcast = () => { };
exports.setBroadcast = (fn) => { broadcast = fn; };

/**
 * POST /report-emergency
 * Receives emergency requests from users.
 * Body: { latitude, longitude, emergencyType, timestamp }
 */
exports.reportEmergency = (req, res) => {
    const { latitude, longitude, emergencyType, timestamp } = req.body;

    // Input validation
    if (!latitude || !longitude || !emergencyType) {
        return res.status(400).json({
            status: 'error',
            message: 'latitude, longitude, and emergencyType are required.',
        });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ status: 'error', message: 'Invalid GPS coordinates.' });
    }

    const validTypes = ['medical', 'fire', 'accident', 'crime', 'natural_disaster', 'other'];
    if (!validTypes.includes(emergencyType.toLowerCase())) {
        return res.status(400).json({
            status: 'error',
            message: `Invalid emergencyType. Must be one of: ${validTypes.join(', ')}`,
        });
    }

    const record = db.addEmergency({
        latitude: lat,
        longitude: lng,
        emergencyType: emergencyType.toLowerCase(),
        timestamp: timestamp || new Date().toISOString(),
    });

    // Broadcast real-time notification via WebSocket
    broadcast({ event: 'new_emergency', data: record });

    return res.status(201).json({
        status: 'success',
        message: 'Emergency request received',
        data: record,
    });
};

/**
 * GET /emergencies
 * Returns all reported emergencies.
 */
exports.getEmergencies = (req, res) => {
    const emergencies = db.getEmergencies();
    return res.json({
        status: 'success',
        count: emergencies.length,
        data: emergencies,
    });
};
