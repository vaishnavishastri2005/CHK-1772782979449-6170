const express = require('express');
const router  = express.Router();
const db      = require('../db');

let broadcast = () => {};
router.setBroadcast = (fn) => { broadcast = fn; };

// Get all hospitals
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hospitals ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single hospital
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM hospitals WHERE id = ?', 
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

// Send hospital alert
router.post('/:id/alert', async (req, res) => {
  const { emergency_id, ambulance_id, message } = req.body;
  const hospitalId = req.params.id;

  try {
    const [hospitals] = await db.query(
      'SELECT * FROM hospitals WHERE id = ?', 
      [hospitalId]
    );

    if (!hospitals.length) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }

    const alertMsg = message || `Emergency patient incoming. Please prepare emergency bay.`;

    await db.query(
      `INSERT INTO notifications (type, emergency_id, hospital_id, ambulance_id, message)
       VALUES ('hospital_alert', ?, ?, ?, ?)`,
      [emergency_id || null, hospitalId, ambulance_id || null, alertMsg]
    );

    await db.query(
      'UPDATE hospitals SET on_alert = TRUE WHERE id = ?', 
      [hospitalId]
    );

    const [updated] = await db.query(
      'SELECT * FROM hospitals WHERE id = ?', 
      [hospitalId]
    );

    broadcast({
      event: 'hospital_alert',
      data: { hospital: updated[0], message: alertMsg }
    });

    res.json({ success: true, data: updated[0], message: 'Alert sent successfully' });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update bed availability
router.put('/:id/beds', async (req, res) => {
  const { available_beds, available_icu_beds, on_alert } = req.body;
  const updates = [];
  const values  = [];

  if (available_beds !== undefined) {
    updates.push('available_beds = ?');
    values.push(available_beds);
  }

  if (available_icu_beds !== undefined) {
    updates.push('available_icu_beds = ?');
    values.push(available_icu_beds);
  }

  if (on_alert !== undefined) {
    updates.push('on_alert = ?');
    values.push(on_alert);
  }

  if (!updates.length) {
    return res.status(400).json({ success: false, error: 'No fields to update' });
  }

  values.push(req.params.id);

  try {
    await db.query(
      `UPDATE hospitals SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await db.query(
      'SELECT * FROM hospitals WHERE id = ?', 
      [req.params.id]
    );

    broadcast({ event: 'hospital_update', data: rows[0] });

    res.json({ success: true, data: rows[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get hospital notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, e.emergency_type, e.severity, e.patient_name
       FROM notifications n
       LEFT JOIN emergencies e ON n.emergency_id = e.id
       WHERE n.hospital_id = ?
       ORDER BY n.sent_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({ success: true, data: rows });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Summary stats
router.get('/stats/summary', async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) AS total_hospitals,
        SUM(available_beds) AS total_available_beds,
        SUM(available_icu_beds) AS total_available_icu,
        SUM(on_alert = 1) AS hospitals_on_alert
      FROM hospitals
    `);

    res.json({ success: true, data: stats[0] });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;