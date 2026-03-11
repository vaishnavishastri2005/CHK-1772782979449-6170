const express = require('express');
const router = express.Router();
const db = require('../sheets-db');

let broadcast = () => { };
router.setBroadcast = (fn) => { broadcast = fn; };

// GET /api/emergencies  – list all
router.get('/', async (req, res) => {
  try {
    const emergencies = await db.readSheet('emergencies');
    const users = await db.readSheet('users');

    // Join reporter name
    const data = emergencies.map(e => {
      const reporter = users.find(u => String(u.id) === String(e.reported_by));
      return { ...e, reporter_name: reporter ? reporter.name : null };
    });

    // Sort newest first by created_at
    data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/emergencies/stats/summary
router.get('/stats/summary', async (req, res) => {
  try {
    const rows = await db.readSheet('emergencies');
    res.json({
      success: true,
      data: {
        total: rows.length,
        pending: rows.filter(r => r.status === 'pending').length,
        dispatched: rows.filter(r => r.status === 'dispatched').length,
        en_route: rows.filter(r => r.status === 'en_route').length,
        resolved: rows.filter(r => r.status === 'resolved').length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/emergencies/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.readSheet('emergencies');
    const row = rows.find(r => String(r.id) === String(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/emergencies  – create
router.post('/', async (req, res) => {
  const { patient_name, emergency_type, severity, description, latitude, longitude, address, reported_by } = req.body;

  if (!patient_name || !emergency_type || !severity || !latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const newRow = await db.appendRow('emergencies', {
      patient_name,
      emergency_type,
      severity,
      description: description || '',
      latitude,
      longitude,
      address: address || '',
      status: 'pending',
      reported_by: reported_by || '',
    });

    broadcast({ event: 'new_emergency', data: newRow });
    res.status(201).json({ success: true, data: newRow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/emergencies/:id/status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'dispatched', 'en_route', 'arrived', 'resolved', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    const updated = await db.updateRowById('emergencies', req.params.id, { status });
    broadcast({ event: 'emergency_status_update', data: updated });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;