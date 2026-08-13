import { apiFetch } from "./api.js";

// currentSlot is owned by main.js — slots.js receives it as a param

export async function fetchSlots() {
  const data = await apiFetch("/slots");
  // Guard: API returns { slots: string[] }
  return Array.isArray(data?.slots) ? data.slots : [];
}

export async function createSlot(name) {
  await apiFetch("/slots", { method: "POST", body: JSON.stringify({ slot: name }) });
}

export async function fetchSlotMeta(slot) {
  const data = await apiFetch(`/slots/${slot}`);
  return data ?? {};
}

export async function setProjectPath(slot, projectPath) {
  await apiFetch(`/slots/${slot}/refs`, {
    method: "PATCH",
    body: JSON.stringify({ projectPath }),
  });
}

export async function clearHistory(slot) {
  await apiFetch(`/chat/${slot}`, { method: "DELETE" });
}

// ── Rendering ──

export function renderSlots(slots, currentSlot, { onSelect, onClear }) {
  const list = document.getElementById("slot-list");
  list.innerHTML = "";

  for (const s of slots) {
    const item = document.createElement("div");
    item.className = "slot-item" + (s === currentSlot ? " active" : "");

    const dot  = document.createElement("span");
    dot.className = "slot-dot";

    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = s;

    const del = document.createElement("button");
    del.className = "slot-del";
    del.textContent = "×";
    del.title = "Clear history";
    del.onclick = async e => {
      e.stopPropagation();
      if (!confirm(`Clear history for "${s}"?`)) return;
      await onClear(s);
    };

    item.append(dot, name, del);
    item.onclick = () => onSelect(s);
    list.appendChild(item);
  }
}

export function renderProjectBadge(projectPath) {
  const badge = document.getElementById("project-path-badge");
  if (projectPath) {
    badge.textContent = "📁 " + projectPath;
    badge.classList.remove("empty");
    badge.title = "Click to change folder";
  } else {
    badge.textContent = "+ link folder";
    badge.classList.add("empty");
    badge.title = "Link a project folder";
  }
}
