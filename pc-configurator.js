(function () {
  "use strict";

  const API_BASE_URL = (window.LAPRIX_CHAT_CONFIG && window.LAPRIX_CHAT_CONFIG.apiBaseUrl)
    ? window.LAPRIX_CHAT_CONFIG.apiBaseUrl.replace(/\/$/, "")
    : "";

  const PC_DATA = {
    platforms: {
      amd: [
        { value: "am4_ddr4", label: "AMD AM4 / DDR4 – ár-érték, költséghatékony" },
        { value: "am5_ddr5", label: "AMD AM5 / DDR5 – újabb platform, jobb bővíthetőség" }
      ],
      intel: [
        { value: "lga1700_ddr4", label: "Intel LGA1700 / DDR4 – költséghatékony Intel" },
        { value: "lga1700_ddr5", label: "Intel LGA1700 / DDR5 – erősebb, újabb memória" },
        { value: "lga1851_ddr5", label: "Intel LGA1851 / DDR5 – újabb Intel irány" }
      ],
      recommend: [
        { value: "recommend", label: "Ajánljatok platformot a felhasználás alapján" }
      ]
    },
    cpus: {
      am4_ddr4: ["AMD Ryzen 5 5600", "AMD Ryzen 7 5700X", "AMD Ryzen 7 5700X3D", "Ajánljatok AM4 processzort"],
      am5_ddr5: ["AMD Ryzen 5 7600", "AMD Ryzen 7 7700", "AMD Ryzen 7 7800X3D", "AMD Ryzen 9 7900", "Ajánljatok AM5 processzort"],
      lga1700_ddr4: ["Intel Core i5-12400F", "Intel Core i5-13400F", "Intel Core i5-14400F", "Ajánljatok LGA1700 DDR4 processzort"],
      lga1700_ddr5: ["Intel Core i5-14400F", "Intel Core i5-14600KF", "Intel Core i7-14700F", "Ajánljatok LGA1700 DDR5 processzort"],
      lga1851_ddr5: ["Intel Core Ultra 5 irány", "Intel Core Ultra 7 irány", "Ajánljatok LGA1851 processzort"],
      recommend: ["Ajánljatok processzort"]
    },
    motherboards: {
      am4_ddr4: ["B550 alaplap – jó ár/érték", "B550 Wi-Fi alaplap", "X570 / prémium AM4 alaplap", "Ajánljatok AM4 alaplapot"],
      am5_ddr5: ["B650 alaplap – jó ár/érték", "B650 Wi-Fi alaplap", "X670 / prémium AM5 alaplap", "Ajánljatok AM5 alaplapot"],
      lga1700_ddr4: ["B660 / B760 DDR4 alaplap", "B760 DDR4 Wi-Fi alaplap", "Z790 DDR4 alaplap", "Ajánljatok Intel DDR4 alaplapot"],
      lga1700_ddr5: ["B760 DDR5 alaplap", "B760 DDR5 Wi-Fi alaplap", "Z790 DDR5 alaplap", "Ajánljatok Intel DDR5 alaplapot"],
      lga1851_ddr5: ["B860 / középkategória DDR5 irány", "Z890 / prémium DDR5 irány", "Ajánljatok LGA1851 alaplapot"],
      recommend: ["Ajánljatok alaplapot"]
    },
    ramTypes: {
      am4_ddr4: ["DDR4"],
      am5_ddr5: ["DDR5"],
      lga1700_ddr4: ["DDR4"],
      lga1700_ddr5: ["DDR5"],
      lga1851_ddr5: ["DDR5"],
      recommend: ["Ajánlás alapján"]
    },
    usageRecommendations: {
      office: { title: "Irodai / tanulós gép", ram: "16", gpu: "integrated", storage: "1tb", note: "Gyors SSD, halk működés, alacsony fogyasztás. Külön videókártya általában nem szükséges." },
      gaming_1080p: { title: "1080p gamer gép", ram: "16", gpu: "mid", storage: "1tb", note: "Ár/érték gamer konfiguráció, külön videókártyával és jó szellőzésű házzal." },
      gaming_1440p: { title: "1440p gamer gép", ram: "32", gpu: "upper", storage: "1tb", note: "Erősebb videókártya, 32 GB RAM és jobb processzor ajánlott." },
      gaming_4k: { title: "4K gamer gép", ram: "32", gpu: "high", storage: "2tb", note: "Felsőkategóriás videókártya, erős tápegység és jó hűtés szükséges." },
      streaming: { title: "Játék + stream gép", ram: "32", gpu: "nvidia_prefer", storage: "2tb", note: "Erős CPU, 32 GB RAM és NVIDIA irány előnyös lehet streameléshez." },
      video_editing: { title: "Videóvágó / tartalomgyártó gép", ram: "32", gpu: "nvidia_prefer", storage: "2tb", note: "Sok RAM, gyors NVMe SSD, erős CPU és megfelelő GPU ajánlott." },
      dev: { title: "Fejlesztői gép", ram: "32", gpu: "mid", storage: "2tb", note: "32 GB RAM, gyors SSD, stabil platform. GPU igény a fejlesztési területtől függ." },
      ai_3d: { title: "AI / 3D / Unreal Engine gép", ram: "64", gpu: "high", storage: "2tb_plus", note: "Nagy RAM, erős NVIDIA GPU, gyors SSD és erős hűtés ajánlott." },
      custom: { title: "Egyedi / vegyes használat", ram: "32", gpu: "recommend", storage: "1tb", note: "A pontos konfigurációt a leírt programok és célok alapján érdemes véglegesíteni." }
    }
  };

  const qs = (selector) => document.querySelector(selector);

  function opt(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  function setOptions(select, items, placeholder) {
    select.innerHTML = "";
    if (placeholder) select.appendChild(opt("", placeholder));
    items.forEach((item) => {
      select.appendChild(typeof item === "string" ? opt(item, item) : opt(item.value, item.label));
    });
  }

  function data(form) {
    const out = {};
    new FormData(form).forEach((v, k) => out[k] = String(v || "").trim());
    return out;
  }

  function updatePlatforms() {
    const brand = qs("#cpuBrand").value || "recommend";
    const platforms = PC_DATA.platforms[brand] || PC_DATA.platforms.recommend;
    setOptions(qs("#platform"), platforms, "Válassz platformot...");
    if (platforms.length === 1) qs("#platform").value = platforms[0].value;
    updatePlatformParts();
  }

  function updatePlatformParts() {
    const platform = qs("#platform").value || "recommend";
    setOptions(qs("#cpu"), PC_DATA.cpus[platform] || PC_DATA.cpus.recommend, "Válassz processzort...");
    setOptions(qs("#motherboard"), PC_DATA.motherboards[platform] || PC_DATA.motherboards.recommend, "Válassz alaplap kategóriát...");
    const rams = PC_DATA.ramTypes[platform] || PC_DATA.ramTypes.recommend;
    setOptions(qs("#ramType"), rams, "");
    if (rams.length) qs("#ramType").value = rams[0];
    updateSummary();
  }

  function applyUsage() {
    const rec = PC_DATA.usageRecommendations[qs("#pcUsage").value];
    if (rec) {
      qs("#ram").value = rec.ram;
      qs("#gpu").value = rec.gpu;
      qs("#storage").value = rec.storage;
    }
    updateSummary();
  }

  function ft(v) {
    return new Intl.NumberFormat("hu-HU").format(v) + " Ft";
  }

  function estimate(d) {
    let base = Math.max(220000, Number(d.budget || 0) * 0.82);
    base += ({8:0,16:15000,32:35000,64:85000,128:180000}[d.ram] || 0);
    base += ({integrated:-35000,entry:60000,mid:130000,upper:230000,high:430000,workstation:500000,nvidia_prefer:220000,amd_prefer:180000,recommend:120000}[d.gpu] || 0);
    base += ({'500gb':-15000,'1tb':0,'2tb':35000,'4tb':85000,'2tb_plus':75000}[d.storage] || 0);
    if ((d.platform || "").includes("ddr5")) base += 35000;

    base += ({none:0,'1tb_ssd':25000,'2tb_ssd':45000,'4tb_hdd':35000,'8tb_hdd':70000,not_sure:20000}[d.secondaryStorage] || 0);
    base += ({none:0,external_drive:35000,nas_later:0,important:20000}[d.backupNeed] || 0);

    if (d.gpuTarget === "1440p_high") base += 70000;
    if (d.gpuTarget === "4k") base += 180000;
    if (d.gpuTarget === "ai_vram") base += 220000;
    if (d.gpuTarget === "cuda") base += 120000;
    if (d.vram === "16gb") base += 90000;
    if (d.vram === "24gb_plus") base += 250000;
    if (d.fpsTarget === "high_refresh") base += 50000;
    if (d.fpsTarget === "competitive") base += 120000;

    if (d.cooling === "silent_tower") base += 25000;
    if (d.cooling === "dual_tower") base += 35000;
    if (d.cooling === "aio_240") base += 50000;
    if (d.cooling === "aio_280") base += 65000;
    if (d.cooling === "aio_360") base += 85000;
    if (d.cooling === "custom_loop_interest") base += 180000;

    if (d.caseFans === "extra_airflow") base += 18000;
    if (d.caseFans === "silent_fans") base += 35000;
    if (d.caseFans === "rgb_fans") base += 30000;

    if (d.caseSize === "large") base += 25000;
    if (d.caseStyle === "white") base += 25000;
    if (d.caseStyle === "glass") base += 20000;
    if (d.modding === "rgb") base += 25000;
    if (d.modding === "white_build") base += 35000;
    if (d.modding === "showcase") base += 45000;
    if (d.modding === "custom") base += 50000;
    if (d.cabling === "premium") base += 15000;
    if (d.cabling === "sleeved") base += 30000;
    if (d.noiseTarget === "quiet") base += 25000;
    if (d.noiseTarget === "very_quiet") base += 55000;

    if (d.psu === "premium") base += 30000;
    if (d.psu === "atx_3") base += 25000;
    if (d.psuWatt === "850w") base += 25000;
    if (d.psuWatt === "1000w_plus") base += 55000;

    if (d.os === "windows_install") base += 15000;
    if (d.os === "windows_license") base += 55000;
    if (d.softwareSetup === "office_browser") base += 10000;
    if (d.softwareSetup === "gaming") base += 12000;
    if (d.softwareSetup === "creator") base += 18000;
    if (d.wifi === "needed") base += 15000;
    if (d.monitorNeed === "1080p") base += 45000;
    if (d.monitorNeed === "1440p") base += 90000;
    if (d.monitorNeed === "4k") base += 130000;
    if (d.monitorNeed === "high_refresh") base += 110000;
    if (d.peripherals === "keyboard_mouse") base += 20000;
    if (d.peripherals === "full_set") base += 70000;
    if (d.peripherals === "headset") base += 25000;
    if (d.delivery === "personal_delivery") base += 15000;
    if (d.delivery === "weekend_delivery") base += 25000;
    if (d.dataMigration === "yes") base += 15000;
    return {
      low: Math.round(base / 10000) * 10000,
      high: Math.round((base * 1.18) / 10000) * 10000
    };
  }

  function depositText(e) {
    if (e.low >= 900000) return "Előleg: nagy értékű gépnél az alkatrészek teljes beszerzési ára előre fizetendő lehet.";
    if (e.low >= 600000) return "Előleg: várhatóan legalább 60–70%, vagy az alkatrészek beszerzési ára.";
    if (e.low >= 300000) return "Előleg: várhatóan legalább 50–60%.";
    return "Előleg: várhatóan legalább 50%, pontosítás után.";
  }

  function selected(id) {
    return qs(id)?.selectedOptions[0]?.textContent || "";
  }

  function updateSummary() {
    const form = qs("#pcConfiguratorForm");
    if (!form) return;
    const d = data(form);
    const rec = PC_DATA.usageRecommendations[d.usage];
    const e = estimate(d);
    qs("#pcSummaryContent").innerHTML = `
      <div class="pc-summary-list">
        <p><strong>Felhasználás:</strong> ${rec ? rec.title : "nincs kiválasztva"}</p>
        <p><strong>Platform:</strong> ${selected("#platform") || "nincs kiválasztva"}</p>
        <p><strong>CPU:</strong> ${d.cpu || "kézi ajánlás"}</p>
        <p><strong>Alaplap:</strong> ${d.motherboard || "kézi ajánlás"}</p>
        <p><strong>RAM:</strong> ${d.ram || "-"} GB ${d.ramType || ""}</p>
        <p><strong>GPU irány:</strong> ${selected("#gpu")}</p>
        <p><strong>GPU cél:</strong> ${selected("#gpuTarget") || "-"}</p>
        <p><strong>Tárhely:</strong> ${selected("#storage")}</p>
        <p><strong>Hűtés:</strong> ${selected("#cooling")}</p>
        <p><strong>Modding:</strong> ${selected("#modding") || "-"}</p>
        <p><strong>Átadás:</strong> ${selected("#delivery")}</p>
      </div>
      <div class="pc-ai-note">${rec ? rec.note : "Válassz felhasználást, hogy pontosabb előzetes irányt kapj."}</div>
    `;
    qs("#pcEstimate").innerHTML = `<strong>Becsült irányár:</strong><br>${ft(e.low)} – ${ft(e.high)}<br><small>${depositText(e)}</small>`;
  }

  function message(d) {
    const e = estimate(d);
    return `
Egyedi PC építés ajánlatkérés

Kapcsolat:
- Név: ${d.name}
- E-mail: ${d.email}
- Telefon: ${d.phone || "-"}
- Település / átadás helye: ${d.city || "-"}

Felhasználás:
- Fő cél: ${selected("#pcUsage")}
- Maximum keret: ${selected("#pcBudget")}
- Alkatrész állapot: ${selected("#partCondition")}
- Részletek: ${d.usageDetails || "-"}

Konfiguráció:
- CPU gyártó: ${selected("#cpuBrand")}
- Platform: ${selected("#platform")}
- Processzor: ${selected("#cpu")}
- Alaplap: ${selected("#motherboard")}
- RAM: ${d.ram} GB ${d.ramType}
- Videókártya irány: ${selected("#gpu")}
- GPU teljesítmény cél: ${selected("#gpuTarget")}
- VRAM igény: ${selected("#vram")}
- Monitor célfelbontás: ${selected("#targetResolution")}
- FPS cél: ${selected("#fpsTarget")}
- Fő tárhely: ${selected("#storage")}
- Második meghajtó: ${selected("#secondaryStorage")}
- Backup igény: ${selected("#backupNeed")}
- Gépház méret: ${selected("#caseSize")}
- Gépház stílus: ${selected("#caseStyle")}
- Hűtés: ${selected("#cooling")}
- Házventilátorok: ${selected("#caseFans")}
- Tápegység teljesítmény: ${selected("#psuWatt")}
- Tápegység: ${selected("#psu")}
- Modding: ${selected("#modding")}
- Kábelezés: ${selected("#cabling")}
- Zajszint cél: ${selected("#noiseTarget")}

Rendszer és kiegészítők:
- OS: ${selected("#os")}
- Alapprogramok: ${selected("#softwareSetup")}
- Wi-Fi / Bluetooth: ${selected("#wifi")}
- Monitor: ${selected("#monitorNeed")}
- Periféria: ${selected("#peripherals")}
- Adatmentés: ${selected("#dataMigration")}

Átadás:
- Mód: ${selected("#delivery")}
- Vármegye: ${selected("#county")}
- Határidő: ${selected("#deadline")}
- Megjegyzés: ${d.notes || "-"}

Előzetes irányár:
${ft(e.low)} – ${ft(e.high)}

Előleg megjegyzés:
${depositText(e)}

Fontos: ez nem végleges ajánlat. A végleges konfigurációt, árat, előleget és készletet kézi ellenőrzés után kell pontosítani.
`.trim();
  }

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = data(form);
    const status = qs("#pcFormStatus");

    if (!API_BASE_URL) {
      status.textContent = "Hiányzik az API beállítás. Kérlek írj e-mailt: hello@laprixaistudio.hu";
      status.className = "pc-form-status error";
      return;
    }

    status.textContent = "Ajánlatkérés küldése...";
    status.className = "pc-form-status";

    try {
      const res = await fetch(`${API_BASE_URL}/api/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          name: d.name,
          email: d.email,
          phone: d.phone || "",
          company: "Egyedi PC ajánlatkérés",
          projectType: "Egyedi PC építés / PC konfigurátor",
          message: message(d),
          pageUrl: window.location.href,
          conversation: []
        })
      });

      if (!res.ok) throw new Error(await res.text());

      status.textContent = "Köszönjük, a PC ajánlatkérés beérkezett. E-mailben jelentkezünk pontosítással.";
      status.className = "pc-form-status success";

      if (window.LaprixCookieConsent?.hasMarketingConsent?.() && typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-18144333266/10lHCLm_768cENKb8stD",
          value: 1.0,
          currency: "HUF"
        });
      }
    } catch (err) {
      status.textContent = "Nem sikerült elküldeni. Kérlek próbáld újra, vagy írj e-mailt: hello@laprixaistudio.hu";
      status.className = "pc-form-status error";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = qs("#pcConfiguratorForm");
    if (!form) return;
    qs("#cpuBrand").addEventListener("change", updatePlatforms);
    qs("#platform").addEventListener("change", updatePlatformParts);
    qs("#pcUsage").addEventListener("change", applyUsage);
    form.querySelectorAll("select, input, textarea").forEach((el) => {
      el.addEventListener("change", updateSummary);
      el.addEventListener("input", updateSummary);
    });
    form.addEventListener("submit", submit);
    updatePlatforms();
    updateSummary();
  });
})();
