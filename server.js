const path = require("path");
const express = require("express");
const { initializeDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function parseBasicAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  const base64 = authHeader.slice(6).trim();
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function requireAdminAuth(req, res, next) {
  const credentials = parseBasicAuthHeader(req.headers.authorization);

  if (!credentials || credentials.username !== ADMIN_USERNAME || credentials.password !== ADMIN_PASSWORD) {
    res.set("WWW-Authenticate", 'Basic realm="MediQueue Admin"');
    return res.status(401).json({ message: "Admin authentication required." });
  }

  next();
}

app.use(express.json());
app.use(["/admin.html", "/admin.js", "/api/admin"], requireAdminAuth);
app.use(express.static(__dirname));

const doctorBySpecialty = {
  Cardiology: "Dr. Smith",
  Pulmonology: "Dr. Ahmed",
  Neurology: "Dr. Rao",
  "General Surgery": "Dr. Kim",
  "Internal Medicine": "Dr. Li",
};

function normalizeSymptoms(rawSymptoms) {
  const asArray = Array.isArray(rawSymptoms)
    ? rawSymptoms
    : String(rawSymptoms || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(asArray.map((item) => item.trim()).filter(Boolean))];
}

async function getDiseaseCatalog(db) {
  const rows = await db.all(
    `SELECT d.id, d.disease, d.specialty, d.red_flag, ds.symptom
     FROM diseases d
     LEFT JOIN disease_symptoms ds ON ds.disease_id = d.id
     ORDER BY d.disease ASC, ds.symptom ASC`
  );

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        disease: row.disease,
        specialty: row.specialty,
        redFlag: row.red_flag === 1,
        symptoms: [],
      });
    }

    if (row.symptom) {
      grouped.get(row.id).symptoms.push(row.symptom);
    }
  }

  return [...grouped.values()];
}

function computeUrgency(likelyConditions, symptoms) {
  const topCondition = likelyConditions[0];
  const symptomCount = symptoms.length;

  if (topCondition?.redFlag && symptomCount >= 2) {
    return { score: 5, label: "Urgent", className: "priority-high" };
  }
  if (symptomCount >= 3 || (topCondition?.confidence || 0) >= 50) {
    return { score: 3, label: "Priority", className: "priority-medium" };
  }
  return { score: 1, label: "Standard", className: "priority-low" };
}

function rankConditions(diseaseRows, selectedSymptoms) {
  const grouped = new Map();

  for (const row of diseaseRows) {
    if (!grouped.has(row.disease)) {
      grouped.set(row.disease, {
        disease: row.disease,
        specialty: row.specialty,
        redFlag: row.red_flag === 1,
        symptoms: [],
      });
    }
    grouped.get(row.disease).symptoms.push(row.symptom);
  }

  return [...grouped.values()]
    .map((entry) => {
      const matchedSymptoms = entry.symptoms.filter((symptom) => selectedSymptoms.includes(symptom));
      const coverage = matchedSymptoms.length / Math.max(entry.symptoms.length, 1);
      const confidence = Math.round(coverage * 100);
      const score = matchedSymptoms.length + (entry.redFlag && matchedSymptoms.length > 1 ? 1 : 0);

      return {
        disease: entry.disease,
        specialty: entry.specialty,
        redFlag: entry.redFlag,
        matchedSymptoms,
        confidence,
        score,
      };
    })
    .filter((entry) => entry.matchedSymptoms.length > 0)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 3);
}

app.get("/api/symptoms", async (req, res) => {
  const db = await initializeDatabase();
  const rows = await db.all("SELECT DISTINCT symptom FROM disease_symptoms ORDER BY symptom ASC");
  res.json(rows.map((row) => row.symptom));
});

app.get("/api/admin/diseases", async (req, res) => {
  const db = await initializeDatabase();
  const catalog = await getDiseaseCatalog(db);
  res.json(catalog);
});

app.post("/api/admin/diseases", async (req, res) => {
  const db = await initializeDatabase();

  const disease = String(req.body.disease || "").trim();
  const specialty = String(req.body.specialty || "").trim();
  const redFlag = req.body.redFlag ? 1 : 0;
  const symptoms = normalizeSymptoms(req.body.symptoms);

  if (!disease || !specialty || symptoms.length === 0) {
    return res.status(400).json({ message: "Disease, specialty, and at least one symptom are required." });
  }

  try {
    await db.exec("BEGIN TRANSACTION");
    const inserted = await db.run("INSERT INTO diseases (disease, specialty, red_flag) VALUES (?, ?, ?)", [
      disease,
      specialty,
      redFlag,
    ]);

    for (const symptom of symptoms) {
      await db.run("INSERT INTO disease_symptoms (disease_id, symptom) VALUES (?, ?)", [inserted.lastID, symptom]);
    }

    await db.exec("COMMIT");
    res.status(201).json({ message: "Disease added successfully." });
  } catch (error) {
    await db.exec("ROLLBACK");
    if (String(error.message || "").includes("UNIQUE constraint failed: diseases.disease")) {
      return res.status(409).json({ message: "Disease already exists." });
    }
    res.status(500).json({ message: "Failed to add disease." });
  }
});

