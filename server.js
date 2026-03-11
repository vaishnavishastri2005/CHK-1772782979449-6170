require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const emergencyRouter = require('./routes/emergency');
const ambulanceRouter = require('./routes/ambulance');
const hospitalRouter = require('./routes/hospital');
const contactsRouter = require('./routes/contacts');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── WebSocket broadcast helper ───────────────────────────────────
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

emergencyRouter.setBroadcast(broadcast);
ambulanceRouter.setBroadcast(broadcast);
hospitalRouter.setBroadcast(broadcast);
contactsRouter.setBroadcast(broadcast);

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/emergencies', emergencyRouter);
app.use('/api/ambulances', ambulanceRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/contacts', contactsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RAKSHAK Emergency Response System API is running',
    db: 'Google Sheets',
    time: new Date().toISOString(),
    clients: wss.clients.size,
  });
});

// ── WebSocket ────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log(`WebSocket connected (${wss.clients.size})`);

  ws.send(JSON.stringify({
    event: 'connected',
    message: 'Real-time connection established',
    time: new Date().toISOString(),
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      ws.send(JSON.stringify({ event: 'echo', data: msg, time: new Date().toISOString() }));
    } catch (e) {
      console.warn('Invalid WS message');
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket disconnected (${wss.clients.size})`);
  });
});

// ── SPA fallback ─────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
  console.log(`📊  Database: Google Sheets (ID: ${process.env.GOOGLE_SHEET_ID || '⚠️ NOT SET'})`);
});