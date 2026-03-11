/**
 * sheets-db.js
 * ───────────────────────────────────────────────────────────────
 * Google Sheets as a database for RAKSHAK Emergency Response System
 *
 * Each "table" is a separate Sheet tab inside one Google Spreadsheet.
 * Row 1 of every tab = column headers (set these up in your Sheet).
 *
 * Tabs required in your Google Spreadsheet:
 *   hospitals | ambulances | emergencies | users | notifications | routes
 *
 * Auth: uses a Google Service Account (serviceAccountKey.json)
 * ───────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID; // Set in .env
const KEY_FILE = path.join(__dirname, 'serviceAccountKey.json');

// ── Auth client ─────────────────────────────────────────────────
let _sheets = null;
async function getSheetsClient() {
    if (_sheets) return _sheets;
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    _sheets = google.sheets({ version: 'v4', auth });
    return _sheets;
}

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Read all rows from a sheet tab.
 * Returns array of plain objects keyed by the header row.
 */
async function readSheet(tab) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A1:ZZ`,
    });

    const rows = res.data.values || [];
    if (rows.length < 1) return [];

    const headers = rows[0];
    return rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 }; // 1-based, header is row 1
        headers.forEach((h, i) => {
            obj[h] = row[i] !== undefined ? row[i] : '';
        });
        // Auto-cast numeric/boolean-looking strings
        return castTypes(obj);
    });
}

/**
 * Append a new row to a sheet tab.
 * `data` = plain object. Keys must match the header row exactly.
 * Returns the newly created row (with auto-generated id).
 */
async function appendRow(tab, data) {
    const sheets = await getSheetsClient();

    // Read headers first
    const headers = await getHeaders(tab);

    // Auto-increment id
    const existing = await readSheet(tab);
    const nextId = existing.length > 0
        ? Math.max(...existing.map(r => Number(r.id) || 0)) + 1
        : 1;
    data.id = nextId;

    // Timestamp helpers
    if (!data.created_at) data.created_at = new Date().toISOString();
    if ('updated_at' in data || headers.includes('updated_at')) {
        data.updated_at = new Date().toISOString();
    }
    if ('last_updated' in data || headers.includes('last_updated')) {
        data.last_updated = new Date().toISOString();
    }
    if ('sent_at' in data || headers.includes('sent_at')) {
        data.sent_at = new Date().toISOString();
    }

    const rowValues = headers.map(h => (data[h] !== undefined ? String(data[h]) : ''));

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowValues] },
    });

    return castTypes({ ...data });
}

/**
 * Update specific columns of a row identified by id.
 * `updates` = plain object of fields to change.
 */
async function updateRowById(tab, id, updates) {
    const sheets = await getSheetsClient();
    const headers = await getHeaders(tab);

    // Find the row
    const all = await readRows(tab); // raw [headers, ...rows]
    const rowObj = all.find(r => String(r.id) === String(id));
    if (!rowObj) throw new Error(`Row with id=${id} not found in ${tab}`);

    // Merge updates
    if (headers.includes('updated_at')) updates.updated_at = new Date().toISOString();
    if (tab === 'ambulances' && headers.includes('last_updated')) updates.last_updated = new Date().toISOString();

    const merged = { ...rowObj, ...updates };
    delete merged._rowIndex;

    const rowValues = headers.map(h => (merged[h] !== undefined ? String(merged[h]) : ''));

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A${rowObj._rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [rowValues] },
    });

    return castTypes(merged);
}

// Internal: get headers for a tab
async function getHeaders(tab) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!1:1`,
    });
    return (res.data.values && res.data.values[0]) || [];
}

// Internal: read raw rows with _rowIndex
async function readRows(tab) {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A1:ZZ`,
    });
    const rows = res.data.values || [];
    if (rows.length < 1) return [];
    const headers = rows[0];
    return rows.slice(1).map((row, index) => {
        const obj = { _rowIndex: index + 2 };
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return castTypes(obj);
    });
}

// Cast stringified numbers/booleans back to proper types
function castTypes(obj) {
    const numericFields = [
        'id', 'severity', 'total_beds', 'available_beds', 'icu_beds',
        'available_icu_beds', 'latitude', 'longitude', 'current_latitude',
        'current_longitude', 'origin_lat', 'origin_lng', 'destination_lat',
        'destination_lng', 'estimated_distance_km', 'estimated_duration_min',
        'emergency_id', 'ambulance_id', 'hospital_id', 'reported_by', '_rowIndex',
    ];
    const boolFields = [
        'has_trauma_center', 'has_cardiac_unit', 'has_neuro_unit',
        'on_alert', 'acknowledged',
    ];

    const out = { ...obj };
    numericFields.forEach(f => {
        if (out[f] !== undefined && out[f] !== '') out[f] = Number(out[f]) || 0;
    });
    boolFields.forEach(f => {
        if (out[f] !== undefined) out[f] = out[f] === 'true' || out[f] === '1' || out[f] === 'TRUE';
    });
    return out;
}

// ── Public API ───────────────────────────────────────────────────
module.exports = {
    readSheet,
    appendRow,
    updateRowById,
};
