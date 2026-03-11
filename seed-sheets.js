/**
 * seed-sheets.js
 * Run once to populate your Google Spreadsheet with sample data.
 * Automatically creates all required tabs if they don't exist.
 * Usage: node seed-sheets.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const KEY_FILE = path.join(__dirname, 'serviceAccountKey.json');

const REQUIRED_TABS = ['hospitals', 'ambulances', 'emergencies', 'users', 'notifications', 'routes', 'contacts'];

async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

// Auto-create any missing tabs in the spreadsheet
async function createTabsIfMissing(sheets) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existing = meta.data.sheets.map(s => s.properties.title);

    const missing = REQUIRED_TABS.filter(t => !existing.includes(t));
    if (!missing.length) {
        console.log('✅  All tabs already exist');
        return;
    }

    console.log(`➕  Creating missing tabs: ${missing.join(', ')}`);
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            requests: missing.map(title => ({
                addSheet: { properties: { title } }
            }))
        }
    });
    console.log('✅  Tabs created\n');
}


async function setSheet(sheets, tab, rows) {
    // rows[0] = headers, rows[1..] = data
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows },
    });
    console.log(`✅  ${tab} — ${rows.length - 1} rows seeded`);
}

async function seed() {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
        console.error('❌  GOOGLE_SHEET_ID is not set in .env!');
        process.exit(1);
    }

    console.log(`\n🌱  Seeding Google Spreadsheet: ${SPREADSHEET_ID}\n`);
    const sheets = await getSheetsClient();

    // Auto-create missing tabs first
    await createTabsIfMissing(sheets);


    // ── users ────────────────────────────────────────────────────────
    await setSheet(sheets, 'users', [
        ['id', 'name', 'email', 'role', 'phone', 'created_at'],
        ['1', 'Admin User', 'admin@ers.com', 'admin', '+91-9000000001', new Date().toISOString()],
        ['2', 'Ravi Dispatcher', 'ravi@ers.com', 'dispatcher', '+91-9000000002', new Date().toISOString()],
        ['3', 'Meera Hospital', 'meera@apollo.com', 'hospital_staff', '+91-9000000003', new Date().toISOString()],
        ['4', 'Test Reporter', 'test@ers.com', 'reporter', '+91-9000000004', new Date().toISOString()],
    ]);

    // ── hospitals ────────────────────────────────────────────────────
    await setSheet(sheets, 'hospitals', [
        ['id', 'name', 'address', 'latitude', 'longitude', 'phone', 'total_beds', 'available_beds', 'icu_beds', 'available_icu_beds', 'has_trauma_center', 'has_cardiac_unit', 'has_neuro_unit', 'on_alert', 'created_at', 'updated_at'],
        ['1', 'Apollo Hospitals', '21 Greams Rd, Chennai', '13.0604', '80.2496', '+91-44-28293333', '300', '45', '30', '8', 'true', 'true', 'true', 'false', new Date().toISOString(), new Date().toISOString()],
        ['2', 'AIIMS Delhi', 'Ansari Nagar East, New Delhi', '28.5672', '77.2100', '+91-11-26588500', '500', '72', '60', '12', 'true', 'true', 'true', 'false', new Date().toISOString(), new Date().toISOString()],
        ['3', 'Fortis Hospitals', 'Cunningham Rd, Bengaluru', '12.9916', '77.5946', '+91-80-66214444', '250', '30', '25', '5', 'false', 'true', 'false', 'false', new Date().toISOString(), new Date().toISOString()],
        ['4', 'Manipal Hospital', 'HAL Airport Rd, Bengaluru', '12.9592', '77.6480', '+91-80-40055000', '200', '55', '20', '10', 'true', 'false', 'true', 'false', new Date().toISOString(), new Date().toISOString()],
    ]);

    // ── ambulances ───────────────────────────────────────────────────
    await setSheet(sheets, 'ambulances', [
        ['id', 'vehicle_number', 'driver_name', 'driver_phone', 'current_latitude', 'current_longitude', 'status', 'assigned_emergency_id', 'last_updated'],
        ['1', 'KA-01-AMB-001', 'Suresh Kumar', '+91-9111111101', '12.9716', '77.5946', 'available', '', new Date().toISOString()],
        ['2', 'KA-01-AMB-002', 'Ramesh Menon', '+91-9111111102', '12.9800', '77.6100', 'available', '', new Date().toISOString()],
        ['3', 'KA-01-AMB-003', 'Anil Singh', '+91-9111111103', '12.9500', '77.5700', 'en_route', '3', new Date().toISOString()],
        ['4', 'KA-01-AMB-004', 'Deepak Rao', '+91-9111111104', '13.0100', '77.5900', 'available', '', new Date().toISOString()],
        ['5', 'KA-01-AMB-005', 'Sunil Sharma', '+91-9111111105', '12.9600', '77.6300', 'available', '', new Date().toISOString()],
    ]);

    // ── emergencies ──────────────────────────────────────────────────
    await setSheet(sheets, 'emergencies', [
        ['id', 'patient_name', 'emergency_type', 'severity', 'description', 'latitude', 'longitude', 'address', 'status', 'reported_by', 'created_at', 'updated_at'],
        ['1', 'Rajesh P', 'Heart Attack', '5', 'Patient collapsed on road, unresponsive', '12.9716', '77.5946', 'MG Road, Bengaluru', 'pending', '4', new Date().toISOString(), new Date().toISOString()],
        ['2', 'Kavya S', 'Accident', '4', 'Road accident, multiple injuries', '12.9800', '77.6100', 'Whitefield Main Rd', 'dispatched', '4', new Date().toISOString(), new Date().toISOString()],
        ['3', 'Mohan D', 'Stroke', '5', 'Sudden paralysis, slurred speech', '12.9500', '77.5700', 'Indiranagar 100ft Road', 'en_route', '4', new Date().toISOString(), new Date().toISOString()],
    ]);

    // ── routes ───────────────────────────────────────────────────────
    await setSheet(sheets, 'routes', [
        ['id', 'emergency_id', 'ambulance_id', 'hospital_id', 'origin_lat', 'origin_lng', 'destination_lat', 'destination_lng', 'estimated_distance_km', 'estimated_duration_min', 'traffic_condition', 'route_status', 'created_at'],
        ['1', '2', '3', '3', '12.9800', '77.6100', '12.9916', '77.5946', '2.4', '8.5', 'moderate', 'active', new Date().toISOString()],
        ['2', '3', '1', '1', '12.9500', '77.5700', '13.0604', '80.2496', '5.1', '14.2', 'clear', 'active', new Date().toISOString()],
    ]);

    // ── notifications ────────────────────────────────────────────────
    await setSheet(sheets, 'notifications', [
        ['id', 'type', 'emergency_id', 'hospital_id', 'ambulance_id', 'message', 'sent_at', 'acknowledged'],
        ['1', 'ambulance_dispatch', '2', '', '3', 'Ambulance KA-01-AMB-003 dispatched to Accident on Whitefield Main Rd', new Date().toISOString(), 'false'],
        ['2', 'hospital_alert', '2', '3', '', 'ALERT: Accident patient incoming. ETA: 8 min.', new Date().toISOString(), 'false'],
        ['3', 'hospital_alert', '3', '1', '', 'ALERT: Stroke patient incoming. ICU prep required. ETA: 14 min.', new Date().toISOString(), 'false'],
    ]);

    // ── contacts (family members) ────────────────────────────────────
    await setSheet(sheets, 'contacts', [
        ['id', 'emergency_id', 'name', 'relation', 'phone', 'notified', 'created_at'],
        ['1', '1', 'Ramesh P', 'Brother', '+91-9800000001', 'false', new Date().toISOString()],
        ['2', '1', 'Meena P', 'Wife', '+91-9800000002', 'false', new Date().toISOString()],
        ['3', '2', 'Arjun S', 'Father', '+91-9800000003', 'false', new Date().toISOString()],
        ['4', '3', 'Priya D', 'Daughter', '+91-9800000004', 'false', new Date().toISOString()],
    ]);

    console.log('\n🎉  All sheets seeded successfully!');
    console.log('👉  Now run: node server.js\n');
}

seed().catch(err => {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
});
