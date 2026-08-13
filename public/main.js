import {
  fetchSlots, createSlot, fetchSlotMeta,
  setProjectPath, clearHistory,
  renderSlots, renderProjectBadge,
} from "./slots.js";
import { sendMessage, clearMessages, showEmptyState, restoreHistory } from "./chat.js";
import { initConfigPanel, showConfig, hideConfig } from "./config.js";

// ── State ──
let currentSlot = null;
let isStreaming  = false;
let configVisible = false;

// ── Slots ──

async function loadAndRenderSlots() {
  const slots = await fetchSlots();
  renderSlots(slots, currentSlot, {
    onSelect: slot => selectSlot(slot),
    onClear:  async slot => {
      await clearHistory(slot);
      if (slot === currentSlot) clearMessages();
    },
  });
}

async function selectSlot(slot) {
  currentSlot = slot;
  document.getElementById("header-slot-name").textContent = slot;
  document.getElementById("user-input").disabled  = false;
  document.getElementById("send-btn").disabled    = false;
  if (configVisible) { configVisible = false; hideConfig(); }
  await restoreHistory(slot).catch(() => clearMessages());
  await loadAndRenderSlots(); // refresh highlights
  try {
    const meta = await fetchSlotMeta(slot);
    renderProjectBadge(meta.refs?.projectPath ?? null);
  } catch {
    renderProjectBadge(null);
  }
}

document.getElementById("reload-slots-btn").onclick = loadAndRenderSlots;

document.getElementById("new-slot-input").addEventListener("keydown", async e => {
  if (e.key !== "Enter") return;
  const name = e.target.value.trim();
  if (!name) return;
  e.target.value = "";
  await createSlot(name);
  await loadAndRenderSlots();
  await selectSlot(name);
});

// ── Project path modal ──

document.getElementById("project-path-badge").onclick = () => {
  if (!currentSlot) return;
  document.getElementById("modal-path-input").value = "";
  document.getElementById("modal-overlay").classList.add("visible");
  document.getElementById("modal-path-input").focus();
};

document.getElementById("modal-cancel").onclick = closeModal;
document.getElementById("modal-overlay").onclick = e => {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
};

document.getElementById("modal-confirm").onclick = async () => {
  const p = document.getElementById("modal-path-input").value.trim();
  if (!p || !currentSlot) return;
  await setProjectPath(currentSlot, p);
  renderProjectBadge(p);
  closeModal();
};

document.getElementById("modal-path-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("modal-confirm").click();
});

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("visible");
}

// ── Chat ──

document.getElementById("send-btn").onclick = submitMessage;
document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); }
});
document.getElementById("user-input").addEventListener("input", () => autoResize());

function autoResize() {
  const ta = document.getElementById("user-input");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
}

async function submitMessage() {
  if (isStreaming || !currentSlot) return;
  const input = document.getElementById("user-input");
  const text  = input.value.trim();
  if (!text) return;
  input.value = "";
  autoResize();

  await sendMessage(currentSlot, text, {
    onStreamStart() {
      isStreaming = true;
      document.getElementById("send-btn").disabled  = true;
      document.getElementById("user-input").disabled = true;
    },
    onStreamEnd() {
      isStreaming = false;
      document.getElementById("send-btn").disabled  = false;
      document.getElementById("user-input").disabled = false;
      document.getElementById("user-input").focus();
    },
  });
}

document.getElementById("clear-btn").onclick = async () => {
  if (!currentSlot) return;
  await clearHistory(currentSlot);
  clearMessages();
};

// ── Config ──

initConfigPanel();

document.getElementById("config-nav-btn").onclick = async () => {
  if (configVisible) { configVisible = false; hideConfig(); }
  else               { configVisible = true;  await showConfig(); }
};

// ── Boot ──

showEmptyState("select or create a conversation");

loadAndRenderSlots().catch(err => {
  showEmptyState(`Cannot reach mnemo at ${location.search} — is the server running?\n${err.message}`);
});