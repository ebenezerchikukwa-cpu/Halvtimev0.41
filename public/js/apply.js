// public/js/apply.js — creator-forespørsel (offentlig, ingen innlogging)
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-forespoersel");
  if (!form) return;

  const melding = document.getElementById("forespoersel-melding");
  const suksess = document.getElementById("forespoersel-suksess");
  const tearout = form.closest(".tearout");

  const velger = await lagNisjevelger(document.getElementById("nisjevelger"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    skjulMelding(melding);
    const knapp = form.querySelector("button[type=submit]");
    knapp.disabled = true;

    const data = {
      navn: document.getElementById("f-navn").value.trim(),
      epost: document.getElementById("f-epost").value.trim(),
      telefon: document.getElementById("f-telefon").value.trim(),
      nisjer: velger.hentValgte(),
      annet: velger.hentAnnet(),
      tiktok: document.getElementById("f-tiktok").value.trim(),
      instagram: document.getElementById("f-instagram").value.trim(),
      snapchat: document.getElementById("f-snapchat").value.trim(),
      youtube: document.getElementById("f-youtube").value.trim(),
      følgere: document.getElementById("f-følgere").value.trim(),
      melding: document.getElementById("f-melding").value.trim(),
    };

    try {
      await fetchJSON("/api/kreator/forespoersel", { method: "POST", body: data });
      tearout.classList.add("is-done");
      suksess.classList.add("is-visible");
    } catch (err) {
      visFeil(melding, err.message);
      knapp.disabled = false;
    }
  });
});
