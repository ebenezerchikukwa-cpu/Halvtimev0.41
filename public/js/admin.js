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
  const steg1 = document.getElementById("admin-steg1");
  const steg2 = document.getElementById("admin-steg2");

  async function visAdminHvisInnlogget() {
    let status = { steg: "ut" };
    try {
      status = await fetchJSON("/api/admin/status");
    } catch {
      status = { steg: "ut" };
    }

    if (status.steg === "inne") {
      loggInnSeksjon.style.display = "none";
      innholdSeksjon.style.display = "block";
      lastAlt();
    } else if (status.steg === "tilgangskode") {
      loggInnSeksjon.style.display = "block";
      innholdSeksjon.style.display = "none";
      steg1.style.display = "none";
      steg2.style.display = "block";
    } else {
      loggInnSeksjon.style.display = "block";
      innholdSeksjon.style.display = "none";
      steg1.style.display = "block";
      steg2.style.display = "none";
    }
  }
// Lag 1: e-post + passord
  const loggInnForm = document.getElementById("form-admin-logg-inn");
  if (loggInnForm) {
    const melding = document.getElementById("admin-logg-inn-melding");
    loggInnForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      skjulMelding(melding);
      const epost = document.getElementById("admin-epost").value.trim();
      const passord = document.getElementById("admin-passord").value;
      try {
        await fetchJSON("/api/admin/logg-inn", { method: "POST", body: { epost, passord } });
        document.getElementById("admin-passord").value = "";
        await visAdminHvisInnlogget();
      } catch (err) {
        visFeil(melding, err.message);
      }
    });
  }

  // Lag 2: tilgangskode
  const tilgangskodeForm = document.getElementById("form-admin-tilgangskode");
  if (tilgangskodeForm) {
    const melding = document.getElementById("admin-tilgangskode-melding");
    tilgangskodeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      skjulMelding(melding);
      const tilgangskode = document.getElementById("admin-tilgangskode").value;
      try {
        await fetchJSON("/api/admin/tilgangskode", { method: "POST", body: { tilgangskode } });
        document.getElementById("admin-tilgangskode").value = "";
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
    lastOmOss();
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
      tegnKreatorKort(rader);
    } else {
      const rader = await fetchJSON("/api/admin/forespoersler/bedrifter");
      tegnBedriftKort(rader);
    }
  }

  function lagKortRad(nokkel, verdi, erLenke) {
    if (!verdi) return "";
    const innhold = erLenke
      ? `<a href="${erLenke}${escapeHtml(verdi)}">${escapeHtml(verdi)}</a>`
      : escapeHtml(verdi);
    return `
      <div class="foresp-kort__rad">
        <span class="foresp-kort__nokkel">${nokkel}</span>
        <span class="foresp-kort__verdi">${innhold}</span>
      </div>`;
  }

  function lagNisjeMerker(nisjer) {
    if (!Array.isArray(nisjer) || !nisjer.length) return "";
    const merker = nisjer
      .map((n) => `<span class="foresp-kort__nisje">${escapeHtml(n)}</span>`)
      .join("");
    return `<div class="foresp-kort__nisjer">${merker}</div>`;
  }

  function tegnKreatorKort(rader) {
    const beholder = document.getElementById("kort-kreatorer");
    beholder.innerHTML = "";
    if (!rader.length) {
      beholder.innerHTML = '<p class="admin-empty">Ingen forespørsler ennå.</p>';
      return;
    }
    rader.forEach((r) => {
      const kort = document.createElement("div");
      kort.className = "foresp-kort";
      kort.innerHTML = `
        <div class="foresp-kort__topp">
          <span class="foresp-kort__navn">${escapeHtml(r.navn || "—")}</span>
          <span class="foresp-kort__dato">${formatDato(r.opprettet)}</span>
        </div>
        ${lagKortRad("E-post", r.epost, "mailto:")}
        ${lagKortRad("Telefon", r.telefon, "tel:")}
        ${lagKortRad("TikTok", r.tiktok)}
        ${lagKortRad("Instagram", r.instagram)}
        ${lagKortRad("Snapchat", r.snapchat)}
        ${lagKortRad("YouTube", r.youtube)}
        ${lagKortRad("Følgere", r.følgere)}
        ${lagNisjeMerker(r.nisjer)}
        ${r.melding ? `<div class="foresp-kort__melding">${escapeHtml(r.melding)}</div>` : ""}
      `;
      beholder.appendChild(kort);
    });
  }

  function tegnBedriftKort(rader) {
    const beholder = document.getElementById("kort-bedrifter");
    beholder.innerHTML = "";
    if (!rader.length) {
      beholder.innerHTML = '<p class="admin-empty">Ingen forespørsler ennå.</p>';
      return;
    }
    rader.forEach((r) => {
      const kort = document.createElement("div");
      kort.className = "foresp-kort";
      kort.innerHTML = `
        <div class="foresp-kort__topp">
          <span class="foresp-kort__navn">${escapeHtml(r.bedriftsnavn || "—")}</span>
          <span class="foresp-kort__dato">${formatDato(r.opprettet)}</span>
        </div>
        ${lagKortRad("Kontakt", r.kontaktperson)}
        ${lagKortRad("E-post", r.epost, "mailto:")}
        ${lagKortRad("Telefon", r.telefon, "tel:")}
        ${lagNisjeMerker(r.nisjer)}
        ${r.melding ? `<div class="foresp-kort__melding">${escapeHtml(r.melding)}</div>` : ""}
      `;
      beholder.appendChild(kort);
    });
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
        document.getElementById("mailutkast-tekst").value = lagMailutkast(svar.epost, svar.kode);
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


// ---- Mailutkast for nye Min side-innlogginger ----------------------------

  function lagMailutkast(epost, kode) {
    return [
      "Hei,",
      "",
      "Velkommen til HALVTIME!",
      "",
      "Brukernavnet ditt er: " + epost,
      "Passordet ditt er: " + kode,
      "",
      "Ta godt vare på passordet ditt, da du trenger dette for å logge inn på Min side.",
      "",
      "På Min side får du oversikt over tilgjengelige oppdrag som kan passe for deg. Du kan også bli kontaktet direkte på e-post eller telefon dersom vi finner et oppdrag som matcher profilen din.",
      "",
      "Vi gleder oss til å ha deg med videre.",
      "Lykke til med å kickstarte creator-karrieren din med både små og store oppdrag!",
      "",
      "Hilsen",
      "HALVTIME",
    ].join("\n");
  }

  const kopierKnapp = document.getElementById("kopier-mailutkast");
  if (kopierKnapp) {
    kopierKnapp.addEventListener("click", async () => {
      const tekst = document.getElementById("mailutkast-tekst").value;
      try {
        await navigator.clipboard.writeText(tekst);
        const original = kopierKnapp.textContent;
        kopierKnapp.textContent = "Kopiert ✓";
        setTimeout(() => (kopierKnapp.textContent = original), 2000);
      } catch {
        // Hvis utklippstavlen ikke er tilgjengelig: marker teksten så
        // brukeren kan kopiere manuelt med Ctrl/Cmd+C.
        const felt = document.getElementById("mailutkast-tekst");
        felt.focus();
        felt.select();
      }
    });
  }
// ---- Om oss-redigering ---------------------------------------------------

  let omossData = null;

  async function lastOmOss() {
    const beholder = document.getElementById("omoss-redigering");
    if (!beholder) return;
    try {
      omossData = await fetchJSON("/api/omoss");
    } catch {
      beholder.innerHTML = '<p class="admin-empty">Kunne ikke laste Om oss.</p>';
      return;
    }
    document.getElementById("omoss-juridisk").value = omossData.juridisk || "";
    tegnOmOss();
  }

  function tegnOmOss() {
    const beholder = document.getElementById("omoss-redigering");
    beholder.innerHTML = "";

    omossData.seksjoner.forEach((seksjon, sIndex) => {
      const gruppe = document.createElement("div");
      gruppe.className = "admin-group";

      const tittel = document.createElement("h3");
      tittel.textContent = seksjon.tittel;
      gruppe.appendChild(tittel);

      // Redigerbar seksjonstittel
      const tittelFelt = document.createElement("div");
      tittelFelt.className = "field";
      tittelFelt.innerHTML = `<label>Seksjonstittel</label>`;
      const tittelInput = document.createElement("input");
      tittelInput.value = seksjon.tittel;
      tittelInput.addEventListener("input", () => {
        seksjon.tittel = tittelInput.value;
        tittel.textContent = tittelInput.value;
      });
      tittelFelt.appendChild(tittelInput);
      gruppe.appendChild(tittelFelt);

      // Spørsmålene
      seksjon.sporsmaal.forEach((qa, qIndex) => {
        const kort = document.createElement("div");
        kort.style.cssText =
          "border:1px solid var(--rule-soft); padding:14px; margin-bottom:14px; background:var(--paper);";

        const sporsmaalFelt = document.createElement("div");
        sporsmaalFelt.className = "field";
        sporsmaalFelt.style.marginBottom = "10px";
        sporsmaalFelt.innerHTML = `<label>Spørsmål</label>`;
        const sInput = document.createElement("input");
        sInput.value = qa.sporsmaal;
        sInput.addEventListener("input", () => (qa.sporsmaal = sInput.value));
        sporsmaalFelt.appendChild(sInput);
        kort.appendChild(sporsmaalFelt);

        const svarFelt = document.createElement("div");
        svarFelt.className = "field";
        svarFelt.style.marginBottom = "10px";
        svarFelt.innerHTML = `<label>Svar</label>`;
        const svarInput = document.createElement("textarea");
        svarInput.rows = 3;
        svarInput.value = qa.svar;
        svarInput.addEventListener("input", () => (qa.svar = svarInput.value));
        svarFelt.appendChild(svarInput);
        kort.appendChild(svarFelt);

        // Knapper: opp / ned / slett
        const knappeRad = document.createElement("div");
        knappeRad.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";

        const opp = document.createElement("button");
        opp.type = "button";
        opp.className = "mini-knapp";
        opp.textContent = "↑ Flytt opp";
        opp.disabled = qIndex === 0;
        opp.addEventListener("click", () => {
          const liste = seksjon.sporsmaal;
          [liste[qIndex - 1], liste[qIndex]] = [liste[qIndex], liste[qIndex - 1]];
          tegnOmOss();
        });

        const ned = document.createElement("button");
        ned.type = "button";
        ned.className = "mini-knapp";
        ned.textContent = "↓ Flytt ned";
        ned.disabled = qIndex === seksjon.sporsmaal.length - 1;
        ned.addEventListener("click", () => {
          const liste = seksjon.sporsmaal;
          [liste[qIndex + 1], liste[qIndex]] = [liste[qIndex], liste[qIndex + 1]];
          tegnOmOss();
        });

        const slett = document.createElement("button");
        slett.type = "button";
        slett.className = "mini-knapp mini-knapp--fare";
        slett.textContent = "Slett";
        slett.addEventListener("click", () => {
          if (!confirm("Slette dette spørsmålet?")) return;
          seksjon.sporsmaal.splice(qIndex, 1);
          tegnOmOss();
        });

        knappeRad.appendChild(opp);
        knappeRad.appendChild(ned);
        knappeRad.appendChild(slett);
        kort.appendChild(knappeRad);

        gruppe.appendChild(kort);
      });

      // Legg til nytt spørsmål i denne seksjonen
      const leggTil = document.createElement("button");
      leggTil.type = "button";
      leggTil.className = "btn btn--ghost";
      leggTil.textContent = "+ Nytt spørsmål";
      leggTil.addEventListener("click", () => {
        seksjon.sporsmaal.push({
          id: "qa-" + Date.now(),
          sporsmaal: "Nytt spørsmål",
          svar: "Skriv svaret her.",
        });
        tegnOmOss();
      });
      gruppe.appendChild(leggTil);

      beholder.appendChild(gruppe);
    });
  }

  const omossLagreKnapp = document.getElementById("omoss-lagre");
  if (omossLagreKnapp) {
    omossLagreKnapp.addEventListener("click", async () => {
      if (!omossData) return;
      omossData.juridisk = document.getElementById("omoss-juridisk").value;
      const lagretMsg = document.getElementById("omoss-lagret");
      omossLagreKnapp.disabled = true;
      try {
        await fetchJSON("/api/omoss", { method: "POST", body: omossData });
        lagretMsg.classList.add("is-visible");
        setTimeout(() => lagretMsg.classList.remove("is-visible"), 2500);
      } catch (err) {
        alert(err.message);
      } finally {
        omossLagreKnapp.disabled = false;
      }
    });
  }
  // ---- Faner i admin -------------------------------------------------------

  const fanerBeholder = document.getElementById("admin-faner");
  if (fanerBeholder) {
    const faner = fanerBeholder.querySelectorAll(".admin-fane");
    const seksjoner = document.querySelectorAll(".admin-section[data-fane]");
    faner.forEach((fane) => {
      fane.addEventListener("click", () => {
        const mal = fane.dataset.mal;
        faner.forEach((f) => f.classList.toggle("is-aktiv", f === fane));
        seksjoner.forEach((s) => {
          s.classList.toggle("is-synlig", s.dataset.fane === mal);
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }
  visAdminHvisInnlogget();
});
