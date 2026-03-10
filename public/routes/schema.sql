CREATE DATABASE IF NOT EXISTS emergency_response;
USE emergency_response;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('reporter','dispatcher','hospital_staff','admin') DEFAULT 'reporter',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    emergency_type ENUM('Accident','Heart Attack','Stroke','Fire','Drowning','Trauma','Other') NOT NULL,
    severity TINYINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    description TEXT,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    address VARCHAR(255),
    status ENUM('pending','dispatched','en_route','arrived','resolved','cancelled') DEFAULT 'pending',
    reported_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ambulances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20),
    current_latitude DECIMAL(10,7),
    current_longitude DECIMAL(10,7),
    status ENUM('available','en_route','busy','maintenance') DEFAULT 'available',
    assigned_emergency_id INT DEFAULT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_emergency_id) REFERENCES emergencies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hospitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    phone VARCHAR(20),
    total_beds INT DEFAULT 0,
    available_beds INT DEFAULT 0,
    icu_beds INT DEFAULT 0,
    available_icu_beds INT DEFAULT 0,
    has_trauma_center BOOLEAN DEFAULT FALSE,
    has_cardiac_unit BOOLEAN DEFAULT FALSE,
    has_neuro_unit BOOLEAN DEFAULT FALSE,
    on_alert BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emergency_id INT NOT NULL,
    ambulance_id INT NOT NULL,
    hospital_id INT NOT NULL,
    origin_lat DECIMAL(10,7),
    origin_lng DECIMAL(10,7),
    destination_lat DECIMAL(10,7),
    destination_lng DECIMAL(10,7),
    estimated_distance_km DECIMAL(8,2),
    estimated_duration_min DECIMAL(6,2),
    traffic_condition ENUM('clear','moderate','heavy') DEFAULT 'clear',
    route_status ENUM('active','completed','cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('hospital_alert','ambulance_dispatch','emergency_resolved','status_update') NOT NULL,
    emergency_id INT,
    hospital_id INT DEFAULT NULL,
    ambulance_id INT DEFAULT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(id) ON DELETE SET NULL
);

CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_notifications_emergency ON notifications(emergency_id);
CREATE INDEX idx_routes_emergency ON routes(emergency_id);