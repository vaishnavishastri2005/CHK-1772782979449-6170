const express = require('express');
const router = express.Router();
const db = require('../sheets-db');

let broadcast = () => { };
router.setBroadcast = (fn) => { broadcast = fn; };

// GET /api/contacts/:emergency_id  – get all family contacts for a patient
router.get('/:emergency_id', async (req, res) => {
    try {
        const rows = await db.readSheet('contacts');
        const contacts = rows.filter(
            r => String(r.emergency_id) === String(req.params.emergency_id)
        );
        res.json({ success: true, data: contacts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/contacts/:emergency_id  – add a family contact for a patient
router.post('/:emergency_id', async (req, res) => {
    const { name, relation, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'name and phone are required' });
    }

    try {
        const newContact = await db.appendRow('contacts', {
            emergency_id: req.params.emergency_id,
            name,
            relation: relation || 'Family',
            phone,
            notified: false,
        });

        broadcast({ event: 'contact_added', data: newContact });
        res.status(201).json({ success: true, data: newContact });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/contacts/notify/:id  – mark a contact as notified
router.put('/notify/:id', async (req, res) => {
    try {
        const updated = await db.updateRowById('contacts', req.params.id, { notified: true });
        broadcast({ event: 'contact_notified', data: updated });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/contacts/all/list  – get all contacts (admin view)
router.get('/all/list', async (req, res) => {
    try {
        const contacts = await db.readSheet('contacts');
        const emergencies = await db.readSheet('emergencies');

        const data = contacts.map(c => {
            const em = emergencies.find(e => String(e.id) === String(c.emergency_id));
            return {
                ...c,
                patient_name: em ? em.patient_name : null,
                emergency_type: em ? em.emergency_type : null,
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
