const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const symptomContainer = document.getElementById("symptomContainer");
const logList = document.getElementById("logList");
const statusText = document.getElementById("statusText");
const urgencyCard = document.getElementById("urgencyCard");
const scenarioButtons = [...document.querySelectorAll(".scenario-btn")];

const fields = {
  patientName: document.getElementById("patientName"),
};

const symptomChecks = () => [...document.querySelectorAll('input[name="symptom"]:checked')].map((item) => item.value);

const priorityText = document.getElementById("priorityText");
const allocationText = document.getElementById("allocationText");
const alertText = document.getElementById("alertText");
const diagnosisText = document.getElementById("diagnosisText");

function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.className = `status-banner status-${tone}`;
}

function setUrgencyCardTone(level = "none") {
  urgencyCard.classList.remove("urgency-high", "urgency-medium", "urgency-low");
  if (level === "high") urgencyCard.classList.add("urgency-high");
  if (level === "medium") urgencyCard.classList.add("urgency-medium");
  if (level === "low") urgencyCard.classList.add("urgency-low");
}

function applyScenario(name) {
  const config = {
    critical: {
      patientName: "Amina Okello",
      symptoms: ["Chest Pain", "Shortness of Breath", "Dizziness"],
    },
    infectious: {
      patientName: "Daniel Mwangi",
      symptoms: ["Fever", "Abdominal Pain", "Diarrhea", "Nausea/Vomiting"],
    },
    mild: {
      patientName: "Grace Njeri",
      symptoms: ["Cough", "Sore Throat", "Fatigue"],
    },
  }[name];

  if (!config) return;

  fields.patientName.value = config.patientName;
  const checkboxes = [...document.querySelectorAll('input[name="symptom"]')];
  checkboxes.forEach((box) => {
    box.checked = config.symptoms.includes(box.value);
  });

  setStatus(`Loaded ${name} scenario. Click Run Prioritization.`, "neutral");
}

function readInput() {
  const symptoms = symptomChecks();

  return {
    patientName: fields.patientName.value.trim() || "Unknown Patient",
    symptoms,
  };
}

function resetOutputs() {
  priorityText.textContent = "Not calculated yet.";
  priorityText.className = "";
  allocationText.textContent = "No specialist assigned yet.";
  alertText.textContent = "No alert dispatched.";
  diagnosisText.textContent = "No condition suggestions yet.";
  setStatus("Awaiting patient input.", "neutral");
  setUrgencyCardTone();
}

function renderSymptoms(symptoms) {
  symptomContainer.innerHTML = "";

  if (!symptoms.length) {
    symptomContainer.textContent = "No symptoms found in database.";
    return;
  }

  symptoms.forEach((symptom) => {
    const label = document.createElement("label");
    label.className = "check-item";
    label.innerHTML = `<input type="checkbox" name="symptom" value="${symptom}" />${symptom}`;
    symptomContainer.appendChild(label);
  });
}

function urgencyClass(score) {
  if (score >= 5) return "priority-high";
  if (score >= 3) return "priority-medium";
  return "priority-low";
}

function renderQueue(queueItems) {
  logList.innerHTML = "";

  if (!queueItems.length) {
    logList.innerHTML = "<li>No patients in queue yet.</li>";
    return;
  }

  queueItems.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div class="queue-head">
        <span class="queue-rank">#${entry.queuePosition}</span>
        <strong>${entry.patientName}</strong>
        <span class="queue-badge ${urgencyClass(entry.urgencyScore)}">${entry.urgencyLabel} (${entry.urgencyScore}/5)</span>
      </div>
      <div class="queue-sub">${entry.assignedDoctor} (${entry.assignedSpecialty})</div>
      <span class="muted">Symptoms: ${entry.selectedSymptoms.join(", ")} · ${entry.createdAt}</span>
    `;
    logList.appendChild(item);
  });
}

async function loadSymptoms() {
  const response = await fetch("/api/symptoms");
  if (!response.ok) {
    throw new Error("Failed to load symptoms from database.");
  }
  const data = await response.json();
  renderSymptoms(data);
}

async function loadQueue() {
  const response = await fetch("/api/queue");
  if (!response.ok) {
    throw new Error("Failed to load urgency queue.");
  }
  const data = await response.json();
  renderQueue(data);
}

async function runWorkflow() {
  runBtn.disabled = true;
  const input = readInput();

  if (!input.symptoms.length) {
    alertText.textContent = "Please select at least one symptom.";
    setStatus("Prioritization not executed: select at least one symptom.", "warning");
    runBtn.disabled = false;
    return;
  }

  let result;
  try {
    const response = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Prioritization request failed.");
    }

    result = await response.json();
  } catch (error) {
    alertText.textContent = error.message;
    setStatus("Prioritization request failed.", "danger");
    runBtn.disabled = false;
    return;
  }

  priorityText.textContent = `Score ${result.urgency.score}/5 - ${result.urgency.label}`;
  priorityText.className = result.urgency.className;

  if (result.urgency.score >= 5) {
    setUrgencyCardTone("high");
    setStatus(`Urgent case detected for ${result.patientName}.`, "danger");
  } else if (result.urgency.score >= 3) {
    setUrgencyCardTone("medium");
    setStatus(`Priority case processed for ${result.patientName}.`, "warning");
  } else {
    setUrgencyCardTone("low");
    setStatus(`Standard case processed for ${result.patientName}.`, "success");
  }

  allocationText.textContent = `${result.assignment.doctor} (${result.assignment.specialty}) assigned to ${result.patientName}.`;
  alertText.textContent =
    result.urgency.score >= 5
      ? `SMS: \"${result.patientName}, proceed to Room 4. Priority: Urgent.\"`
      : `SMS: \"${result.patientName}, please wait. You are queued as ${result.urgency.label}.\"`;

  const conditionText = result.likelyConditions.length
    ? result.likelyConditions
        .map(
          (entry) =>
            `${entry.disease} (${entry.confidence}% match; matched: ${entry.matchedSymptoms.join(", ")})`
        )
        .join(" | ")
    : "No sufficiently matched conditions from current symptom set.";
  diagnosisText.textContent = `Likely differential: ${conditionText}.`;

  await loadQueue();

  runBtn.disabled = false;
}

runBtn.addEventListener("click", runWorkflow);
resetBtn.addEventListener("click", () => {
  resetQueue();
});

scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => applyScenario(button.dataset.scenario));
});

async function initializeUI() {
  try {
    await loadSymptoms();
    await loadQueue();
    resetOutputs();
  } catch (error) {
    symptomContainer.textContent = error.message;
    setStatus("Unable to load prioritization data.", "danger");
  }
}

async function resetQueue() {
  resetBtn.disabled = true;

  try {
    const response = await fetch("/api/queue", {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to reset queue.");
    }

    await loadQueue();
    resetOutputs();
    setStatus("Queue reset complete.", "neutral");
  } catch (error) {
    setStatus(error.message || "Failed to reset queue.", "danger");
  } finally {
    resetBtn.disabled = false;
  }
}

initializeUI();
