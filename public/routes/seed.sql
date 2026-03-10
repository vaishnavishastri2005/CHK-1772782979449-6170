USE emergency_response;

INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Admin User','admin@ers.com','$2b$10$hash_admin','admin','+91-9000000001'),
('Ravi Dispatcher','ravi@ers.com','$2b$10$hash_ravi','dispatcher','+91-9000000002'),
('Meera Hospital','meera@apollo.com','$2b$10$hash_meera','hospital_staff','+91-9000000003'),
('Test Reporter','test@ers.com','$2b$10$hash_test','reporter','+91-9000000004');

INSERT INTO hospitals (name, address, latitude, longitude, phone, total_beds, available_beds, icu_beds, available_icu_beds, has_trauma_center, has_cardiac_unit, has_neuro_unit) VALUES
('Apollo Hospitals','21 Greams Rd, Chennai',13.0604,80.2496,'+91-44-28293333',300,45,30,8,TRUE,TRUE,TRUE),
('AIIMS Delhi','Ansari Nagar East, New Delhi',28.5672,77.2100,'+91-11-26588500',500,72,60,12,TRUE,TRUE,TRUE),
('Fortis Hospitals','Cunningham Rd, Bengaluru',12.9916,77.5946,'+91-80-66214444',250,30,25,5,FALSE,TRUE,FALSE),
('Manipal Hospital','HAL Airport Rd, Bengaluru',12.9592,77.6480,'+91-80-40055000',200,55,20,10,TRUE,FALSE,TRUE);

INSERT INTO ambulances (vehicle_number, driver_name, driver_phone, current_latitude, current_longitude, status) VALUES
('KA-01-AMB-001','Suresh Kumar','+91-9111111101',12.9716,77.5946,'available'),
('KA-01-AMB-002','Priya Menon','+91-9111111102',12.9800,77.6100,'available'),
('KA-01-AMB-003','Anil Singh','+91-9111111103',12.9500,77.5700,'en_route'),
('KA-01-AMB-004','Deepak Rao','+91-9111111104',13.0100,77.5900,'available'),
('KA-01-AMB-005','Sunita Devi','+91-9111111105',12.9600,77.6300,'available');

INSERT INTO emergencies (patient_name, emergency_type, severity, description, latitude, longitude, address, status, reported_by) VALUES
('Rajesh P','Heart Attack',5,'Patient collapsed on road, unresponsive',12.9716,77.5946,'MG Road, Bengaluru','pending',4),
('Kavya S','Accident',4,'Road accident, multiple injuries',12.9800,77.6100,'Whitefield Main Rd','dispatched',4),
('Mohan D','Stroke',5,'Sudden paralysis, slurred speech',12.9500,77.5700,'Indiranagar 100ft Road','en_route',4);

INSERT INTO routes (emergency_id, ambulance_id, hospital_id, origin_lat, origin_lng, destination_lat, destination_lng, estimated_distance_km, estimated_duration_min, traffic_condition) VALUES
(2,3,3,12.9800,77.6100,12.9916,77.5946,2.4,8.5,'moderate'),
(3,1,1,12.9500,77.5700,13.0604,80.2496,5.1,14.2,'clear');

INSERT INTO notifications (type, emergency_id, hospital_id, ambulance_id, message) VALUES
('ambulance_dispatch',2,NULL,3,'Ambulance KA-01-AMB-003 dispatched to Accident on Whitefield Main Rd'),
('hospital_alert',2,3,NULL,'ALERT: Accident patient incoming. Prepare Emergency Bay. ETA: 8 min.'),
('hospital_alert',3,1,NULL,'ALERT: Stroke patient incoming with cardiac symptoms. ICU prep required. ETA: 14 min.');