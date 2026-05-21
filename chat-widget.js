(() => {
  const config = window.LAPRIX_CHAT_CONFIG || {};
  const API_BASE_URL = (config.apiBaseUrl || "").replace(/\/$/, "");
  const CONTACT_EMAIL = config.contactEmail || "hello@laprixaistudio.hu";
  const PRIVACY_URL = config.privacyUrl || "/adatkezeles.html";

  const ANALYTICS = config.analytics || {};

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
    `;
    document.head.appendChild(style);
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function addMessage(role, text) {
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
    if (status) status.textContent = isBusy ? "A Laprix AI válaszol..." : "Online";
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
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      addMessage("assistant", data.reply || "Nem érkezett válasz. Kérlek, próbáld újra.");
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
        "Köszönöm, az ajánlatkérés beérkezett. Átnézzük az igényt, és e-mailben jelentkezünk."
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
            Írd le röviden, mire lenne szükséged: új weboldalra, meglévő weboldal kezelésére, AI megoldásra, miniwebre, automatizálásra vagy egyedi programra.
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
              <option value="Egyéb">Egyéb</option>
            </select>
          </label>
          <label>Rövid leírás*<textarea name="message" required maxlength="1800" rows="4" placeholder="Példa: új weboldalt szeretnék / meglévő weboldalam kezelését kérem / AI megoldás kell. Írd le röviden a célt, a jelenlegi helyzetet és a fontos funkciókat."></textarea></label>
          <button class="button primary" type="submit">Ajánlatkérés elküldése</button>
          <a class="laprix-chat-mail-link" href="mailto:${CONTACT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}">Inkább e-mailben írok</a>
        </form>
      </div>

      <p class="laprix-chat-privacy">
        A chat AI backenddel működik. Ne adj meg jelszót vagy érzékeny adatot.
        <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Adatkezelés</a>
      </p>
    `;

    root.appendChild(panel);
    root.appendChild(launcher);
    document.body.appendChild(root);

    document.querySelector(".laprix-chat-close").addEventListener("click", () => toggleChat(false));
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
            "Rendben. Megnyitottam az ajánlatkérő űrlapot. Írd le röviden, hogy weboldal készítésről, meglévő weboldal kezeléséről vagy más digitális megoldásról van szó, és e-mailben jelentkezünk."
          );
          openLeadForm();
          return;
        }

        sendChatMessage(button.dataset.question || button.textContent);
      });
    });

    addMessage(
      "assistant",
      "Szia! A Laprix AI Studio asszisztense vagyok. Kérdezhetsz a FoglalóFlow-ról, PostPilot HU-ról, Kiadviáról, weboldal készítésről, meglévő weboldal kezeléséről vagy egyedi AI/programfejlesztésről."
    );
  }


  function installPageCtaLeadHandlers() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickable = target.closest("a, button");
      if (!clickable) return;

      // Fontos: a chat widgeten belüli gombokat nem szabad globálisan elkapni,
      // mert akkor az "Ajánlatkérés elküldése" submit gomb sem tudná beküldeni az űrlapot.
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
        "Megnyitottam az ajánlatkérő űrlapot. Írd le röviden, mire lenne szükséged: új weboldalra, meglévő weboldal kezelésére, AI megoldásra, miniwebre, automatizálásra vagy egyedi programra."
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
