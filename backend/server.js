require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const emergencyRoutes = require('./routes/emergencyRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve Frontend Static Files ──────────────────────────────────────────────
// The frontend lives in ../public relative to this backend/ folder
const FRONTEND_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(FRONTEND_DIR));

// ─── WebSocket Broadcast ──────────────────────────────────────────────────────
function broadcast(payload) {
    const msg = JSON.stringify(payload);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
}

// Share broadcast with route controllers
emergencyRoutes.setBroadcast(broadcast);
ambulanceRoutes.setBroadcast(broadcast);

// ─── REST API Routes ──────────────────────────────────────────────────────────
app.use('/api', emergencyRoutes);
app.use('/api', ambulanceRoutes);

// ── Compatibility aliases so the existing frontend pages work without changes ──

// Frontend calls GET /api/emergencies → return all emergencies
const db = require('./models/inMemoryDb');

app.get('/api/emergencies', (req, res) => {
    const emergencies = db.getEmergencies();
    // Map fields to what the frontend expects (patient_name, emergency_type, etc.)
    const mapped = emergencies.map(e => ({
        id: e.id,
        patient_name: e.patientName || 'Unknown',
        emergency_type: e.emergencyType,
        severity: e.severity || 3,
        latitude: e.latitude,
        longitude: e.longitude,
        address: e.address || '',
        status: e.status,
        created_at: e.createdAt,
    }));
    res.json({ success: true, data: mapped });
});

// Frontend POSTs to /api/emergencies (from report.html form)
app.post('/api/emergencies', (req, res) => {
    const { patient_name, emergency_type, severity, description, latitude, longitude, address } = req.body;

    if (!latitude || !longitude || !emergency_type) {
        return res.status(400).json({ success: false, error: 'latitude, longitude, and emergency_type are required.' });
    }

    const record = db.addEmergency({
        patientName: patient_name || 'Unknown',
        emergencyType: emergency_type,
        severity: severity || 3,
        description: description || '',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || '',
        timestamp: new Date().toISOString(),
    });

    broadcast({ event: 'new_emergency', data: record });

    res.status(201).json({
        success: true,
        data: {
            id: record.id,
            patient_name: record.patientName,
            emergency_type: record.emergencyType,
            severity: record.severity,
            latitude: record.latitude,
            longitude: record.longitude,
            address: record.address,
            status: record.status,
            created_at: record.createdAt,
        }
    });
});

// Frontend calls POST /api/ambulances/assign after reporting an emergency
app.post('/api/ambulances/assign', (req, res) => {
    const { emergency_id, lat, lng } = req.body;
    const available = db.getAvailableAmbulances();

    if (!available.length) {
        return res.status(409).json({ success: false, error: 'No ambulances available' });
    }

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371, toR = d => d * Math.PI / 180;
        const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    let nearest = null, minDist = Infinity;
    for (const amb of available) {
        const d = haversine(lat, lng, amb.latitude, amb.longitude);
        if (d < minDist) { minDist = d; nearest = amb; }
    }

    db.updateAmbulanceLocation(nearest.ambulance_id, nearest.latitude, nearest.longitude, 'on_duty');

    const eta = ((minDist / 60) * 60).toFixed(1);

    broadcast({ event: 'ambulance_dispatched', data: { ambulance: nearest, emergency_id, distance_km: +minDist.toFixed(2), eta_min: +eta } });

    res.json({ success: true, data: { ambulance: nearest, distance_km: +minDist.toFixed(2), eta_min: +eta } });
});

// Frontend calls GET /api/hospitals → return empty/stub list (no DB)
app.get('/api/hospitals', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 1, name: 'City General Hospital', available_beds: 12, on_alert: false },
            { id: 2, name: 'Apollo Emergency Center', available_beds: 7, on_alert: false },
            { id: 3, name: 'Medanta Trauma Center', available_beds: 5, on_alert: false },
        ]
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Emergency Response API is running',
        timestamp: new Date().toISOString(),
        connectedClients: wss.clients.size,
        endpoints: [
            'POST   /api/report-emergency       — ambulance driver / new format',
            'POST   /api/ambulance-location     — live GPS update',
            'GET    /api/ambulances             — all ambulances',
            'GET    /api/nearest-ambulance      — nearest by ?latitude=X&longitude=Y',
            'POST   /api/emergencies            — report emergency (frontend form)',
            'GET    /api/emergencies            — list all emergencies',
            'POST   /api/ambulances/assign      — dispatch nearest ambulance',
            'GET    /api/hospitals              — hospital list',
        ],
    });
});

// ─── 404 API Handler ──────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
    res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.url} not found.` });
});

// ─── SPA Fallback — serve frontend for all non-API routes ────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

// ─── WebSocket Events ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
    console.log(`[WS] Client connected. Total: ${wss.clients.size}`);

    ws.send(JSON.stringify({
        event: 'connected',
        message: 'Real-time connection established',
        timestamp: new Date().toISOString(),
    }));

    ws.on('close', () => {
        console.log(`[WS] Client disconnected. Total: ${wss.clients.size}`);
    });

    ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log('─────────────────────────────────────────────────');
    console.log(`  🚑 Emergency Response System`);
    console.log(`  Backend API   → http://localhost:${PORT}/api`);
    console.log(`  Frontend UI   → http://localhost:${PORT}`);
    console.log(`  Health Check  → http://localhost:${PORT}/api/health`);
    console.log('─────────────────────────────────────────────────');
});
