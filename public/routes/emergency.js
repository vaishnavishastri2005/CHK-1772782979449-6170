const express = require('express');
const router  = express.Router();
const db      = require('../db');

let broadcast = () => {};
router.setBroadcast = (fn) => { broadcast = fn; };

// Get all emergencies
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, u.name AS reporter_name
       FROM emergencies e
       LEFT JOIN users u ON e.reported_by = u.id
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single emergency
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, u.name AS reporter_name
       FROM emergencies e
       LEFT JOIN users u ON e.reported_by = u.id
       WHERE e.id = ?`, 
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create emergency
router.post('/', async (req, res) => {
  const { patient_name, emergency_type, severity, description, latitude, longitude, address, reported_by } = req.body;

  if (!patient_name || !emergency_type || !severity || !latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO emergencies 
      (patient_name, emergency_type, severity, description, latitude, longitude, address, status, reported_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [patient_name, emergency_type, severity, description || '', latitude, longitude, address || '', reported_by || null]
    );

    const [newRow] = await db.query(
      'SELECT * FROM emergencies WHERE id = ?', 
      [result.insertId]
    );

    broadcast({ event: 'new_emergency', data: newRow[0] });

    res.status(201).json({ success: true, data: newRow[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'dispatched', 'en_route', 'arrived', 'resolved', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    await db.query(
      'UPDATE emergencies SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    const [rows] = await db.query(
      'SELECT * FROM emergencies WHERE id = ?',
      [req.params.id]
    );

    broadcast({ event: 'emergency_status_update', data: rows[0] });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Summary stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'pending') AS pending,
        SUM(status = 'dispatched') AS dispatched,
        SUM(status = 'en_route') AS en_route,
        SUM(status = 'resolved') AS resolved
      FROM emergencies
    `);

    res.json({ success: true, data: stats[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;