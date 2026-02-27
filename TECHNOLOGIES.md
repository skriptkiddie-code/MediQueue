# Project Technology Documentation

## 1) Runtime & Platform

- **Node.js**
  - Purpose: Runs the backend API server.
  - Where used: [server.js](server.js), [package.json](package.json)
  - Start command: `npm start`

- **PowerShell (local ops)**
  - Purpose: Local testing and API smoke checks during development.
  - Where used: Terminal commands (not part of application runtime).

## 2) Backend Technologies

- **Express.js (`express` ^4.21.2)**
  - Purpose: HTTP server, route handling, static file hosting, JSON request parsing.
  - Key usage:
    - `app.use(express.json())`
    - Static hosting for UI files
    - REST endpoints for symptoms, triage, queue, logs, and admin CRUD
  - Where used: [server.js](server.js)

- **REST API Design (JSON over HTTP)**
  - Purpose: Connects frontend dashboard to backend decision and database operations.
  - Core endpoints:
    - `GET /api/symptoms`
    - `POST /api/triage`
    - `GET /api/queue`
    - `DELETE /api/queue`
    - `GET /api/logs`
    - `GET /api/admin/diseases`
    - `POST /api/admin/diseases`
    - `PUT /api/admin/diseases/:id`
  - Where used: [server.js](server.js), [app.js](app.js), [admin.js](admin.js)

- **HTTP Basic Authentication**
  - Purpose: Protects admin page and admin APIs with username/password.
  - Protected resources:
    - `/admin.html`
    - `/admin.js`
    - `/api/admin/*`
  - Configuration:
    - `ADMIN_USERNAME`
    - `ADMIN_PASSWORD`
  - Where used: [server.js](server.js), [README.md](README.md)

## 3) Database Technologies

- **SQLite (embedded relational database)**
  - Purpose: Persistent local storage for disease knowledge base and queue/log data.
  - Database file: `triage.db`
  - Where used: [db.js](db.js)

- **`sqlite` (^5.1.1) + `sqlite3` (^5.1.7)**
  - Purpose:
    - `sqlite`: Promise-based API wrapper.
    - `sqlite3`: Native SQLite driver.
  - Where used: [db.js](db.js), [package.json](package.json)

- **Relational schema**
  - Tables:
    - `diseases`
    - `disease_symptoms`
    - `triage_logs`
  - Purpose:
    - disease catalog + symptoms
    - many-to-one symptom mapping
    - persisted prioritization queue history
  - Where used: [db.js](db.js)

- **Seed synchronization strategy (idempotent upsert-like sync)**
  - Purpose: Ensure seed data is applied even when DB already exists.
  - Behavior: Updates existing disease metadata and rewrites mapped symptoms.
  - Where used: [db.js](db.js)

## 4) Frontend Technologies

- **HTML5**
  - Purpose: Dashboard structure and semantic layout.
  - Views:
    - Main dashboard: [index.html](index.html)
    - Admin panel: [admin.html](admin.html)

- **CSS3 (custom, no external framework)**
  - Purpose: Dark neon visual theme, responsive grid layout, status/urgency visuals.
  - Where used: [styles.css](styles.css)

- **Vanilla JavaScript (ES6+)**
  - Purpose:
    - Fetch data from API
    - Render symptoms and urgency queue
    - Run prioritization workflow
    - Reset queue
    - Scenario shortcuts
  - Where used:
    - Main UI logic: [app.js](app.js)
    - Admin UI logic: [admin.js](admin.js)

- **Fetch API**
  - Purpose: Client-side HTTP requests to backend endpoints.
  - Where used: [app.js](app.js), [admin.js](admin.js)

## 5) Application Logic Technologies

- **Rule-based Clinical Prioritization Engine**
  - Purpose: Scores urgency from matched disease/symptom patterns.
  - Logic highlights:
    - Differential ranking by symptom overlap and confidence
    - Red-flag weighting
    - Urgency score mapping (Urgent/Priority/Standard)
  - Where used: [server.js](server.js)

- **Doctor Allocation Mapping**
  - Purpose: Assigns doctor by likely condition specialty.
  - Where used: [server.js](server.js)

- **Queue Ordering Strategy**
  - Purpose: Prioritizes patient queue display by urgency.
  - Sort order:
    1. `urgency_score DESC`
    2. `created_at ASC`
    3. `id ASC`
  - Where used: [server.js](server.js) (`GET /api/queue`)

## 6) Security & Configuration

- **Environment Variables**
  - Purpose: Runtime configuration for security and deployment.
  - Variables:
    - `PORT`
    - `ADMIN_USERNAME`
    - `ADMIN_PASSWORD`
  - Where used: [server.js](server.js), [README.md](README.md)

## 7) Package Management

- **npm**
  - Purpose: Dependency management and app execution.
  - Scripts:
    - `npm install`
    - `npm start`
  - Where used: [package.json](package.json)

## 8) What is NOT used (important for judges)

- No frontend framework (React/Vue/Angular)
- No ORM (Prisma/Sequelize/TypeORM)
- No external hosted DB dependency (runs locally on SQLite)
- No cloud vendor lock-in required for local demo

## 9) Current Architecture Summary

- **Client**: Browser UI (HTML/CSS/Vanilla JS)
- **Server**: Node.js + Express API
- **Storage**: SQLite local file (`triage.db`)
- **Security**: Basic Auth on admin routes
- **Flow**:
  1. User selects symptoms in UI
  2. Frontend calls backend API
  3. Backend ranks likely conditions + computes urgency + assigns doctor
  4. Result is persisted to DB
  5. Queue UI displays urgency-ordered patients
