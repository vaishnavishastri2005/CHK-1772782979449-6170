const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';
let ws = null;
let wsReconnectTimer = null;

function connectWebSocket() {
  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      document.querySelectorAll('.ws-dot').forEach(d => d.classList.add('connected'));
      document.querySelectorAll('.ws-status-text').forEach(t => t.textContent = 'Live');
      clearTimeout(wsReconnectTimer);
    };

    ws.onclose = () => {
      document.querySelectorAll('.ws-dot').forEach(d => d.classList.remove('connected'));
      document.querySelectorAll('.ws-status-text').forEach(t => t.textContent = 'Reconnecting…');
      wsReconnectTimer = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleWSMessage(msg);
      } catch (e) {}
    };
  } catch (e) {}
}

function handleWSMessage(msg) {
  if (typeof window.onWSMessage === 'function') window.onWSMessage(msg);
}

function showToast(title, message, type = 'info') {
  const icons = { success: '✅', error: '🚨', warning: '⚠️', info: 'ℹ️' };

  const container =
    document.getElementById('toast-container') ||
    (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div>
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function apiPut(path, body) {
  const r = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

function highlightNav() {
  const path = window.location.pathname;

  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');

    if (href && path.endsWith(href)) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
}

function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('GPS not supported'));
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;

  return `${Math.floor(diff / 3600)}h ago`;
}

function severityLabel(s) {
  const labels = {
    1: '🟢 Low',
    2: '🟡 Mild',
    3: '🟠 Moderate',
    4: '🔴 High',
    5: '🚨 Critical'
  };

  return labels[s] || s;
}

document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
  highlightNav();
});