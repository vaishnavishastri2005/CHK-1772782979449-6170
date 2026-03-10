const express = require('express');
const router  = express.Router();
const db      = require('../db');

let broadcast = () => {};
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

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ambulances ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ambulances WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/assign', async (req, res) => {
  const { emergency_id, lat, lng } = req.body;
  if (!emergency_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'emergency_id, lat, lng required' });
  }

  try {
    const [available] = await db.query(
      `SELECT * FROM ambulances WHERE status = 'available' AND current_latitude IS NOT NULL`
    );

    if (!available.length) {
      return res.status(409).json({ success: false, error: 'No ambulances available' });
    }

    let nearest = null;
    let minDist = Infinity;

    for (const amb of available) {
      const dist = haversineDistance(lat, lng, amb.current_latitude, amb.current_longitude);
      if (dist < minDist) { minDist = dist; nearest = amb; }
    }

    const durationMin = (minDist / 60) * 60;

    await db.query(
      `UPDATE ambulances SET status = 'en_route', assigned_emergency_id = ? WHERE id = ?`,
      [emergency_id, nearest.id]
    );

    await db.query(
      `UPDATE emergencies SET status = 'dispatched' WHERE id = ?`, [emergency_id]
    );

    const [hospitals] = await db.query(
      `SELECT * FROM hospitals WHERE available_beds > 0 ORDER BY available_beds DESC LIMIT 1`
    );

    const hospital = hospitals[0] || null;

    let routeId = null;

    if (hospital) {
      const [routeRes] = await db.query(
        `INSERT INTO routes (emergency_id, ambulance_id, hospital_id, origin_lat, origin_lng, destination_lat, destination_lng, estimated_distance_km, estimated_duration_min, traffic_condition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'moderate')`,
        [emergency_id, nearest.id, hospital.id, nearest.current_latitude, nearest.current_longitude, hospital.latitude, hospital.longitude, minDist.toFixed(2), durationMin.toFixed(2)]
      );

      routeId = routeRes.insertId;

      await db.query(
        `INSERT INTO notifications (type, emergency_id, hospital_id, ambulance_id, message) VALUES (?, ?, ?, ?, ?)`,
        ['hospital_alert', emergency_id, hospital.id, nearest.id,
         `ALERT: Patient incoming via ambulance ${nearest.vehicle_number}. ETA: ${Math.round(durationMin)} min.`]
      );

      await db.query(
        `UPDATE hospitals SET on_alert = TRUE WHERE id = ?`, [hospital.id]
      );
    }

    const [updatedAmb] = await db.query('SELECT * FROM ambulances WHERE id = ?', [nearest.id]);

    broadcast({
      event: 'ambulance_dispatched',
      data: {
        ambulance: updatedAmb[0],
        emergency_id,
        hospital,
        distance_km: +minDist.toFixed(2),
        eta_min: +durationMin.toFixed(2),
        route_id: routeId
      }
    });

    res.json({
      success: true,
      data: {
        ambulance: updatedAmb[0],
        hospital,
        distance_km: +minDist.toFixed(2),
        eta_min: +durationMin.toFixed(2)
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/location', async (req, res) => {
  const { lat, lng } = req.body;

  try {
    await db.query(
      `UPDATE ambulances SET current_latitude = ?, current_longitude = ? WHERE id = ?`,
      [lat, lng, req.params.id]
    );

    const [rows] = await db.query('SELECT * FROM ambulances WHERE id = ?', [req.params.id]);

    broadcast({
      event: 'ambulance_location_update',
      data: rows[0]
    });

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  const { status } = req.body;

  try {
    const resetAssignment = status === 'available' ? ', assigned_emergency_id = NULL' : '';

    await db.query(
      `UPDATE ambulances SET status = ?${resetAssignment} WHERE id = ?`,
      [status, req.params.id]
    );

    const [rows] = await db.query('SELECT * FROM ambulances WHERE id = ?', [req.params.id]);

    broadcast({
      event: 'ambulance_status_update',
      data: rows[0]
    });

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;