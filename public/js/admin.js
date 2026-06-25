// public/js/admin.js

const INNHOLD_FELTER = [
  "forside_metabar_venstre",
  "forside_fase_badge",
  "forside_tagline",
  "forside_leder_headline",
  "forside_leder_lede",
  "forside_visjon",
  "forside_kreator_intro",
  "forside_kreator_steg1_tittel",
  "forside_kreator_steg1_tekst",
  "forside_kreator_steg2_tittel",
  "forside_kreator_steg2_tekst",
  "forside_kreator_steg3_tittel",
  "forside_kreator_steg3_tekst",
  "forside_bedrift_intro",
  "forside_bedrift_steg1_tittel",
  "forside_bedrift_steg1_tekst",
  "forside_bedrift_steg2_tittel",
  "forside_bedrift_steg2_tekst",
  "forside_bedrift_steg3_tittel",
  "forside_bedrift_steg3_tekst",
  "bedrifter_lede",
  "bedrifter_status",
  "minside_intro",
  "kontakt_intro",
  "kontakt_epost",
  "kontakt_telefon",
  "kontakt_adresse",
  "kontakt_annet",
];

document.addEventListener("DOMContentLoaded", () => {
  const loggInnSeksjon = document.getElementById("admin-logg-inn");
  const innholdSeksjon = document.getElementById("admin-innhold");
  const loggUtKnapp = document.getElementById("admin-logg-ut");

  async function visAdminHvisInnlogget() {
    try {
      await fetchJSON("/api/admin/meg");
      loggInnSeksjon.style.display = "none";
      innholdSeksjon.style.display = "block";
      lastAlt();
    } catch {
      loggInnSeksjon.style.display = "block";
      innholdSeksjon.style.display = "none";
    }
  }

  const loggInnForm = document.getElementById("form-admin-logg-inn");
  if (loggInnForm) {
    const melding = document.getElementById("admin-logg-inn-melding");
    loggInnForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      skjulMelding(melding);
      const passord = document.getElementById("admin-passord").value;
      try {
        await fetchJSON("/api/admin/logg-inn", { method: "POST", body: { passord } });
        document.getElementById("admin-passord").value = "";
        await visAdminHvisInnlogget();
      } catch (err) {
        visFeil(melding, err.message);
      }
    });
  }

  if (loggUtKnapp) {
    loggUtKnapp.addEventListener("click", async () => {
      await fetchJSON("/api/admin/logg-ut", { method: "POST" });
      await visAdminHvisInnlogget();
    });
  }

  function lastAlt() {
    lastInnholdSkjema();
    lastStatistikk();
    lastTabell("kreatorer");
    lastTabell("bedrifter");
    lastKontoer();
  }

  // ---- Innhold -----------------------------------------------------------

  async function lastInnholdSkjema() {
    const innhold = await fetchJSON("/api/innhold");
    INNHOLD_FELTER.forEach((key) => {
      const el = document.getElementById("c-" + key);
      if (el && innhold[key] !== undefined) el.value = innhold[key];
    });
  }

  const innholdForm = document.getElementById("form-innhold");
  if (innholdForm) {
    innholdForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {};
      INNHOLD_FELTER.forEach((key) => {
        const el = document.getElementById("c-" + key);
        if (el) data[key] = el.value;
      });
      const lagretMsg = document.getElementById("innhold-lagret");
      const knapp = innholdForm.querySelector("button[type=submit]");
      knapp.disabled = true;
      try {
        await fetchJSON("/api/innhold", { method: "POST", body: data });
        lagretMsg.classList.add("is-visible");
        setTimeout(() => lagretMsg.classList.remove("is-visible"), 2500);
      } catch (err) {
        alert(err.message);
      } finally {
        knapp.disabled = false;
      }
    });
  }

  // ---- Statistikk ----------------------------------------------------------

  async function lastStatistikk() {
    const s = await fetchJSON("/api/admin/statistikk");
    document.getElementById("stat-kreatorer").textContent = s.antallKreatorer;
    document.getElementById("stat-kreator-forespoersler").textContent = s.antallKreatorForespoersler;
    document.getElementById("stat-bedrift-forespoersler").textContent = s.antallBedriftForespoersler;
    tegnStatbarer("statbar-kreator", s.kreatorNisjer);
    tegnStatbarer("statbar-bedrift", s.bedriftNisjer);
  }

  function tegnStatbarer(containerId, liste) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    if (!liste || !liste.length) {
      container.innerHTML = '<p class="admin-empty">Ingen data ennå.</p>';
      return;
    }
    const maks = Math.max(...liste.map((r) => r.antall));
    liste.forEach((rad) => {
      const row = document.createElement("div");
      row.className = "statbar-row";
      const prosent = Math.round((rad.antall / maks) * 100);
      row.innerHTML = `
        <span class="statlabel" title="${escapeHtml(rad.verdi)}">${escapeHtml(rad.verdi)}</span>
        <span class="track"><span class="fill" style="width:${prosent}%"></span></span>
        <span class="count">${rad.antall}</span>
      `;
      container.appendChild(row);
    });
  }

  // ---- Tabeller -------------------------------------------------------------

  async function lastTabell(type) {
    if (type === "kreatorer") {
      const rader = await fetchJSON("/api/admin/forespoersler/kreatorer");
      fyllTabell("tabell-kreatorer", rader, [
        { felt: "opprettet", format: formatDato },
        { felt: "navn" },
        { felt: "epost" },
        { felt: "telefon" },
        { felt: "nisjer", format: formatListe },
        { felt: "tiktok" },
        { felt: "instagram" },
        { felt: "snapchat" },
        { felt: "youtube" },
        { felt: "følgere" },
        { felt: "melding" },
      ]);
    } else {
      const rader = await fetchJSON("/api/admin/forespoersler/bedrifter");
      fyllTabell("tabell-bedrifter", rader, [
        { felt: "opprettet", format: formatDato },
        { felt: "bedriftsnavn" },
        { felt: "kontaktperson" },
        { felt: "epost" },
        { felt: "telefon" },
        { felt: "nisjer", format: formatListe },
        { felt: "melding" },
      ]);
    }
  }

  function fyllTabell(tbodyId, rader, kolonner) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if (!rader.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = kolonner.length;
      td.className = "admin-empty";
      td.textContent = "Ingen forespørsler ennå.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rader.forEach((rad) => {
      const tr = document.createElement("tr");
      kolonner.forEach((k) => {
        const td = document.createElement("td");
        let verdi = rad[k.felt];
        verdi = k.format ? k.format(verdi) : verdi;
        td.textContent = verdi || "—";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // ---- Creator-kontoer (Min side) ------------------------------------------

  const kontoForm = document.getElementById("form-konto");
  if (kontoForm) {
    const melding = document.getElementById("konto-melding");
    const kodeBoks = document.getElementById("konto-kode-boks");
    kontoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      skjulMelding(melding);
      kodeBoks.style.display = "none";
      const knapp = kontoForm.querySelector("button[type=submit]");
      knapp.disabled = true;
      const navn = document.getElementById("konto-navn").value.trim();
      const epost = document.getElementById("konto-epost").value.trim();
      const kode = document.getElementById("konto-kode").value.trim();
      try {
        const svar = await fetchJSON("/api/admin/kreatorer", {
          method: "POST",
          body: { navn, epost, kode },
        });
        document.getElementById("kode-epost").textContent = svar.epost;
        document.getElementById("kode-verdi").textContent = svar.kode;
        kodeBoks.style.display = "block";
        kontoForm.reset();
        lastKontoer();
      } catch (err) {
        visFeil(melding, err.message);
      } finally {
        knapp.disabled = false;
      }
    });
  }

  async function lastKontoer() {
    const kontoer = await fetchJSON("/api/admin/kreatorer");
    const tbody = document.getElementById("tabell-kontoer");
    tbody.innerHTML = "";
    if (!kontoer.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">Ingen innlogginger opprettet ennå.</td></tr>';
      return;
    }
    kontoer.forEach((k) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDato(k.opprettet)}</td>
        <td>${escapeHtml(k.navn || "—")}</td>
        <td>${escapeHtml(k.epost)}</td>
        <td></td>
      `;
      const knapp = document.createElement("button");
      knapp.className = "mini-knapp mini-knapp--fare";
      knapp.textContent = "Slett";
      knapp.addEventListener("click", async () => {
        if (!confirm(`Slette innloggingen til ${k.epost}? Oppdragene knyttet til den slettes også.`)) return;
        await fetchJSON("/api/admin/kreatorer/" + k.id, { method: "DELETE" });
        lastKontoer();
      });
      tr.querySelector("td:last-child").appendChild(knapp);
      tbody.appendChild(tr);
    });
  }

  // ---- Hjelpere -------------------------------------------------------------

  function formatDato(iso) {
    try {
      return new Date(iso).toLocaleString("no-NO", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  }

  function formatListe(v) {
    return Array.isArray(v) ? v.join(", ") : v || "";
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  visAdminHvisInnlogget();
});
