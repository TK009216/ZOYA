const API_BASE = "http://127.0.0.1:22218";

const state = {
  messages: [],
  streaming: false,
  controller: null,
  startTime: 0,
  totalTokens: 0,
};

const $ = (id) => document.getElementById(id);

const messagesEl = $("messages");
const promptInput = $("prompt-input");
const sendBtn = $("send-btn");
const stopBtn = $("stop-btn");
const modelSelect = $("model-select");
const apiKeyInput = $("api-key-input");
const streamToggle = $("stream-toggle");
const clearBtn = $("clear-btn");
const copyLastBtn = $("copy-last-btn");
const statusBadge = $("status-badge");
const statModel = $("stat-model");
const statTokens = $("stat-tokens");
const statTime = $("stat-time");
const proxyStatus = $("proxy-status");
const backendStatus = $("backend-status");

// Auto-resize textarea
promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + "px";
});

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);
stopBtn.addEventListener("click", stopStream);
clearBtn.addEventListener("click", clearChat);
copyLastBtn.addEventListener("click", copyLastResponse);

// Example chips
document.querySelectorAll(".example-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    promptInput.value = chip.dataset.prompt;
    sendMessage();
  });
});

function addMessage(role, content, thinking = "") {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.dataset.role = role;

  let html = `<div class="msg-header">${role === "user" ? "You" : "ZOYA"}</div>`;

  if (thinking) {
    html += `<div class="thinking-block">${escapeHtml(thinking)}</div>`;
  }

  // Format code blocks
  const formatted = formatContent(escapeHtml(content));
  html += `<div class="msg-content">${formatted}</div>`;

  div.innerHTML = html;
  messagesEl.appendChild(div);
  scrollToBottom();
  return div;
}

function addTypingIndicator() {
  const div = document.createElement("div");
  div.className = "message assistant typing";
  div.id = "typing-indicator";
  div.innerHTML = `
    <div class="msg-header">ZOYA</div>
    <div class="typing">
      <span></span><span></span><span></span>
    </div>`;
  messagesEl.appendChild(div);
  scrollToBottom();
  return div;
}

function removeTypingIndicator() {
  const el = $("typing-indicator");
  if (el) el.remove();
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatContent(text) {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function showStatus(msg, type = "info") {
  statusBadge.textContent = msg;
  statusBadge.className = "status-badge " + type;
}

async function sendMessage() {
  const text = promptInput.value.trim();
  if (!text || state.streaming) return;

  promptInput.value = "";
  promptInput.style.height = "auto";
  state.startTime = Date.now();
  state.totalTokens = 0;

  const model = modelSelect.value;
  const useStream = streamToggle.checked;
  const apiKey = apiKeyInput.value.trim();

  statModel.textContent = model;

  // Add user message
  addMessage("user", text);
  state.messages.push({ role: "user", content: text });

  addTypingIndicator();
  showStatus(`Streaming...`, "online");
  sendBtn.disabled = true;
  stopBtn.style.display = "inline-block";
  state.streaming = true;

  const requestBody = {
    model,
    messages: state.messages.slice(-10),
    stream: useStream,
  };

  if (apiKey) {
    requestBody.api_key = apiKey;
  }

  try {
    const resp = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    removeTypingIndicator();

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: { message: resp.statusText } }));
      addMessage("system", `Error ${resp.status}: ${err.error?.message || "Unknown error"}`);
      showStatus("Error", "offline");
      return;
    }

    if (useStream) {
      await handleStream(resp);
    } else {
      await handleJsonResponse(resp);
    }
  } catch (err) {
    removeTypingIndicator();
    addMessage("system", `Network error: ${err.message}`);
    showStatus("Network error", "offline");
  } finally {
    sendBtn.disabled = false;
    stopBtn.style.display = "none";
    state.streaming = false;
    const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(1);
    if (state.totalTokens > 0) {
      statTokens.textContent = `${state.totalTokens} tokens`;
      statTime.textContent = `${elapsed}s (${(state.totalTokens / parseFloat(elapsed)).toFixed(0)} tok/s)`;
    }
  }
}

async function handleStream(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let thinking = "";
  let inThinking = false;
  let messageEl = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content || "";

          if (content) {
            // Check for thinking tags
            if (content.includes("<think>") || content.includes("【思考】") || content.includes("【推理】")) {
              inThinking = true;
            }

            const thinkContent = content.replace(/<\/?think>/g, "");

            if (inThinking) {
              if (content.includes("</think>") || content.includes("【/思考】") || content.includes("【/推理】")) {
                inThinking = false;
              } else {
                thinking += thinkContent;
              }
            } else {
              fullContent += content;
            }
          }

          if (parsed.usage) {
            state.totalTokens = parsed.usage.total_tokens || 0;
          }
        } catch {}
      }
    }
  }

  if (fullContent || thinking) {
    addMessage("assistant", fullContent, thinking);
    state.messages.push({ role: "assistant", content: fullContent });
    showStatus("Online", "online");
    statTokens.textContent = `${state.totalTokens} tokens`;
  }
}

async function handleJsonResponse(resp) {
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  const reasoning = data.choices?.[0]?.message?.reasoning_content || "";

  state.totalTokens = data.usage?.total_tokens || 0;

  if (content || reasoning) {
    addMessage("assistant", content, reasoning);
    state.messages.push({ role: "assistant", content });
  }
  showStatus("Online", "online");
}

function stopStream() {
  showStatus("Stopped", "offline");
  state.streaming = false;
  sendBtn.disabled = false;
  stopBtn.style.display = "none";
  removeTypingIndicator();
}

function clearChat() {
  if (state.streaming) stopStream();
  messagesEl.innerHTML = "";
  state.messages = [];
  state.totalTokens = 0;
  statModel.textContent = "-";
  statTokens.textContent = "-";
  statTime.textContent = "-";
  showStatus("Online", "online");
}

function copyLastResponse() {
  const last = messagesEl.querySelector(".message.assistant:last-child .msg-content");
  if (last) {
    navigator.clipboard.writeText(last.textContent);
  }
}

// Health check
async function checkHealth() {
  try {
    const resp = await fetch(`${API_BASE}/v1/models`);
    if (resp.ok) {
      proxyStatus.textContent = "● Online";
      proxyStatus.style.color = "var(--success)";
      showStatus("Online", "online");
    } else {
      proxyStatus.textContent = "● Error";
      proxyStatus.style.color = "var(--danger)";
      showStatus("Error", "offline");
    }
  } catch {
    proxyStatus.textContent = "● Offline";
    proxyStatus.style.color = "var(--danger)";
    showStatus("Offline", "offline");
  }

  // Check backend (ds-free-api)
  try {
    const resp = await fetch("http://127.0.0.1:22217/health");
    if (resp.ok) {
      backendStatus.textContent = "● Online";
      backendStatus.style.color = "var(--success)";
    } else {
      backendStatus.textContent = "● Error";
      backendStatus.style.color = "var(--warning)";
    }
  } catch {
    backendStatus.textContent = "● Offline";
    backendStatus.style.color = "var(--danger)";
  }
}

checkHealth();
setInterval(checkHealth, 10000);
