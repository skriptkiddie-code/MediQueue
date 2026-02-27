const diseaseForm = document.getElementById("diseaseForm");
const diseaseIdInput = document.getElementById("diseaseId");
const diseaseNameInput = document.getElementById("diseaseName");
const specialtyInput = document.getElementById("specialty");
const redFlagInput = document.getElementById("redFlag");
const symptomsInput = document.getElementById("symptoms");
const clearBtn = document.getElementById("clearBtn");
const messageEl = document.getElementById("adminMessage");
const catalogContainer = document.getElementById("catalogContainer");

function setMessage(message, isError = false) {
  messageEl.textContent = message;
  messageEl.style.color = isError ? "#b21c1c" : "";
}

function resetForm() {
  diseaseIdInput.value = "";
  diseaseNameInput.value = "";
  specialtyInput.value = "";
  redFlagInput.checked = false;
  symptomsInput.value = "";
}

function parseSymptoms(text) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadCatalog() {
  const response = await fetch("/api/admin/diseases");
  if (!response.ok) {
    throw new Error("Failed to load disease catalog.");
  }

  const catalog = await response.json();

  if (!catalog.length) {
    catalogContainer.textContent = "No diseases found.";
    return;
  }

  const list = document.createElement("div");
  list.className = "catalog-list";

  for (const item of catalog) {
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.innerHTML = `
      <h3>${item.disease}</h3>
      <p><strong>Specialty:</strong> ${item.specialty} ${item.redFlag ? "· Red Flag" : ""}</p>
      <p><strong>Symptoms:</strong> ${item.symptoms.join(", ")}</p>
      <button class="btn" data-id="${item.id}">Edit</button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      diseaseIdInput.value = String(item.id);
      diseaseNameInput.value = item.disease;
      specialtyInput.value = item.specialty;
      redFlagInput.checked = item.redFlag;
      symptomsInput.value = item.symptoms.join(", ");
      setMessage(`Editing: ${item.disease}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    list.appendChild(card);
  }

  catalogContainer.innerHTML = "";
  catalogContainer.appendChild(list);
}

async function saveDisease(event) {
  event.preventDefault();

  const id = diseaseIdInput.value.trim();
  const payload = {
    disease: diseaseNameInput.value.trim(),
    specialty: specialtyInput.value.trim(),
    redFlag: redFlagInput.checked,
    symptoms: parseSymptoms(symptomsInput.value),
  };

  if (!payload.disease || !payload.specialty || payload.symptoms.length === 0) {
    setMessage("Please provide disease, specialty, and at least one symptom.", true);
    return;
  }

  const isEdit = Boolean(id);
  const url = isEdit ? `/api/admin/diseases/${id}` : "/api/admin/diseases";
  const method = isEdit ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    setMessage(data.message || "Save failed.", true);
    return;
  }

  setMessage(data.message || "Saved.");
  resetForm();
  await loadCatalog();
}

clearBtn.addEventListener("click", () => {
  resetForm();
  setMessage("Form cleared.");
});

diseaseForm.addEventListener("submit", async (event) => {
  try {
    await saveDisease(event);
  } catch (error) {
    setMessage(error.message, true);
  }
});

(async function initializeAdmin() {
  try {
    await loadCatalog();
    setMessage("Catalog loaded.");
  } catch (error) {
    setMessage(error.message, true);
  }
})();
