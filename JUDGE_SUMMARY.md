# MediQueue AI — Judge Summary (One Page)

## Problem
Emergency and outpatient intake often relies on manual first-come-first-served handling, which can delay high-risk patients.

## Solution
MediQueue AI is a **clinical prioritization and doctor allocation dashboard** that:
- Accepts patient signs/symptoms
- Estimates urgency level (Urgent / Priority / Standard)
- Suggests likely conditions for reference
- Assigns an appropriate specialist
- Maintains a live urgency-ordered queue

## How It Works (Architecture)
- **Frontend**: HTML/CSS/Vanilla JavaScript dashboard
- **Backend**: Node.js + Express REST API
- **Database**: SQLite (`triage.db`)
- **Security**: HTTP Basic Auth on admin routes (`/admin.html`, `/api/admin/*`)

Flow:
1. User selects symptoms and submits
2. Backend matches symptom patterns against disease knowledge base
3. System computes urgency + specialist assignment
4. Result is saved in database
5. Queue displays patients sorted by urgency

## Core Features
- Real-time urgency scoring
- Automatic specialist allocation by likely specialty
- Differential condition suggestions (reference only)
- Queue sorted by urgency and arrival order
- Admin panel to add/edit disease-symptom rules
- Queue reset capability for fresh demos

## Data & Clinical Scope
- Includes globally common and local-relevance conditions such as:
  - Malaria
  - Typhoid Fever
  - Cholera
  - Acute Infectious Diarrhea
  - Dengue Fever
  - Tuberculosis (Pulmonary)
- Knowledge base is editable from the protected admin console.

## Innovation Highlights
- Combines **clinical rule logic + queue optimization** in one lightweight stack
- Fully local, offline-capable demo (no cloud dependency required)
- End-to-end transparency: symptoms → urgency → assignment → persisted queue

## Safety Note
This is a **decision-support prototype**, not a medical diagnostic device. Final diagnosis and treatment decisions must be made by qualified clinicians.

## Demo Script (90–120s)
1. Open dashboard and show clean urgency queue (initially empty)
2. Run **Critical Case** scenario → show urgent patient to top of queue
3. Run **Mild Case** scenario → show lower-priority placement
4. Open admin page, edit/add a disease rule, save
5. Return to dashboard and re-run to show live rule impact

## Technical Snapshot
- Runtime: Node.js
- API: Express
- DB: SQLite (`sqlite`, `sqlite3`)
- UI: HTML/CSS/Vanilla JS
- Auth: HTTP Basic Auth via env vars (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
