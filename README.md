# Agentic AI Clinical Prioritization & Allocation - Demo Mockup

This is a **simple web mockup with a real backend database** for presenting the sequence workflow to judges.

It includes a SQLite disease-symptom knowledge base for **clinical prioritization support and likely-condition suggestions**.

## What this includes

- Interactive simulation of the workflow actors:
  - Patient (P)
  - Intake Agent (IA)
  - Prioritization Agent (TA)
  - Allocation Agent (AA)
  - Medical Doctor (MD)
- Editable scenario input (signs/symptoms only)
- Step-by-step timeline playback
- Mock outputs:
  - Auto-calculated urgency level
  - Auto-assigned doctor/specialty
  - Top likely conditions from symptom matching
  - Patient alert message
  - Persisted prioritization logs from the database
  - Live admin panel to add/edit disease-symptom mappings

## Clinical knowledge base

- Disease/symptom reference data is seeded into SQLite via `db.js`.
- Matching engine compares selected symptoms against known disease symptom sets.
- Output is a ranked differential suggestion with confidence percentages.
- This is **not** a final diagnosis engine and should not be used for clinical decisions.

## Run locally

This version uses a Node.js API and SQLite database.

1. Install Node.js (v18+ recommended).
2. In this folder, run:

```bash
npm install
npm start
```

3. Open `http://localhost:3000`.

The app will create `triage.db` automatically on first run.

### Admin authentication credentials

The admin panel and admin APIs are protected with HTTP Basic Auth.

- `ADMIN_USERNAME` (default: `admin`)
- `ADMIN_PASSWORD` (default: `admin123`)

Set custom credentials before starting the app (PowerShell example):

```powershell
$env:ADMIN_USERNAME="judgeadmin"
$env:ADMIN_PASSWORD="StrongPass!2026"
npm start
```

## Admin panel

- Open `http://localhost:3000/admin.html`
- Add a new disease with specialty, red-flag toggle, and symptom list.
- Click **Edit** on an existing disease to update it.
- Changes are saved directly to SQLite and used immediately by prioritization logic.

## Host for judges

### GitHub Pages (quickest)

Because this version includes a backend API, use a full host (Render/Railway/Azure App Service) instead of GitHub Pages.

### Render or Railway (recommended)

1. Push this folder to a GitHub repository.
2. Create a new Web Service in Render/Railway from the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Share the deployed URL with judges.

## Suggested demo script (2-3 min)

1. Start with symptom `Chest Pain` (and optionally `Shortness of Breath`).
2. Click **Run Workflow**.
3. Narrate each lane transition (IA -> TA -> AA -> MD).
4. Highlight:
  - System-calculated urgency from symptoms
  - Automatic doctor assignment by specialty fit
   - Auto-generated patient alert
5. Change to low-risk symptoms (e.g., only `Fever`) and rerun to show dynamic prioritization.

## Notes

- This is intentionally lightweight and not a medical device.
- The scoring logic is mock logic for presentation only.
