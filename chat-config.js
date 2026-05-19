// Laprix AI Studio AI ChatLead V1.5 configuration.

window.LAPRIX_CHAT_CONFIG = {
  apiBaseUrl: "https://laprix-ai-chat-backend.onrender.com",
  privacyUrl: "https://laprixaistudio.hu/adatkezeles.html",
  contactEmail: "hello@laprixaistudio.hu",

  analytics: {
    // Ha később létrehozod a Google Ads conversion actiont,
    // ide kerülhet a teljes send_to érték, például:
    // googleAdsLeadSendTo: "AW-123456789/AbCdEfGhIjKlMnOpQr",
    googleAdsLeadSendTo: "",

    // Opcionális konverziós érték. Lead esetén elsőre maradhat 1.
    leadValue: 1.0,
    currency: "HUF"
  }
};
