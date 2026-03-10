const db = require('../models/inMemoryDb');

// Haversine formula to calculate distance between two GPS coordinates (in km)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let broadcast = () => { };
exports.setBroadcast = (fn) => { broadcast = fn; };

/**
 * POST /ambulance-location
 * Ambulance drivers send their live GPS location.
 */
exports.updateLocation = (req, res) => {
    const { ambulance_id, latitude, longitude, status } = req.body;

    if (!ambulance_id || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            status: 'error',
            message: 'ambulance_id, latitude, and longitude are required.',
        });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ status: 'error', message: 'Invalid GPS coordinates.' });
    }

    const validStatuses = ['available', 'on_duty'];
    const normalizedStatus = status && validStatuses.includes(status) ? status : undefined;

    const updated = db.updateAmbulanceLocation(ambulance_id, lat, lng, normalizedStatus);

    if (!updated) {
        // If ambulance doesn't exist, register it
        const newAmb = db.addAmbulance({
            ambulance_id,
            latitude: lat,
            longitude: lng,
            status: normalizedStatus || 'available',
            lastUpdated: new Date().toISOString(),
        });

        broadcast({ event: 'ambulance_location_update', data: newAmb });
        return res.status(201).json({ status: 'success', message: 'Ambulance registered and location set.', data: newAmb });
    }

    // Broadcast real-time update via WebSocket
    broadcast({ event: 'ambulance_location_update', data: updated });

    return res.json({ status: 'success', message: 'Ambulance location updated.', data: updated });
};

/**
 * GET /ambulances
 * Returns all ambulances and their current locations.
 */
exports.getAllAmbulances = (req, res) => {
    const ambulances = db.getAmbulances();
    return res.json({
        status: 'success',
        count: ambulances.length,
        data: ambulances,
    });
};

/**
 * GET /nearest-ambulance?latitude=X&longitude=Y
 * Finds and returns the nearest available ambulance.
 */
exports.getNearestAmbulance = (req, res) => {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({
            status: 'error',
            message: 'Query params latitude and longitude are required.',
        });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ status: 'error', message: 'Invalid GPS coordinates.' });
    }

    const available = db.getAvailableAmbulances();

    if (!available.length) {
        return res.status(404).json({ status: 'error', message: 'No available ambulances at the moment.' });
    }

    let nearest = null;
    let minDistance = Infinity;

    for (const amb of available) {
        const dist = haversineDistance(userLat, userLng, amb.latitude, amb.longitude);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = amb;
        }
    }

    const etaMinutes = ((minDistance / 60) * 60).toFixed(1);

    return res.json({
        status: 'success',
        message: 'Nearest ambulance found.',
        data: {
            ...nearest,
            distance_km: parseFloat(minDistance.toFixed(2)),
            eta_minutes: parseFloat(etaMinutes),
        },
    });
};