app.put("/api/admin/diseases/:id", async (req, res) => {
  const db = await initializeDatabase();
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid disease id." });
  }

  const disease = String(req.body.disease || "").trim();
  const specialty = String(req.body.specialty || "").trim();
  const redFlag = req.body.redFlag ? 1 : 0;
  const symptoms = normalizeSymptoms(req.body.symptoms);

  if (!disease || !specialty || symptoms.length === 0) {
    return res.status(400).json({ message: "Disease, specialty, and at least one symptom are required." });
  }

  try {
    await db.exec("BEGIN TRANSACTION");

    const existing = await db.get("SELECT id FROM diseases WHERE id = ?", [id]);
    if (!existing) {
      await db.exec("ROLLBACK");
      return res.status(404).json({ message: "Disease not found." });
    }

    await db.run("UPDATE diseases SET disease = ?, specialty = ?, red_flag = ? WHERE id = ?", [
      disease,
      specialty,
      redFlag,
      id,
    ]);

    await db.run("DELETE FROM disease_symptoms WHERE disease_id = ?", [id]);
    for (const symptom of symptoms) {
      await db.run("INSERT INTO disease_symptoms (disease_id, symptom) VALUES (?, ?)", [id, symptom]);
    }

    await db.exec("COMMIT");
    res.json({ message: "Disease updated successfully." });
  } catch (error) {
    await db.exec("ROLLBACK");
    if (String(error.message || "").includes("UNIQUE constraint failed: diseases.disease")) {
      return res.status(409).json({ message: "Another disease already has this name." });
    }
    res.status(500).json({ message: "Failed to update disease." });
  }
});

app.post("/api/triage", async (req, res) => {
  const db = await initializeDatabase();
  const patientName = String(req.body.patientName || "Unknown Patient").trim() || "Unknown Patient";
  const symptoms = Array.isArray(req.body.symptoms)
    ? req.body.symptoms.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (symptoms.length === 0) {
    return res.status(400).json({ message: "At least one symptom is required." });
  }

  const diseaseRows = await db.all(
    `SELECT d.disease, d.specialty, d.red_flag, ds.symptom
     FROM diseases d
     JOIN disease_symptoms ds ON ds.disease_id = d.id`
  );

  const likelyConditions = rankConditions(diseaseRows, symptoms);
  const urgency = computeUrgency(likelyConditions, symptoms);

  const topSpecialty = likelyConditions[0]?.specialty || "Internal Medicine";
  const assignedDoctor = doctorBySpecialty[topSpecialty] || "Dr. Li";

  await db.run(
    `INSERT INTO triage_logs (
      patient_name,
      selected_symptoms,
      urgency_label,
      urgency_score,
      assigned_doctor,
      assigned_specialty,
      likely_conditions
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      patientName,
      JSON.stringify(symptoms),
      urgency.label,
      urgency.score,
      assignedDoctor,
      topSpecialty,
      JSON.stringify(likelyConditions),
    ]
  );

  res.json({
    patientName,
    symptoms,
    urgency,
    assignment: {
      doctor: assignedDoctor,
      specialty: topSpecialty,
    },
    likelyConditions,
    disclaimer: "Triage support only. Not a confirmed medical diagnosis.",
  });
});

app.get("/api/logs", async (req, res) => {
  const db = await initializeDatabase();
  const rows = await db.all(
    `SELECT id, patient_name, selected_symptoms, urgency_label, urgency_score,
            assigned_doctor, assigned_specialty, likely_conditions, created_at
     FROM triage_logs
     ORDER BY id DESC
     LIMIT 20`
  );

  const parsed = rows.map((row) => ({
    id: row.id,
    patientName: row.patient_name,
    selectedSymptoms: JSON.parse(row.selected_symptoms),
    urgencyLabel: row.urgency_label,
    urgencyScore: row.urgency_score,
    assignedDoctor: row.assigned_doctor,
    assignedSpecialty: row.assigned_specialty,
    likelyConditions: JSON.parse(row.likely_conditions),
    createdAt: row.created_at,
  }));

  res.json(parsed);
});

app.get("/api/queue", async (req, res) => {
  const db = await initializeDatabase();
  const rows = await db.all(
    `SELECT id, patient_name, selected_symptoms, urgency_label, urgency_score,
            assigned_doctor, assigned_specialty, likely_conditions, created_at
     FROM triage_logs
     ORDER BY urgency_score DESC, datetime(created_at) ASC, id ASC
     LIMIT 30`
  );

  const queue = rows.map((row, index) => ({
    queuePosition: index + 1,
    id: row.id,
    patientName: row.patient_name,
    selectedSymptoms: JSON.parse(row.selected_symptoms),
    urgencyLabel: row.urgency_label,
    urgencyScore: row.urgency_score,
    assignedDoctor: row.assigned_doctor,
    assignedSpecialty: row.assigned_specialty,
    likelyConditions: JSON.parse(row.likely_conditions),
    createdAt: row.created_at,
  }));

  res.json(queue);
});

app.delete("/api/queue", async (req, res) => {
  const db = await initializeDatabase();
  const result = await db.run("DELETE FROM triage_logs");

  res.json({
    message: "Queue reset successfully.",
    removedCount: result.changes || 0,
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Triage demo running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
