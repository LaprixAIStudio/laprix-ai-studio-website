(() => {
  const config = window.LAPRIX_CHAT_CONFIG || {};
  const API_BASE_URL = (config.apiBaseUrl || "").replace(/\/$/, "");
  const CONTACT_EMAIL = config.contactEmail || "hello@laprixaistudio.hu";
  const PRIVACY_URL = config.privacyUrl || "/adatkezeles.html";

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
    state.isOpen = typeof forceOpen === "boolean" ? forceOpen : !state.isOpen;
    const panel = document.querySelector(".laprix-chat-panel");
    const launcher = document.querySelector(".laprix-chat-launcher");
    if (panel) panel.classList.toggle("open", state.isOpen);
    if (launcher) launcher.setAttribute("aria-expanded", String(state.isOpen));
  }

  async function sendChatMessage(text) {
    const cleanText = (text || "").trim();
    if (!cleanText || state.isBusy) return;

    addMessage("user", cleanText);
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
      "Szia Laprix AI Studio,\n\nEgyedi programfejlesztés miatt írok.\n\nRöviden erre lenne szükségem:\n\nKik használnák:\n\nFontos funkciók:\n\nHatáridő vagy prioritás:\n\nElérhetőségem:\n"
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
            Írd le röviden, milyen programra, AI megoldásra, miniwebre vagy automatizálásra lenne szükséged.
          </p>
          <label>Név*<input name="name" required maxlength="120" /></label>
          <label>E-mail*<input name="email" required type="email" maxlength="160" /></label>
          <label>Cégnév<input name="company" maxlength="160" /></label>
          <label>Telefon<input name="phone" maxlength="80" /></label>
          <label>Fejlesztés típusa
            <select name="projectType">
              <option value="Egyedi AI/programfejlesztés">Egyedi AI/programfejlesztés</option>
              <option value="FoglalóFlow / miniweb / foglalás">FoglalóFlow / miniweb / foglalás</option>
              <option value="Automatizálás">Automatizálás</option>
              <option value="Belső admin rendszer">Belső admin rendszer</option>
              <option value="Egyéb">Egyéb</option>
            </select>
          </label>
          <label>Rövid leírás*<textarea name="message" required maxlength="1800" rows="4" placeholder="Mit szeretnél megoldani? Kik használnák? Mi lenne a fő cél?"></textarea></label>
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
            "Rendben. Megnyitottam az ajánlatkérő űrlapot. Írd le röviden, mire lenne szükséged, és e-mailben jelentkezünk."
          );
          openLeadForm();
          return;
        }

        sendChatMessage(button.dataset.question || button.textContent);
      });
    });

    addMessage(
      "assistant",
      "Szia! A Laprix AI Studio asszisztense vagyok. Kérdezhetsz a FoglalóFlow-ról, PostPilot HU-ról, Kiadviáról vagy egyedi AI/programfejlesztésről."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
