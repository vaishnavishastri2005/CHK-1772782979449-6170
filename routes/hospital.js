const express = require('express');
const router = express.Router();
const db = require('../sheets-db');

let broadcast = () => { };
router.setBroadcast = (fn) => { broadcast = fn; };

// GET /api/hospitals – all hospitals
router.get('/', async (req, res) => {
  try {
    const rows = await db.readSheet('hospitals');
    rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/hospitals/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const rows = await db.readSheet('hospitals');
    res.json({
      success: true,
      data: {
        total_hospitals: rows.length,
        total_available_beds: rows.reduce((s, r) => s + (r.available_beds || 0), 0),
        total_available_icu: rows.reduce((s, r) => s + (r.available_icu_beds || 0), 0),
        hospitals_on_alert: rows.filter(r => r.on_alert).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/hospitals/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.readSheet('hospitals');
    const row = rows.find(r => String(r.id) === String(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/hospitals/:id/alert – send alert notification
router.post('/:id/alert', async (req, res) => {
  const { emergency_id, ambulance_id, message } = req.body;
  const hospitalId = req.params.id;

  try {
    const hospitals = await db.readSheet('hospitals');
    const hospital = hospitals.find(h => String(h.id) === String(hospitalId));
    if (!hospital) return res.status(404).json({ success: false, error: 'Hospital not found' });

    const alertMsg = message || 'Emergency patient incoming. Please prepare emergency bay.';

    await db.appendRow('notifications', {
      type: 'hospital_alert',
      emergency_id: emergency_id || '',
      hospital_id: hospitalId,
      ambulance_id: ambulance_id || '',
      message: alertMsg,
      acknowledged: false,
    });

    const updated = await db.updateRowById('hospitals', hospitalId, { on_alert: true });

    broadcast({ event: 'hospital_alert', data: { hospital: updated, message: alertMsg } });
    res.json({ success: true, data: updated, message: 'Alert sent successfully' });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/hospitals/:id/beds – update bed availability
router.put('/:id/beds', async (req, res) => {
  const { available_beds, available_icu_beds, on_alert } = req.body;
  const updates = {};

  if (available_beds !== undefined) updates.available_beds = available_beds;
  if (available_icu_beds !== undefined) updates.available_icu_beds = available_icu_beds;
  if (on_alert !== undefined) updates.on_alert = on_alert;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  try {
    const updated = await db.updateRowById('hospitals', req.params.id, updates);
    broadcast({ event: 'hospital_update', data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/hospitals/:id/notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const notifications = await db.readSheet('notifications');
    const emergencies = await db.readSheet('emergencies');

    const filtered = notifications
      .filter(n => String(n.hospital_id) === String(req.params.id))
      .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
      .slice(0, 20)
      .map(n => {
        const em = emergencies.find(e => String(e.id) === String(n.emergency_id));
        return {
          ...n,
          emergency_type: em ? em.emergency_type : null,
          severity: em ? em.severity : null,
          patient_name: em ? em.patient_name : null,
        };
      });

    res.json({ success: true, data: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;