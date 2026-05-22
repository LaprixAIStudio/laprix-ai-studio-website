(function () {
  "use strict";

  const STORAGE_KEY = "laprix_cookie_consent_v1";
  const GOOGLE_ADS_ID = window.LAPRIX_GOOGLE_ADS_ID || "AW-18144333266";

  function defaultConsent() {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      savedAt: null,
      version: 1,
    };
  }

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...defaultConsent(),
        ...parsed,
        necessary: true,
      };
    } catch (error) {
      return null;
    }
  }

  function saveConsent(consent) {
    const normalized = {
      ...defaultConsent(),
      ...consent,
      necessary: true,
      savedAt: new Date().toISOString(),
      version: 1,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {}

    applyConsent(normalized);
    hideBanner();
    return normalized;
  }

  function getConsent() {
    return readConsent() || defaultConsent();
  }

  function ensureGtagStub() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
  }

  function applyGoogleConsent(consent) {
    ensureGtagStub();

    const marketing = !!consent.marketing;
    const analytics = !!consent.analytics;

    window.gtag("consent", "update", {
      ad_storage: marketing ? "granted" : "denied",
      ad_user_data: marketing ? "granted" : "denied",
      ad_personalization: marketing ? "granted" : "denied",
      analytics_storage: analytics ? "granted" : "denied",
      functionality_storage: "granted",
      security_storage: "granted",
    });

    if (marketing) {
      loadGoogleAdsTag();
    }
  }

  function loadGoogleAdsTag() {
    if (!GOOGLE_ADS_ID || document.getElementById("laprix-google-ads-tag")) return;

    ensureGtagStub();

    const script = document.createElement("script");
    script.id = "laprix-google-ads-tag";
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GOOGLE_ADS_ID);
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", GOOGLE_ADS_ID);
  }

  function applyConsent(consent) {
    window.LAPRIX_COOKIE_CONSENT_STATE = consent;
    applyGoogleConsent(consent);
    document.dispatchEvent(new CustomEvent("laprix:cookie-consent-updated", { detail: consent }));
  }

  function hasAnalyticsConsent() {
    return !!getConsent().analytics;
  }

  function hasMarketingConsent() {
    return !!getConsent().marketing;
  }

  function injectStyles() {
    if (document.getElementById("laprix-cookie-consent-style")) return;

    const style = document.createElement("style");
    style.id = "laprix-cookie-consent-style";
    style.textContent = `
      .laprix-cookie-banner {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 16px;
        z-index: 9998;
        display: none;
        max-width: 1040px;
        margin: 0 auto;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 24px;
        background: rgba(8, 15, 30, 0.96);
        box-shadow: 0 28px 90px rgba(0,0,0,0.44);
        color: #eef6ff;
        backdrop-filter: blur(18px);
        overflow: hidden;
      }

      .laprix-cookie-banner.show {
        display: block;
      }

      .laprix-cookie-inner {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 18px;
        align-items: center;
        padding: 18px;
      }

      .laprix-cookie-title {
        display: flex;
        gap: 10px;
        align-items: center;
        font-weight: 950;
        margin-bottom: 6px;
      }

      .laprix-cookie-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: linear-gradient(135deg, #38d9ff, #9d7cff);
        box-shadow: 0 0 20px rgba(56,217,255,.45);
      }

      .laprix-cookie-text {
        color: #aebbd0;
        line-height: 1.5;
        font-size: 0.92rem;
        margin: 0;
      }

      .laprix-cookie-text a {
        color: #38d9ff;
      }

      .laprix-cookie-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .laprix-cookie-actions button,
      .laprix-cookie-settings-actions button {
        border: 0;
        border-radius: 999px;
        min-height: 40px;
        padding: 0 14px;
        cursor: pointer;
        font-weight: 900;
        font: inherit;
      }

      .laprix-cookie-primary {
        color: #06111f;
        background: linear-gradient(135deg, #38d9ff, #9d7cff);
      }

      .laprix-cookie-secondary {
        color: #eef6ff;
        border: 1px solid rgba(148, 163, 184, 0.24) !important;
        background: rgba(255,255,255,0.07);
      }

      .laprix-cookie-linkbtn {
        color: #aebbd0;
        background: transparent;
        text-decoration: underline;
      }

      .laprix-cookie-settings {
        display: none;
        border-top: 1px solid rgba(148, 163, 184, 0.16);
        padding: 0 18px 18px;
      }

      .laprix-cookie-settings.show {
        display: block;
      }

      .laprix-cookie-options {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .laprix-cookie-option {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 14px;
        align-items: center;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 16px;
        padding: 12px;
        background: rgba(255,255,255,0.035);
      }

      .laprix-cookie-option strong {
        display: block;
        margin-bottom: 4px;
      }

      .laprix-cookie-option span {
        display: block;
        color: #aebbd0;
        font-size: 0.84rem;
        line-height: 1.42;
      }

      .laprix-cookie-option input {
        width: 22px;
        height: 22px;
        accent-color: #38d9ff;
      }

      .laprix-cookie-settings-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      @media (max-width: 760px) {
        .laprix-cookie-inner {
          grid-template-columns: 1fr;
        }

        .laprix-cookie-actions,
        .laprix-cookie-settings-actions {
          justify-content: stretch;
        }

        .laprix-cookie-actions button,
        .laprix-cookie-settings-actions button {
          width: 100%;
        }

        .laprix-cookie-option {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildBanner() {
    if (document.getElementById("laprix-cookie-banner")) return;

    injectStyles();

    const banner = document.createElement("div");
    banner.id = "laprix-cookie-banner";
    banner.className = "laprix-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Süti és adatkezelési beállítások");

    banner.innerHTML = `
      <div class="laprix-cookie-inner">
        <div>
          <div class="laprix-cookie-title">
            <span class="laprix-cookie-dot"></span>
            <span>Süti és mérési beállítások</span>
          </div>
          <p class="laprix-cookie-text">
            A szükséges technikai tárolás a weboldal és a chat működéséhez kell. A Google Ads / konverziómérés
            csak marketing hozzájárulás után töltődik be. Részletek:
            <a href="/adatkezeles.html">Adatkezelési tájékoztató</a>.
          </p>
        </div>
        <div class="laprix-cookie-actions">
          <button type="button" class="laprix-cookie-primary" data-cookie-action="accept-all">Elfogadom</button>
          <button type="button" class="laprix-cookie-secondary" data-cookie-action="necessary-only">Csak szükségeseket</button>
          <button type="button" class="laprix-cookie-secondary" data-cookie-action="reject">Elutasítom</button>
          <button type="button" class="laprix-cookie-linkbtn" data-cookie-action="settings">Beállítások</button>
        </div>
      </div>
      <div class="laprix-cookie-settings" id="laprix-cookie-settings">
        <div class="laprix-cookie-options">
          <label class="laprix-cookie-option">
            <span>
              <strong>Szükséges</strong>
              <span>A weboldal, alap biztonság, chat session és beállítások működéséhez szükséges. Ez nem kapcsolható ki.</span>
            </span>
            <input type="checkbox" checked disabled>
          </label>
          <label class="laprix-cookie-option">
            <span>
              <strong>Analitika</strong>
              <span>Anonimizált vagy összesített látogatottsági méréshez használható későbbi analitikai eszközökhöz.</span>
            </span>
            <input type="checkbox" id="laprix-cookie-analytics">
          </label>
          <label class="laprix-cookie-option">
            <span>
              <strong>Marketing / Google Ads</strong>
              <span>Google Ads konverzióméréshez, ajánlatkérések méréséhez és hirdetési eredményességhez.</span>
            </span>
            <input type="checkbox" id="laprix-cookie-marketing">
          </label>
        </div>
        <div class="laprix-cookie-settings-actions">
          <button type="button" class="laprix-cookie-secondary" data-cookie-action="necessary-only">Csak szükségeseket</button>
          <button type="button" class="laprix-cookie-primary" data-cookie-action="save-settings">Beállítások mentése</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    banner.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cookie-action]");
      if (!button) return;

      const action = button.dataset.cookieAction;
      if (action === "accept-all") {
        saveConsent({ analytics: true, marketing: true });
      } else if (action === "necessary-only" || action === "reject") {
        saveConsent({ analytics: false, marketing: false });
      } else if (action === "settings") {
        toggleSettings(true);
      } else if (action === "save-settings") {
        const analytics = !!document.getElementById("laprix-cookie-analytics")?.checked;
        const marketing = !!document.getElementById("laprix-cookie-marketing")?.checked;
        saveConsent({ analytics, marketing });
      }
    });
  }

  function toggleSettings(show) {
    const settings = document.getElementById("laprix-cookie-settings");
    if (!settings) return;
    settings.classList.toggle("show", !!show);

    const current = getConsent();
    const analytics = document.getElementById("laprix-cookie-analytics");
    const marketing = document.getElementById("laprix-cookie-marketing");
    if (analytics) analytics.checked = !!current.analytics;
    if (marketing) marketing.checked = !!current.marketing;
  }

  function showBanner() {
    buildBanner();
    const banner = document.getElementById("laprix-cookie-banner");
    if (banner) banner.classList.add("show");
  }

  function hideBanner() {
    const banner = document.getElementById("laprix-cookie-banner");
    if (banner) banner.classList.remove("show");
  }

  function openSettings() {
    buildBanner();
    const banner = document.getElementById("laprix-cookie-banner");
    if (banner) banner.classList.add("show");
    toggleSettings(true);
  }

  function resetConsent() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {}
    applyConsent(defaultConsent());
    showBanner();
  }

  window.LaprixCookieConsent = {
    get: getConsent,
    save: saveConsent,
    openSettings,
    reset: resetConsent,
    hasAnalyticsConsent,
    hasMarketingConsent,
  };

  // Alapértelmezés: nincs opcionális mérés, amíg nincs döntés.
  applyConsent(getConsent());

  document.addEventListener("DOMContentLoaded", () => {
    buildBanner();

    document.querySelectorAll("[data-cookie-settings]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        openSettings();
      });
    });

    if (!readConsent()) {
      showBanner();
    }
  });
})();
