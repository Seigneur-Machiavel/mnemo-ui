import { apiFetch } from "./api.js";

// Config rows definition — drives rendering declaratively
const ROWS = [
  {
    key:   "provider",
    label: "Provider",
    desc:  "LLM backend",
    type:  "select",
    options: ["openai-compat", "anthropic"],
  },
  {
    key:   "model",
    label: "Model",
    desc:  "Model identifier (e.g. google/gemma-4-e4b)",
    type:  "text",
    placeholder: "google/gemma-4-e4b",
  },
  {
    key:   "baseUrl",
    label: "Base URL",
    desc:  "OpenAI-compat endpoint (ignored for Anthropic)",
    type:  "text",
    placeholder: "http://localhost:1234/v1",
  },
  {
    key:      "apiKey",
    label:    "API Key",
    desc:     "Optional — leave blank for local providers",
    type:     "password",
    placeholder: "sk-…",
  },
  {
    key:   "maxContext",
    label: "Max context",
    desc:  "Token budget for the model",
    type:  "number",
    placeholder: "131072",
  },
];

function buildPanel() {
  const panel = document.getElementById("config-panel");
  panel.innerHTML = "";

  const title = document.createElement("div");
  title.className = "config-section-title";
  title.textContent = "Settings";
  panel.appendChild(title);

  const block = document.createElement("div");
  block.className = "config-block";

  for (const row of ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "config-row";

    const label = document.createElement("div");
    label.className = "config-row-label";
    label.textContent = row.label;

    const desc = document.createElement("div");
    desc.className = "config-row-desc";
    desc.textContent = row.desc;

    let input;
    if (row.type === "select") {
      input = document.createElement("select");
      for (const opt of row.options) {
        const o = document.createElement("option");
        o.value = opt; o.textContent = opt;
        input.appendChild(o);
      }
    } else {
      input = document.createElement("input");
      input.type = row.type;
      if (row.placeholder) input.placeholder = row.placeholder;
    }
    input.id = `cfg-${row.key}`;
    input.dataset.key = row.key;

    rowEl.append(label, desc, input);
    block.appendChild(rowEl);
  }

  panel.appendChild(block);

  // Actions row
  const actions = document.createElement("div");
  actions.className = "config-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "Save";
  saveBtn.onclick = saveConfig;

  const feedback = document.createElement("span");
  feedback.className = "config-feedback";
  feedback.id = "cfg-feedback";

  actions.append(saveBtn, feedback);
  panel.appendChild(actions);
}

async function loadConfig() {
  const cfg = await apiFetch("/config");
  for (const row of ROWS) {
    const el = document.getElementById(`cfg-${row.key}`);
    if (!el) continue;
    el.value = cfg[row.key] ?? "";
  }
}

async function saveConfig() {
  const body = {};
  for (const row of ROWS) {
    const el = document.getElementById(`cfg-${row.key}`);
    if (!el) continue;
    const val = el.value.trim();
    if (row.type === "number") body[row.key] = Number(val) || undefined;
    else body[row.key] = val || null;
  }

  await apiFetch("/config", { method: "PATCH", body: JSON.stringify(body) });

  const fb = document.getElementById("cfg-feedback");
  fb.textContent = "saved ✓";
  setTimeout(() => { fb.textContent = ""; }, 2500);
}

export function initConfigPanel() {
  buildPanel();
}

export async function showConfig() {
  document.getElementById("chat-view").style.display   = "none";
  document.getElementById("config-panel").classList.add("visible");
  document.getElementById("config-nav-btn").classList.add("active");
  await loadConfig();
}

export function hideConfig() {
  document.getElementById("chat-view").style.display   = "";
  document.getElementById("config-panel").classList.remove("visible");
  document.getElementById("config-nav-btn").classList.remove("active");
}
