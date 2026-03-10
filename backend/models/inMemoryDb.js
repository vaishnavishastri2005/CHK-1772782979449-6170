// In-Memory Database for Emergency Response System
// Stores emergencies, ambulances, and their statuses in memory.

let emergencies = [];
let ambulances = [
    { ambulance_id: 'AMB-001', latitude: 28.6139, longitude: 77.2090, status: 'available', driver: 'Ravi Kumar', vehicle: 'MH-01-AB-1234' },
    { ambulance_id: 'AMB-002', latitude: 28.7041, longitude: 77.1025, status: 'available', driver: 'Suresh Singh', vehicle: 'MH-02-CD-5678' },
    { ambulance_id: 'AMB-003', latitude: 28.4595, longitude: 77.0266, status: 'available', driver: 'Priya Sharma', vehicle: 'MH-03-EF-9012' },
    { ambulance_id: 'AMB-004', latitude: 28.5355, longitude: 77.3910, status: 'on_duty', driver: 'Anil Verma', vehicle: 'MH-04-GH-3456' },
    { ambulance_id: 'AMB-005', latitude: 28.6560, longitude: 77.2415, status: 'available', driver: 'Meena Patel', vehicle: 'MH-05-IJ-7890' },
];

let emergencyIdCounter = 1;

module.exports = {
    // --- Emergencies ---
    getEmergencies: () => emergencies,

    addEmergency: ({ latitude, longitude, emergencyType, timestamp }) => {
        const record = {
            id: emergencyIdCounter++,
            latitude,
            longitude,
            emergencyType,
            timestamp: timestamp || new Date().toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
        emergencies.push(record);
        return record;
    },

    // --- Ambulances ---
    getAmbulances: () => ambulances,

    getAvailableAmbulances: () => ambulances.filter(a => a.status === 'available'),

    updateAmbulanceLocation: (ambulance_id, latitude, longitude, status) => {
        const amb = ambulances.find(a => a.ambulance_id === ambulance_id);
        if (!amb) return null;
        amb.latitude = latitude;
        amb.longitude = longitude;
        if (status) amb.status = status;
        amb.lastUpdated = new Date().toISOString();
        return amb;
    },

    addAmbulance: (data) => {
        const existing = ambulances.find(a => a.ambulance_id === data.ambulance_id);
        if (existing) return null; // already exists, use update instead
        const record = { ...data, lastUpdated: new Date().toISOString() };
        ambulances.push(record);
        return record;
    },
};
