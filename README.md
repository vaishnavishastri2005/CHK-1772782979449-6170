# 🚑 Emergency Response System

A **Real-Time Emergency Response System** with smart ambulance allocation, traffic routing, hospital coordination, and a future AI dashboard.

> Built with Node.js, Express, WebSocket, MySQL, and vanilla HTML/CSS/JavaScript.

---

## 📁 Project Structure

```
hospital/
├── server.js               # Express + WebSocket server
├── db.js                    # MySQL database connection
├── package.json             # Dependencies
├── schema.sql               # Database schema
├── seed.sql                 # Seed data
├── .env                     # Environment variables (not pushed)
├── .gitignore
├── README.md
├── routes/
│   ├── emergency.js         # Emergency API routes
│   ├── ambulance.js         # Ambulance API routes
│   └── hospital.js          # Hospital API routes
└── public/
    ├── index.html           # Main Dashboard
    ├── report.html          # Report Emergency
    ├── css/
    │   └── style.css        # Stylesheet
    └── js/
        └── app.js           # Frontend JavaScript
```

---

## ⚡ Quick Start

### 1. Setup Database
```sql
source schema.sql;
source seed.sql;
```

### 2. Configure Environment
Create a `.env` file in the root folder:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=emergency_response
PORT=3000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Server
```bash
npm run dev
# or
npm start
```

### 5. Open in Browser
```
http://localhost:3000
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emergencies` | Get all emergencies |
| POST | `/api/emergencies` | Report new emergency |
| PUT | `/api/emergencies/:id/status` | Update emergency status |
| GET | `/api/ambulances` | Get all ambulances |
| POST | `/api/ambulances/assign` | Assign ambulance |
| PUT | `/api/ambulances/:id/location` | Update location |
| GET | `/api/hospitals` | Get all hospitals |
| POST | `/api/hospitals/:id/alert` | Alert hospital |
| PUT | `/api/hospitals/:id/beds` | Update bed count |
| GET | `/api/health` | Health check |

---

## 📄 Frontend Pages

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/report.html` | Report Emergency |

---

## 🗄️ Database Tables

- `users`
- `emergencies`
- `ambulances`
- `hospitals`
- `routes`
- `notifications`

---

## 🔌 WebSocket Events

- `new_emergency`
- `emergency_status_update`
- `ambulance_dispatched`
- `ambulance_location_update`
- `hospital_alert`
- `hospital_update`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Real-time | WebSocket (ws) |
| Database | MySQL |
| Frontend | HTML5, CSS3, JavaScript |
| Algorithm | Haversine (nearest ambulance) |

---

## 📜 License

MIT License — feel free to use and modify.
