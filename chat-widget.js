(() => {
  const config = window.LAPRIX_CHAT_CONFIG || {};
  const API_BASE_URL = (config.apiBaseUrl || "").replace(/\/$/, "");
  const CONTACT_EMAIL = config.contactEmail || "hello@laprixaistudio.hu";
  const PRIVACY_URL = config.privacyUrl || "/adatkezeles.html";

  const ANALYTICS = config.analytics || {};

  function getOrCreateLaprixId(storageKey, prefix) {
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing) return existing;

      const randomPart =
        (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

      const value = `${prefix}_${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);
      localStorage.setItem(storageKey, value);
      return value;
    } catch (error) {
      return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);
    }
  }


  function trackLaprixEvent(eventName, params = {}) {
    const payload = {
      event_category: "Laprix AI ChatLead",
      ...params,
    };

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...payload,
    });

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);

      if (eventName === "laprix_lead_submitted" && ANALYTICS.googleAdsLeadSendTo) {
        window.gtag("event", "conversion", {
          send_to: ANALYTICS.googleAdsLeadSendTo,
          value: ANALYTICS.leadValue || 1.0,
          currency: ANALYTICS.currency || "HUF",
        });
      }
    }
  }


  const state = {
    isOpen: false,
    isBusy: false,
    messages: [],
    sessionId: getOrCreateLaprixId("laprix_chat_session_id", "chat"),
    visitorId: getOrCreateLaprixId("laprix_chat_visitor_id", "visitor"),
    sessionMode: "ai",
    sessionModeKnown: false,
    seenUpdateIds: new Set(),
    pollTimer: null,
  };

  function injectLeadFixStyles() {
    if (document.getElementById("laprix-chat-v1-2-lead-fix-style")) return;

    const style = document.createElement("style");
    style.id = "laprix-chat-v1-2-lead-fix-style";
    style.textContent = `
      .laprix-chat-panel.lead-mode .laprix-chat-messages {
        max-height: 170px;
        flex: 0 0 auto;
      }

      .laprix-chat-panel.lead-mode .laprix-chat-lead-form-wrap {
        display: block !important;
        flex: 1 1 auto;
        max-height: none;
        overflow: auto;
        border-top: 1px solid rgba(255,255,255,0.12);
        padding-top: 12px;
      }

      .laprix-chat-lead-helper {
        margin: 0 0 10px;
        color: #aebbd0;
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .laprix-chat-mail-link {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        min-height: 38px;
        margin-top: 6px;
        border-radius: 999px;
        padding: 0 12px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.14);
        color: #f4f7fb;
        text-decoration: none;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .laprix-chat-lead-form .button.primary {
        width: 100%;
        border: 0;
        cursor: pointer;
      }

      .laprix-chat-message.system .laprix-chat-bubble {
        margin-left: auto;
        margin-right: auto;
        max-width: 92%;
        text-align: center;
        background: rgba(250, 204, 21, 0.10);
        border: 1px solid rgba(250, 204, 21, 0.22);
        color: #fff4bf;
        font-size: 0.84rem;
      }

      .laprix-chat-message.human .laprix-chat-bubble {
        background: linear-gradient(135deg, rgba(56, 217, 255, 0.18), rgba(157, 124, 255, 0.16));
        border: 1px solid rgba(56, 217, 255, 0.26);
      }
    `;
    document.head.appendChild(style);
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function addMessage(role, text, options = {}) {
    const messageId = options.id || "";
    if (messageId && state.seenUpdateIds.has(messageId)) return;
    if (messageId) state.seenUpdateIds.add(messageId);

    state.messages.push({ role, text });
    const list = document.querySelector(".laprix-chat-messages");
    if (!list) return;

    const row = createEl("div", `laprix-chat-message ${role}`);
    const bubble = createEl("div", "laprix-chat-bubble");
    bubble.textContent = text;
    row.appendChild(bubble);
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  function setBusy(isBusy) {
    state.isBusy = isBusy;
    const sendBtn = document.querySelector(".laprix-chat-send");
    const input = document.querySelector(".laprix-chat-input");
    if (sendBtn) sendBtn.disabled = isBusy;
    if (input) input.disabled = isBusy;
    const status = document.querySelector(".laprix-chat-status");
    if (status) {
      status.textContent = isBusy
        ? (state.sessionMode === "human" ? "Üzenet küldése..." : "A Laprix AI válaszol...")
        : (state.sessionMode === "human" ? "Munkatárs csatlakozott" : "Online");
    }
  }


  function setSessionMode(mode, shouldAnnounce = true) {
    const nextMode = mode === "human" ? "human" : "ai";
    const previousMode = state.sessionMode;
    const wasKnown = state.sessionModeKnown;

    state.sessionMode = nextMode;
    state.sessionModeKnown = true;

    const status = document.querySelector(".laprix-chat-status");
    const input = document.querySelector(".laprix-chat-input");
    if (status && !state.isBusy) {
      status.textContent = nextMode === "human" ? "Munkatárs csatlakozott" : "Online";
    }
    if (input) {
      input.placeholder = nextMode === "human"
        ? "Írj a Laprix munkatársnak..."
        : "Írd be a kérdésed...";
    }

    if (shouldAnnounce && wasKnown && previousMode !== nextMode) {
      addMessage(
        "system",
        nextMode === "human"
          ? "Egy Laprix AI Studio munkatárs átvette a beszélgetést. Mostantól ő válaszol."
          : "A beszélgetés visszakerült az AI asszisztenshez."
      );
    }
  }

  async function pollSessionUpdates() {
    if (!API_BASE_URL || !state.sessionId || !state.isOpen) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/session/${encodeURIComponent(state.sessionId)}/updates?visitorId=${encodeURIComponent(state.visitorId)}`
      );
      if (!response.ok) return;

      const data = await response.json();
      if (data.sessionMode) {
        setSessionMode(data.sessionMode, true);
      }

      (data.messages || []).forEach((message) => {
        if (!message.id || state.seenUpdateIds.has(message.id)) return;

        if (message.type === "admin_message") {
          addMessage("human", "Laprix munkatárs: " + (message.content || ""), { id: message.id });
        } else if (message.type === "session_state") {
          state.seenUpdateIds.add(message.id);
          if (message.mode) setSessionMode(message.mode, true);
        }
      });
    } catch (error) {
      // Polling hiba esetén nem zavarjuk a látogatót.
    }
  }


  function toggleChat(forceOpen) {
    const wasOpen = state.isOpen;
    state.isOpen = typeof forceOpen === "boolean" ? forceOpen : !state.isOpen;
    if (!wasOpen && state.isOpen) {
      trackLaprixEvent("laprix_chat_opened", { source: "chat_launcher_or_cta" });
    }
    const panel = document.querySelector(".laprix-chat-panel");
    const launcher = document.querySelector(".laprix-chat-launcher");
    if (panel) panel.classList.toggle("open", state.isOpen);
    if (launcher) launcher.setAttribute("aria-expanded", String(state.isOpen));
  }

  async function sendChatMessage(text) {
    const cleanText = (text || "").trim();
    if (!cleanText || state.isBusy) return;

    addMessage("user", cleanText);
    trackLaprixEvent("laprix_chat_message_sent", { message_length: cleanText.length });
    const input = document.querySelector(".laprix-chat-input");
    if (input) input.value = "";

    if (!API_BASE_URL) {
      addMessage("assistant", "A chat backend URL még nincs beállítva. Írj közvetlenül: " + CONTACT_EMAIL);
      return;
    }

    setBusy(true);
    try {
      const history = state.messages.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          message: cleanText,
          history,
          pageUrl: window.location.href,
          pageTitle: document.title,
          sessionId: state.sessionId,
          visitorId: state.visitorId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.sessionId) {
        state.sessionId = data.sessionId;
        try { localStorage.setItem("laprix_chat_session_id", data.sessionId); } catch (error) {}
      }
      if (data.sessionMode) {
        setSessionMode(data.sessionMode, true);
      }
      addMessage(data.sessionMode === "human" ? "system" : "assistant", data.reply || "Nem érkezett válasz. Kérlek, próbáld újra.");
      setTimeout(pollSessionUpdates, 900);
    } catch (error) {
      addMessage(
        "assistant",
        "Most nem érem el az AI backend szolgáltatást. Írj e-mailt ide: " + CONTACT_EMAIL
      );
    } finally {
      setBusy(false);
    }
  }

  function openLeadForm() {
    trackLaprixEvent("laprix_lead_form_opened", { source: "chat_or_homepage_cta" });
    toggleChat(true);
    injectLeadFixStyles();

    const panel = document.querySelector(".laprix-chat-panel");
    const wrap = document.querySelector(".laprix-chat-lead-form-wrap");
    const nameInput = document.querySelector('.laprix-chat-lead-form input[name="name"]');

    if (panel) panel.classList.add("lead-mode");

    if (wrap) {
      wrap.classList.add("open");
      wrap.style.display = "block";
      wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (nameInput) {
      setTimeout(() => nameInput.focus(), 120);
    }
  }

  function closeLeadForm() {
    const panel = document.querySelector(".laprix-chat-panel");
    const wrap = document.querySelector(".laprix-chat-lead-form-wrap");
    if (panel) panel.classList.remove("lead-mode");
    if (wrap) {
      wrap.classList.remove("open");
      wrap.style.display = "";
    }
  }

  async function submitLead(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      projectType: String(formData.get("projectType") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      pageUrl: window.location.href,
      sessionId: state.sessionId,
      visitorId: state.visitorId,
      conversation: state.messages.slice(-10),
    };

    if (!payload.name || !payload.email || !payload.message) {
      addMessage("assistant", "Az ajánlatkéréshez legalább név, e-mail és rövid leírás szükséges.");
      openLeadForm();
      return;
    }

    const mailSubject = encodeURIComponent("Egyedi programfejlesztési ajánlatkérés");
    const mailBody = encodeURIComponent(
      `Név: ${payload.name}\nE-mail: ${payload.email}\nCég: ${payload.company}\nTelefon: ${payload.phone}\nTípus: ${payload.projectType}\n\nIgény:\n${payload.message}`
    );

    if (!API_BASE_URL) {
      trackLaprixEvent("laprix_lead_mailto_fallback", { source: "missing_api_base_url" });
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      trackLaprixEvent("laprix_lead_submitted", {
        source: "ai_chat_lead_form",
        project_type: payload.projectType || "unknown",
      });

      form.reset();
      closeLeadForm();
      addMessage(
        "assistant",
        "Köszönöm, az ajánlatkérés beérkezett. Átnézzük az igényt, összevetjük az árlistában szereplő irányárakkal, és e-mailben jelentkezünk előzetes javaslattal vagy pontosító kérdésekkel."
      );
    } catch (error) {
      addMessage(
        "assistant",
        "Az ajánlatkérés mentése most nem sikerült. Megnyitom az e-mailes ajánlatkérést."
      );
      trackLaprixEvent("laprix_lead_mailto_fallback", { source: "backend_lead_error" });
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${mailSubject}&body=${mailBody}`;
    } finally {
      setBusy(false);
    }
  }


  async function closeAndDeleteChatSession() {
    const sessionIdToDelete = state.sessionId;

    toggleChat(false);

    if (!API_BASE_URL || !sessionIdToDelete) {
      try { localStorage.removeItem("laprix_chat_session_id"); } catch (error) {}
      state.sessionId = getOrCreateLaprixId("laprix_chat_session_id", "chat");
      state.messages = [];
      return;
    }

    try {
      const url = `${API_BASE_URL}/api/chat/session/${encodeURIComponent(sessionIdToDelete)}/close`;
      const payload = JSON.stringify({ visitorId: state.visitorId });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: payload,
          keepalive: true,
        });
      }
    } catch (error) {
      // Bezáráskor nem zavarjuk a látogatót hibaüzenettel.
    } finally {
      try { localStorage.removeItem("laprix_chat_session_id"); } catch (error) {}
      state.sessionId = getOrCreateLaprixId("laprix_chat_session_id", "chat");
      state.messages = [];
      state.seenUpdateIds = new Set();

      const list = document.querySelector(".laprix-chat-messages");
      if (list) list.innerHTML = "";
    }
  }


  function buildWidget() {
    if (document.querySelector(".laprix-chat-root")) return;
    injectLeadFixStyles();

    const root = createEl("div", "laprix-chat-root");

    const launcher = createEl("button", "laprix-chat-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Laprix AI chat megnyitása");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = `<span class="laprix-chat-launcher-icon">AI</span><span>Kérdezz tőlünk</span>`;
    launcher.addEventListener("click", () => toggleChat());

    const panel = createEl("section", "laprix-chat-panel");
    panel.setAttribute("aria-label", "Laprix AI Studio chat");

    const mailtoSubject = encodeURIComponent("Egyedi programfejlesztési ajánlatkérés");
    const mailtoBody = encodeURIComponent(
      "Szia Laprix AI Studio,\n\nAjánlatot szeretnék kérni.\n\nMire van szükségem: új weboldal / meglévő weboldal kezelése / landing oldal / AI megoldás / egyedi program\n\nRövid leírás:\n\nJelenlegi weboldal linkje, ha van:\n\nFontos funkciók vagy feladatok:\n\nHatáridő vagy prioritás:\n\nElérhetőségem:\n"
    );

    panel.innerHTML = `
      <div class="laprix-chat-header">
        <div>
          <strong>Laprix AI asszisztens</strong>
          <span class="laprix-chat-status">Online</span>
        </div>
        <button type="button" class="laprix-chat-close" aria-label="Chat bezárása">×</button>
      </div>

      <div class="laprix-chat-messages" aria-live="polite"></div>

      <div class="laprix-chat-quick">
        <button type="button" data-question="Miben segít a Laprix AI Studio?">Miben segít?</button>
        <button type="button" data-question="Készítetek egyedi programot?">Egyedi program?</button>
        <button type="button" data-question="Mi az a FoglalóFlow?">FoglalóFlow?</button>
        <button type="button" data-lead="true">Ajánlatot kérek</button>
      </div>

      <form class="laprix-chat-form">
        <input class="laprix-chat-input" type="text" maxlength="700" placeholder="Írd be a kérdésed..." autocomplete="off" />
        <button class="laprix-chat-send" type="submit">Küldés</button>
      </form>

      <div class="laprix-chat-lead-form-wrap">
        <form class="laprix-chat-lead-form">
          <div class="laprix-chat-lead-title">
            <strong>Ajánlatkérés</strong>
            <button type="button" class="laprix-chat-lead-close" aria-label="Ajánlatkérő bezárása">×</button>
          </div>
          <p class="laprix-chat-lead-helper">
            Írd le röviden, mire lenne szükséged: új weboldalra, meglévő weboldal kezelésére, FoglalóFlow-ra, AI chatbotra, automatizálásra vagy egyedi programra. Az árlista irányadó, a végleges ajánlat az igény alapján készül.
          </p>
          <label>Név*<input name="name" required maxlength="120" /></label>
          <label>E-mail*<input name="email" required type="email" maxlength="160" /></label>
          <label>Cégnév<input name="company" maxlength="160" /></label>
          <label>Telefon<input name="phone" maxlength="80" /></label>
          <label>Fejlesztés típusa
            <select name="projectType">
              <option value="Weboldal készítés">Új weboldal készítés</option>
              <option value="Meglévő weboldal kezelése">Meglévő weboldal kezelése / frissítése</option>
              <option value="Landing oldal / bemutatkozó oldal">Landing oldal / bemutatkozó oldal</option>
              <option value="FoglalóFlow / miniweb / foglalás">FoglalóFlow / miniweb / foglalás</option>
              <option value="Egyedi AI/programfejlesztés">Egyedi AI/programfejlesztés</option>
              <option value="Automatizálás">Automatizálás</option>
              <option value="Belső admin rendszer">Belső admin rendszer</option>
              <option value="Nem tudom / segítséget kérek">Nem tudom / segítséget kérek</option>
              <option value="Egyéb">Egyéb</option>
            </select>
            <small class="laprix-form-hint">Az árlista tájékoztató jellegű. A végleges ár az igény, a határidő és a meglévő rendszer állapota alapján készül.</small>
          </label>
          <label>Rövid leírás*<textarea name="message" required maxlength="1800" rows="4" placeholder="Példa: új weboldalt szeretnék / meglévő weboldalam kezelését kérem / FoglalóFlow kell / AI chatbotot szeretnék. Írd le röviden: mi a cél, van-e jelenlegi weboldal link, milyen funkciók kellenek, mennyire sürgős."></textarea></label>
          <button class="button primary" type="submit">Ajánlatkérés elküldése</button>
          <a class="laprix-chat-mail-link" href="mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}">Inkább e-mailben írok</a>
        </form>
      </div>

      <p class="laprix-chat-privacy">
        A chat AI backenddel működik. A beszélgetés bezáráskor törlődik a chat naplóból. Ne adj meg jelszót vagy érzékeny adatot.
        <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Adatkezelés</a>
      </p>
    `;

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    document.querySelector(".laprix-chat-close").addEventListener("click", closeAndDeleteChatSession);
    document.querySelector(".laprix-chat-lead-close").addEventListener("click", closeLeadForm);

    document.querySelector(".laprix-chat-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.querySelector(".laprix-chat-input");
      sendChatMessage(input?.value || "");
    });

    document.querySelector(".laprix-chat-lead-form").addEventListener("submit", submitLead);

    document.querySelectorAll(".laprix-chat-quick button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.lead === "true") {
          addMessage(
            "assistant",
            "Rendben. Megnyitottam az ajánlatkérő űrlapot. Írd le röviden, hogy weboldal készítésről, meglévő weboldal kezeléséről, FoglalóFlow-ról, AI chatről vagy más digitális megoldásról van szó. E-mailben jelentkezünk előzetes iránnyal vagy ajánlattal."
          );
          openLeadForm();
          return;
        }

        sendChatMessage(button.dataset.question || button.textContent);
      });
    });

    addMessage(
      "assistant",
      "Szia! A Laprix AI Studio asszisztense vagyok. Segítek eligazodni weboldal készítésben, meglévő weboldal kezelésben, FoglalóFlow-ban, AI chatbotban vagy egyedi programfejlesztésben. Ajánlatkérésnél az árlista csak irányadó: a pontos ár az igény alapján készül."
    );

    if (!state.pollTimer) {
      state.pollTimer = window.setInterval(pollSessionUpdates, 5000);
      setTimeout(pollSessionUpdates, 1200);
    }
  }


  function installPageCtaLeadHandlers() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickable = target.closest("a, button");
      if (!clickable) return;

      // Fontos: a chat widgeten belüli gombokat nem szabad globálisan elkapni,
      // mert akkor az "Küldés" submit gomb sem tudná beküldeni az űrlapot.
      // A chat saját gombjait külön eseménykezelők kezelik lejjebb.
      if (clickable.closest(".laprix-chat-root")) return;

      const text = (clickable.textContent || "").trim().toLowerCase();
      const href = (clickable.getAttribute("href") || "").toLowerCase();

      const isQuoteCta =
        clickable.hasAttribute("data-open-laprix-lead") ||
        text.includes("ajánlatkérés e-mailben") ||
        text === "ajánlatot kérek" ||
        text === "ajánlatkérés" ||
        href.includes("subject=egyedi%20programfejleszt") ||
        href.includes("mailto:hello@laprixaistudio.hu");

      if (!isQuoteCta) return;

      event.preventDefault();
      event.stopPropagation();

      addMessage(
        "assistant",
        "Megnyitottam az ajánlatkérő űrlapot. Írd le röviden, mire lenne szükséged: új weboldalra, meglévő weboldal kezelésére, FoglalóFlow-ra, AI chatbotra, automatizálásra vagy egyedi programra. Az árlista irányadó, a végleges ajánlat az igény alapján készül."
      );
      openLeadForm();
    });
  }

  installPageCtaLeadHandlers();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();



// V1.21 safety: keep the normal chat composer send button separate from the quote form submit button.
function laprixFixChatSendButtonLabel() {
  try {
    const normalSendSelectors = [
      '.laprix-chat-input-row button',
      '.laprix-chat-composer button',
      '.laprix-chat-footer button',
      '.chat-input-row button',
      '.chat-composer button',
      '.chat-footer button'
    ];
    normalSendSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((button) => {
        const text = (button.textContent || '').trim();
        const insideLeadForm = button.closest('[data-lead-form], .laprix-lead-form, .lead-form, form');
        const formText = insideLeadForm ? (insideLeadForm.textContent || '').toLowerCase() : '';
        const isQuoteForm = formText.includes('fejlesztés típusa') || formText.includes('projekt') || formText.includes('ajánlat');
        if (!isQuoteForm && text === 'Ajánlatkérés elküldése') {
          button.textContent = 'Küldés';
        }
      });
    });
  } catch (error) {
    // No-op: visual label safety only.
  }
}
document.addEventListener('DOMContentLoaded', laprixFixChatSendButtonLabel);
setInterval(laprixFixChatSendButtonLabel, 1200);

