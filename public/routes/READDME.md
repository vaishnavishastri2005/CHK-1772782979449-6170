🚑 Emergency Response System

Real-time Emergency Response System with smart ambulance allocation, traffic routing, hospital coordination, and future AI dashboard.

--------------------------------------------------

Project Structure

ambulance/
├── server.js
├── db.js
├── package.json
├── .env
├── schema.sql
├── seed.sql
├── routes/
│   ├── emergency.js
│   ├── ambulance.js
│   └── hospital.js
└── public/
    ├── index.html
    ├── report.html
    ├── ambulance.html
    ├── hospital.html
    ├── impact.html
    ├── future.html
    ├── css/style.css
    └── js/app.js

--------------------------------------------------

Quick Start

1. Setup Database
source schema.sql
source seed.sql

2. Configure Environment

DB_PASSWORD=your_mysql_password

3. Install Dependencies
npm install

4. Start Server
npm run dev
or
npm start

5. Open in Browser
http://localhost:3000

--------------------------------------------------

API Endpoints

GET    /api/emergencies
POST   /api/emergencies
PUT    /api/emergencies/:id/status

GET    /api/ambulances
POST   /api/ambulances/assign
PUT    /api/ambulances/:id/location

GET    /api/hospitals
POST   /api/hospitals/:id/alert
PUT    /api/hospitals/:id/beds

GET    /api/health

--------------------------------------------------

Frontend Pages

/                 Dashboard
/report.html      Report Emergency
/ambulance.html   Ambulance Routing
/hospital.html    Hospital Coordination
/impact.html      Impact & Benefits
/future.html      Future AI Vision

--------------------------------------------------

Database Tables

users
emergencies
ambulances
hospitals
routes
notifications

--------------------------------------------------

WebSocket Events

new_emergency
emergency_status_update
ambulance_dispatched
ambulance_location_update
hospital_alert
hospital_update

--------------------------------------------------

Tech Stack

Backend: Node.js, Express, WebSocket  
Database: MySQL  
Frontend: HTML, CSS, JavaScript  
Algorithm: Haversine (nearest ambulance)