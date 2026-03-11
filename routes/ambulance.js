const express = require('express');
const router = express.Router();
const db = require('../sheets-db');

let broadcast = () => { };
router.setBroadcast = (fn) => { broadcast = fn; };

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/ambulances
router.get('/', async (req, res) => {
  try {
    const rows = await db.readSheet('ambulances');
    rows.sort((a, b) => a.id - b.id);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ambulances/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.readSheet('ambulances');
    const row = rows.find(r => String(r.id) === String(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ambulances/assign – find nearest ambulance and dispatch
router.post('/assign', async (req, res) => {
  const { emergency_id, lat, lng } = req.body;
  if (!emergency_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'emergency_id, lat, lng required' });
  }

  try {
    const ambulances = await db.readSheet('ambulances');
    const available = ambulances.filter(
      a => a.status === 'available' && a.current_latitude && a.current_longitude
    );

    if (!available.length) {
      return res.status(409).json({ success: false, error: 'No ambulances available' });
    }

    // Find nearest
    let nearest = null, minDist = Infinity;
    for (const amb of available) {
      const dist = haversineDistance(lat, lng, amb.current_latitude, amb.current_longitude);
      if (dist < minDist) { minDist = dist; nearest = amb; }
    }

    const durationMin = (minDist / 60) * 60;

    // Update ambulance status
    const updatedAmb = await db.updateRowById('ambulances', nearest.id, {
      status: 'en_route',
      assigned_emergency_id: emergency_id,
    });

    // Update emergency status
    await db.updateRowById('emergencies', emergency_id, { status: 'dispatched' });

    // Find a hospital with beds available
    const hospitals = await db.readSheet('hospitals');
    const hospital = hospitals
      .filter(h => h.available_beds > 0)
      .sort((a, b) => b.available_beds - a.available_beds)[0] || null;

    let routeId = null;
    if (hospital) {
      const newRoute = await db.appendRow('routes', {
        emergency_id,
        ambulance_id: nearest.id,
        hospital_id: hospital.id,
        origin_lat: nearest.current_latitude,
        origin_lng: nearest.current_longitude,
        destination_lat: hospital.latitude,
        destination_lng: hospital.longitude,
        estimated_distance_km: +minDist.toFixed(2),
        estimated_duration_min: +durationMin.toFixed(2),
        traffic_condition: 'moderate',
        route_status: 'active',
      });
      routeId = newRoute.id;

      await db.appendRow('notifications', {
        type: 'hospital_alert',
        emergency_id,
        hospital_id: hospital.id,
        ambulance_id: nearest.id,
        message: `ALERT: Patient incoming via ambulance ${nearest.vehicle_number}. ETA: ${Math.round(durationMin)} min.`,
        acknowledged: false,
      });

      await db.updateRowById('hospitals', hospital.id, { on_alert: true });
    }

    const payload = {
      ambulance: updatedAmb,
      emergency_id,
      hospital,
      distance_km: +minDist.toFixed(2),
      eta_min: +durationMin.toFixed(2),
      route_id: routeId,
    };

    broadcast({ event: 'ambulance_dispatched', data: payload });
    res.json({ success: true, data: payload });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/ambulances/:id/location
router.put('/:id/location', async (req, res) => {
  const { lat, lng } = req.body;
  try {
    const updated = await db.updateRowById('ambulances', req.params.id, {
      current_latitude: lat,
      current_longitude: lng,
    });
    broadcast({ event: 'ambulance_location_update', data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/ambulances/:id/status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const updates = { status };
    if (status === 'available') updates.assigned_emergency_id = '';
    const updated = await db.updateRowById('ambulances', req.params.id, updates);
    broadcast({ event: 'ambulance_status_update', data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;