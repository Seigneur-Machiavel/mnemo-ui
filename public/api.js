// Resolve API base from ?api= query param or same origin
const params = new URLSearchParams(location.search);
export const API_BASE = params.get("api") ?? "http://localhost:3333";

export async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

// Opens an SSE-like POST stream and calls handlers for each event type.
// Returns a promise that resolves when the stream closes.
// handlers: { onChunk, onStatus, onDone, onError }
export async function streamChat(slot, message, handlers) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, slot }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    handlers.onError?.(`Server error ${res.status}: ${text}`);
    return;
  }

  if (!res.body) {
    handlers.onError?.("No response body — streaming not supported?");
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let evt;
      try { evt = JSON.parse(line.slice(6)); } catch { continue; }

      if      (evt.type === "chunk")  handlers.onChunk?.(evt.text ?? "");
      else if (evt.type === "status") handlers.onStatus?.(evt.text ?? "");
      else if (evt.type === "done")   handlers.onDone?.();
      else if (evt.type === "error")  handlers.onError?.(evt.text ?? "unknown error");
    }
  }
}
