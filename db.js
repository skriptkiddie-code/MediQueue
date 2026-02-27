const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "triage.db");

const seedDiseases = [
  {
    disease: "Acute Coronary Syndrome",
    specialty: "Cardiology",
    redFlag: 1,
    symptoms: ["Chest Pain", "Shortness of Breath", "Nausea/Vomiting", "Fatigue", "Palpitations"],
  },
  {
    disease: "Pulmonary Embolism",
    specialty: "Pulmonology",
    redFlag: 1,
    symptoms: ["Chest Pain", "Shortness of Breath", "Dizziness", "Palpitations"],
  },
  {
    disease: "Asthma Exacerbation",
    specialty: "Pulmonology",
    redFlag: 0,
    symptoms: ["Shortness of Breath", "Cough", "Chest Pain", "Fatigue"],
  },
  {
    disease: "Community-Acquired Pneumonia",
    specialty: "Pulmonology",
    redFlag: 0,
    symptoms: ["Fever", "Cough", "Shortness of Breath", "Fatigue", "Chest Pain"],
  },
  {
    disease: "Migraine",
    specialty: "Neurology",
    redFlag: 0,
    symptoms: ["Severe Headache", "Nausea/Vomiting", "Dizziness"],
  },
  {
    disease: "Possible Stroke",
    specialty: "Neurology",
    redFlag: 1,
    symptoms: ["Severe Headache", "Dizziness", "Chest Pain"],
  },
  {
    disease: "Gastroenteritis",
    specialty: "Internal Medicine",
    redFlag: 0,
    symptoms: ["Fever", "Nausea/Vomiting", "Abdominal Pain", "Fatigue"],
  },
  {
    disease: "Acute Appendicitis",
    specialty: "General Surgery",
    redFlag: 1,
    symptoms: ["Abdominal Pain", "Fever", "Nausea/Vomiting"],
  },
  {
    disease: "Upper Respiratory Tract Infection",
    specialty: "Internal Medicine",
    redFlag: 0,
    symptoms: ["Fever", "Cough", "Sore Throat", "Fatigue"],
  },
  {
    disease: "Cardiac Arrhythmia",
    specialty: "Cardiology",
    redFlag: 1,
    symptoms: ["Palpitations", "Dizziness", "Chest Pain", "Shortness of Breath"],
  },
  {
    disease: "Malaria",
    specialty: "Internal Medicine",
    redFlag: 1,
    symptoms: ["Fever", "Chills", "Sweating", "Headache", "Fatigue", "Nausea/Vomiting"],
  },
  {
    disease: "Typhoid Fever",
    specialty: "Internal Medicine",
    redFlag: 1,
    symptoms: ["Fever", "Abdominal Pain", "Headache", "Fatigue", "Diarrhea", "Nausea/Vomiting"],
  },
  {
    disease: "Cholera",
    specialty: "Internal Medicine",
    redFlag: 1,
    symptoms: ["Watery Diarrhea", "Vomiting", "Dehydration", "Abdominal Cramps", "Fatigue"],
  },
  {
    disease: "Acute Infectious Diarrhea",
    specialty: "Internal Medicine",
    redFlag: 0,
    symptoms: ["Diarrhea", "Abdominal Pain", "Fever", "Nausea/Vomiting", "Dehydration"],
  },
  {
    disease: "Dengue Fever",
    specialty: "Internal Medicine",
    redFlag: 1,
    symptoms: ["High Fever", "Severe Headache", "Muscle Pain", "Joint Pain", "Nausea/Vomiting", "Fatigue"],
  },
  {
    disease: "Tuberculosis (Pulmonary)",
    specialty: "Pulmonology",
    redFlag: 1,
    symptoms: ["Cough", "Fever", "Weight Loss", "Night Sweats", "Chest Pain", "Fatigue"],
  },
];

let db;

async function initializeDatabase() {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS diseases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disease TEXT NOT NULL UNIQUE,
      specialty TEXT NOT NULL,
      red_flag INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS disease_symptoms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disease_id INTEGER NOT NULL,
      symptom TEXT NOT NULL,
      UNIQUE(disease_id, symptom),
      FOREIGN KEY(disease_id) REFERENCES diseases(id)
    );

    CREATE TABLE IF NOT EXISTS triage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      selected_symptoms TEXT NOT NULL,
      urgency_label TEXT NOT NULL,
      urgency_score INTEGER NOT NULL,
      assigned_doctor TEXT NOT NULL,
      assigned_specialty TEXT NOT NULL,
      likely_conditions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await syncSeedDiseases();

  return db;
}

async function syncSeedDiseases() {
  for (const entry of seedDiseases) {
    const existing = await db.get("SELECT id FROM diseases WHERE disease = ?", [entry.disease]);
    let diseaseId;

    if (existing) {
      diseaseId = existing.id;
      await db.run("UPDATE diseases SET specialty = ?, red_flag = ? WHERE id = ?", [
        entry.specialty,
        entry.redFlag,
        diseaseId,
      ]);
      await db.run("DELETE FROM disease_symptoms WHERE disease_id = ?", [diseaseId]);
    } else {
      const inserted = await db.run(
        "INSERT INTO diseases (disease, specialty, red_flag) VALUES (?, ?, ?)",
        [entry.disease, entry.specialty, entry.redFlag]
      );
      diseaseId = inserted.lastID;
    }

    const uniqueSymptoms = [...new Set(entry.symptoms)];
    for (const symptom of uniqueSymptoms) {
      await db.run("INSERT INTO disease_symptoms (disease_id, symptom) VALUES (?, ?)", [diseaseId, symptom]);
    }
  }
}

module.exports = {
  initializeDatabase,
};
