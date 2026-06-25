// public/js/minside.js — innlogging + visning av oppdrag
document.addEventListener("DOMContentLoaded", () => {
  const loggInnSeksjon = document.getElementById("minside-logg-inn");
  const innholdSeksjon = document.getElementById("minside-innhold");
  const navnEl = document.getElementById("bruker-navn");

  async function visRiktigVisning() {
    try {
      const meg = await fetchJSON("/api/minside/meg");
      if (navnEl) navnEl.textContent = meg.navn || meg.epost;
      loggInnSeksjon.style.display = "none";
      innholdSeksjon.style.display = "block";
      lastOppdrag();
    } catch {
      loggInnSeksjon.style.display = "flex";
      innholdSeksjon.style.display = "none";
    }
  }

  const form = document.getElementById("form-minside-logg-inn");
  if (form) {
    const melding = document.getElementById("minside-melding");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      skjulMelding(melding);
      const knapp = form.querySelector("button[type=submit]");
      knapp.disabled = true;
      const epost = document.getElementById("mi-epost").value.trim();
      const passord = document.getElementById("mi-passord").value;
      try {
        const svar = await fetchJSON("/api/minside/logg-inn", { method: "POST", body: { epost, passord } });
        if (svar && svar.admin) {
          window.location.href = "admin.html";
          return;
        }
        await visRiktigVisning();
      } catch (err) {
        visFeil(melding, err.message);
        knapp.disabled = false;
      }
    });
  }

  const loggUt = document.getElementById("minside-logg-ut");
  if (loggUt) {
    loggUt.addEventListener("click", async () => {
      await fetchJSON("/api/minside/logg-ut", { method: "POST" });
      await visRiktigVisning();
    });
  }

  async function lastOppdrag() {
    let data;
    try {
      data = await fetchJSON("/api/minside/oppdrag");
    } catch {
      return;
    }
    tegnKolonne("oppdrag-tilgjengelig", data.tilgjengelig);
    tegnKolonne("oppdrag-aktivt", data.aktivt);
    tegnKolonne("oppdrag-ferdig", data.ferdig);
  }

  function tegnKolonne(id, liste) {
    const container = document.getElementById(id);
    container.innerHTML = "";
    if (!liste || liste.length === 0) {
      container.innerHTML = '<p class="oppdrag-tom">Ingenting her ennå.</p>';
      return;
    }
    liste.forEach((o) => {
      const kort = document.createElement("div");
      kort.className = "oppdrag-kort";
      const h = document.createElement("h4");
      h.textContent = o.tittel;
      kort.appendChild(h);
      if (o.beskrivelse) {
        const p = document.createElement("p");
        p.textContent = o.beskrivelse;
        kort.appendChild(p);
      }
      container.appendChild(kort);
    });
  }

  visRiktigVisning();
});
