/* AI Virtual Assistant Widget (AIVA) - drop-in embed script (vanilla JS) */
(() => {
  // Capture the executing <script> tag at load time. `document.currentScript`
  // is only reliable during synchronous script execution, not later (e.g. in
  // DOMContentLoaded callbacks).
  /** @type {HTMLScriptElement | null} */
  const INITIAL_SCRIPT_TAG =
    document.currentScript && document.currentScript.tagName === "SCRIPT"
      ? /** @type {HTMLScriptElement} */ (document.currentScript)
      : null;

  const DEFAULTS = {
    serverUrl: "https://chatbot.zakishirwani.com/",
    clientSite: "",
    position: "br", // br | bl
    title: "AI Virtual Assistant",
    subtitle: "Ask me anything about this website",
    greeting:
      "Hi! I’m an AI-based virtual assistant. Ask me any questions and I’ll do my best to help.",
    maxContextChars: 2000,
    brandColor: "#2563eb",
  };

  /** @returns {HTMLScriptElement | null} */
  function getThisScriptTag() {
    if (INITIAL_SCRIPT_TAG && document.contains(INITIAL_SCRIPT_TAG)) return INITIAL_SCRIPT_TAG;

    // Works for typical <script src=".../ai-assistant-widget.js" ...>
    // Fallback: last script on page.
    const scripts = document.getElementsByTagName("script");

    // Prefer a script whose src looks like this widget, in case other scripts
    // are added after us.
    for (let i = scripts.length - 1; i >= 0; i--) {
      const s = scripts[i];
      const src = s && typeof s.src === "string" ? s.src : "";
      if (src && src.includes("ai-assistant-widget.js")) {
        return /** @type {HTMLScriptElement} */ (s);
      }
    }

    return scripts.length ? scripts[scripts.length - 1] : null;
  }

  function nowTime() {
    try {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function clampContext(str, maxChars) {
    if (!str) return "";
    if (str.length <= maxChars) return str;
    return str.slice(str.length - maxChars);
  }

  function buildContext(messages) {
    // Serialize conversation in a compact, model-friendly way.
    // Only last N chars are sent (server-side can use it as context).
    return messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");
  }

  function hexToRgb(hex) {
    const m = String(hex || "")
      .trim()
      .match(/^#?([0-9a-f]{6})$/i);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    const to = (x) => x.toString(16).padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`;
  }

  function darkenHex(hex, amount01) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const amt = Math.max(0, Math.min(1, amount01));
    const f = (x) => Math.max(0, Math.min(255, Math.round(x * (1 - amt))));
    return rgbToHex({ r: f(rgb.r), g: f(rgb.g), b: f(rgb.b) });
  }

  function createEl(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        el.setAttribute(k, String(v));
      }
    }
    return el;
  }

  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  async function requestAnswer({ serverUrl, clientSite, fullPrompt }) {
    const url = new URL(serverUrl);
    url.searchParams.set("client_site", clientSite);
    url.searchParams.set("prompt", fullPrompt);

    const res = await fetch(url.toString(), {
      method: "GET",
      credentials: "omit",
      headers: { Accept: "application/json, text/plain, */*" },
    });

    // If server sometimes responds with text, handle both
    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(body || `Request failed (${res.status})`);
    }

    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data && typeof data.answer === "string") return data.answer;
      // Fallback: stringify unknown response
      return typeof data === "string" ? data : JSON.stringify(data);
    }

    const text = await res.text();
    // Try to parse JSON-in-text
    try {
      const maybe = JSON.parse(text);
      if (maybe && typeof maybe.answer === "string") return maybe.answer;
    } catch {
      // ignore
    }
    return text;
  }

  function init(userConfig) {
    const cfg = { ...DEFAULTS, ...(userConfig || {}) };
    if (!cfg.clientSite) {
      // Derive from current location if not provided
      cfg.clientSite = window.location.hostname;
    }

    // Prevent multiple inits
    if (document.getElementById("aiva-root")) return;

    // Apply brand color to widget scope
    document.documentElement.style.setProperty("--aiva-brand", cfg.brandColor);
    const brandStrong = darkenHex(cfg.brandColor, 0.12) || cfg.brandColor;
    document.documentElement.style.setProperty("--aiva-brand-strong", brandStrong);

    const root = createEl("div", "aiva-root", { id: "aiva-root", "data-position": cfg.position });

    const launcher = createEl("button", "aiva-launcher", {
      type: "button",
      "aria-label": "Open AI assistant chat",
    });
    launcher.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 18.5L4 20l1.5-3.5A8.5 8.5 0 1 1 20 12a8.5 8.5 0 0 1-12.5 6.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11.5h8M8 14.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

    const panel = createEl("div", "aiva-panel", { role: "dialog", "aria-hidden": "true" });

    const header = createEl("div", "aiva-header");
    const titleWrap = createEl("div", "aiva-title");
    const title = createEl("strong");
    title.textContent = cfg.title;
    const subtitle = createEl("span");
    subtitle.textContent = cfg.subtitle;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const closeBtn = createEl("button", "aiva-close", { type: "button", "aria-label": "Close chat" });
    closeBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const messagesEl = createEl("div", "aiva-messages", { role: "log", "aria-live": "polite" });

    const footer = createEl("div", "aiva-footer");
    const form = createEl("form", "aiva-form");
    const input = /** @type {HTMLTextAreaElement} */ (
      createEl("textarea", "aiva-input", {
        rows: "1",
        placeholder: "Type your question…",
        "aria-label": "Message",
      })
    );
    const sendBtn = /** @type {HTMLButtonElement} */ (createEl("button", "aiva-send", { type: "submit" }));
    sendBtn.textContent = "Send";

    form.appendChild(input);
    form.appendChild(sendBtn);

    const hint = createEl("div", "aiva-hint");
    hint.textContent = "Tip: press Enter to send (Shift+Enter for new line).";

    footer.appendChild(form);
    footer.appendChild(hint);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(footer);

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    /** @type {{role:'user'|'assistant', text:string, at:string}[]} */
    const messages = [];

    function addMessage(role, text, at) {
      const row = createEl("div", `aiva-row ${role === "user" ? "aiva-user" : "aiva-assistant"}`);
      const bubble = createEl("div", "aiva-bubble");
      bubble.textContent = text;

      const wrap = createEl("div");
      wrap.appendChild(bubble);

      const meta = createEl("div", "aiva-meta");
      meta.textContent = at ? at : "";
      wrap.appendChild(meta);

      row.appendChild(wrap);
      messagesEl.appendChild(row);
      scrollToBottom(messagesEl);
    }

    function addTyping() {
      const row = createEl("div", "aiva-row aiva-assistant");
      row.setAttribute("data-typing", "true");
      const bubble = createEl("div", "aiva-bubble");
      const typing = createEl("span", "aiva-typing");
      typing.appendChild(createEl("span", "aiva-dot"));
      typing.appendChild(createEl("span", "aiva-dot"));
      typing.appendChild(createEl("span", "aiva-dot"));
      bubble.appendChild(typing);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      scrollToBottom(messagesEl);
      return row;
    }

    function removeTypingRow(row) {
      if (row && row.parentNode) row.parentNode.removeChild(row);
    }

    function ensureGreeting() {
      if (messages.length) return;
      const at = nowTime();
      messages.push({ role: "assistant", text: cfg.greeting, at });
      addMessage("assistant", cfg.greeting, at);
    }

    function openPanel() {
      panel.setAttribute("aria-hidden", "false");
      ensureGreeting();
      setTimeout(() => input.focus(), 0);
    }

    function closePanel() {
      panel.setAttribute("aria-hidden", "true");
      launcher.focus();
    }

    function togglePanel() {
      const isHidden = panel.getAttribute("aria-hidden") !== "false";
      if (isHidden) openPanel();
      else closePanel();
    }

    launcher.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", closePanel);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.getAttribute("aria-hidden") === "false") closePanel();
    });

    // Autosize textarea
    function autosize() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    }
    input.addEventListener("input", autosize);

    // Enter to send; Shift+Enter for newline
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = (input.value || "").trim();
      if (!text) return;

      const at = nowTime();
      messages.push({ role: "user", text, at });
      addMessage("user", text, at);
      input.value = "";
      autosize();

      sendBtn.disabled = true;
      input.disabled = true;

      const typingRow = addTyping();

      try {
        const contextMessages = messages.slice(0, -1);
        const context = clampContext(buildContext(contextMessages), cfg.maxContextChars);
        const fullPrompt = context && context.trim().length ? `${context}\n\nUser: ${text}` : text;

        const answer = await requestAnswer({
          serverUrl: cfg.serverUrl,
          clientSite: cfg.clientSite,
          fullPrompt,
        });

        removeTypingRow(typingRow);
        const at2 = nowTime();
        messages.push({ role: "assistant", text: answer, at: at2 });
        addMessage("assistant", answer, at2);
      } catch (err) {
        removeTypingRow(typingRow);
        const msg =
          err && typeof err === "object" && "message" in err
            ? /** @type {{message:any}} */ (err).message
            : String(err);
        const at2 = nowTime();
        const looksLikeCors =
          typeof msg === "string" &&
          (msg.includes("Failed to fetch") ||
            msg.includes("NetworkError") ||
            msg.includes("Load failed"));
        const extra =
          looksLikeCors
            ? "This is usually a CORS issue — the server must send Access-Control-Allow-Origin."
            : "";
        const friendly = `Sorry — I couldn’t reach the assistant server right now. ${
          msg ? `(${msg})` : ""
        } ${extra}`.trim();
        messages.push({ role: "assistant", text: friendly, at: at2 });
        addMessage("assistant", friendly, at2);
      } finally {
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    });

    // Optional: open programmatically via window.AIVAWidget.open()
    return {
      open: openPanel,
      close: closePanel,
      toggle: togglePanel,
      getConfig: () => ({ ...cfg }),
    };
  }

  // Auto-init from <script ... data-*> attributes.
  // Example:
  // <script src="/ai-assistant-widget.js"
  //   data-client-site="goaimarketingservices.com"
  //   data-server-url="https://chatbot.zakishirwani.com/"
  //   data-position="br"
  //   data-title="Go AI Assistant"
  //   data-brand-color="#2563eb"></script>
  function autoInit() {
    const tag = getThisScriptTag();
    const ds = tag ? tag.dataset : /** @type {any} */ ({});

    const cfg = {
      clientSite: ds.clientSite || "",
      serverUrl: ds.serverUrl || DEFAULTS.serverUrl,
      position: ds.position || DEFAULTS.position,
      title: ds.title || DEFAULTS.title,
      subtitle: ds.subtitle || DEFAULTS.subtitle,
      greeting: ds.greeting || DEFAULTS.greeting,
      brandColor: ds.brandColor || DEFAULTS.brandColor,
      maxContextChars: Number.isFinite(parseInt(ds.maxContextChars, 10))
        ? parseInt(ds.maxContextChars, 10)
        : DEFAULTS.maxContextChars,
    };

    const api = init(cfg);
    window.AIVAWidget = api;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();

