import { streamChat, apiFetch } from "./api.js";

const ACTION_PREFIXES = ["ADD_REF", "REMOVE_REF", "EDIT", "RECALL"];

function isActionLine(t) {
  return ACTION_PREFIXES.some(p => t.startsWith(p));
}

function scrollBottom() {
  const m = document.getElementById("messages");
  m.scrollTop = m.scrollHeight;
}

// ── Message builders ──

export function appendUserMessage(text) {
  const msg    = document.createElement("div");
  msg.className = "msg msg-user";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  msg.appendChild(bubble);
  document.getElementById("messages").appendChild(msg);
  scrollBottom();
}

// Returns { proseEl, msgEl } — caller streams content into proseEl
function createAssistantMessage() {
  const msg   = document.createElement("div");
  msg.className = "msg msg-assistant";
  const prose = document.createElement("div");
  prose.className = "prose cursor";
  msg.appendChild(prose);
  document.getElementById("messages").appendChild(msg);
  scrollBottom();
  return { proseEl: prose, msgEl: msg };
}

// ── Thought block ──

function createThoughtBlock(msgEl) {
  const block  = document.createElement("div");
  block.className = "thought-block";

  const toggle = document.createElement("button");
  toggle.className = "thought-toggle";

  const arrow   = document.createElement("span");
  arrow.className = "thought-arrow";
  arrow.textContent = "▾";

  const summary = document.createElement("span");
  summary.className = "thought-summary";
  summary.textContent = "thinking…";

  const count = document.createElement("span");
  count.className = "thought-count";

  toggle.append(arrow, summary, count);

  const body = document.createElement("div");
  body.className = "thought-body";

  block.append(toggle, body);
  toggle.onclick = () => block.classList.toggle("collapsed");

  // Insert before prose
  msgEl.insertBefore(block, msgEl.querySelector(".prose"));
  return block;
}

function addThoughtLine(block, text) {
  const body = block.querySelector(".thought-body");
  const line = document.createElement("div");
  line.className = "thought-line" + (
    isActionLine(text)          ? " is-action" :
    text.startsWith("⚠")        ? " is-warn"   :
    text.startsWith("Agent stopped") ? " is-done" :
    " is-cycle"
  );
  line.textContent = text;
  body.appendChild(line);

  const n = body.querySelectorAll(".thought-line").length;
  block.querySelector(".thought-count").textContent = `${n}`;
  scrollBottom();
}

function collapseThoughtBlock(block) {
  if (!block) return;
  block.querySelector(".thought-summary").textContent = "done";
  block.classList.add("collapsed");
}

// ── Restore history from server ──

export async function restoreHistory(slot) {
  const { history } = await apiFetch(`/chat/${slot}/history`);
  if (!history?.length) return;
  clearMessages();
  for (const msg of history) {
    if (msg.role === "user") { appendUserMessage(msg.content); continue; }
    if (msg.role !== "assistant") continue;
    const { proseEl } = createAssistantMessage();
    proseEl.classList.remove("cursor");
    proseEl.textContent = msg.content;
  }
}

// ── Main send function ──

export async function sendMessage(slot, text, { onStreamStart, onStreamEnd } = {}) {
  appendUserMessage(text);

  const { proseEl, msgEl } = createAssistantMessage();
  let thoughtBlock = null;

  onStreamStart?.();

  try {
    await streamChat(slot, text, {
      onChunk(chunk) {
        proseEl.textContent += chunk;
        scrollBottom();
      },
      onStatus(statusText) {
        if (!thoughtBlock) thoughtBlock = createThoughtBlock(msgEl);
        addThoughtLine(thoughtBlock, statusText);
      },
      onDone() {
        proseEl.classList.remove("cursor");
        collapseThoughtBlock(thoughtBlock);
      },
      onError(errText) {
        proseEl.classList.remove("cursor");
        proseEl.textContent += (proseEl.textContent ? "\n\n" : "") + `[error: ${errText}]`;
        collapseThoughtBlock(thoughtBlock);
      },
    });
  } catch (err) {
    proseEl.classList.remove("cursor");
    proseEl.textContent += (proseEl.textContent ? "\n\n" : "") + `[error: ${err.message}]`;
    collapseThoughtBlock(thoughtBlock);
  }

  onStreamEnd?.();
}

export function clearMessages() {
  document.getElementById("messages").innerHTML = "";
}

export function showEmptyState(text = "select or create a conversation") {
  clearMessages();
  const div = document.createElement("div");
  div.className = "empty-state";
  div.id = "empty-label";
  div.textContent = text;
  document.getElementById("messages").appendChild(div);
}