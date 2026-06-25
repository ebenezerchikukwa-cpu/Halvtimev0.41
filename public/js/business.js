// public/js/business.js — bedrift-forespørsel (offentlig)
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-bedrift");
  if (!form) return;

  const melding = document.getElementById("bedrift-melding");
  const suksess = document.getElementById("bedrift-suksess");
  const tearout = form.closest(".tearout");

  const velger = await lagNisjevelger(document.getElementById("nisjevelger"));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    skjulMelding(melding);
    const knapp = form.querySelector("button[type=submit]");
    knapp.disabled = true;

    const data = {
      bedriftsnavn: document.getElementById("b-bedriftsnavn").value.trim(),
      kontaktperson: document.getElementById("b-kontaktperson").value.trim(),
      epost: document.getElementById("b-epost").value.trim(),
      telefon: document.getElementById("b-telefon").value.trim(),
      nisjer: velger.hentValgte(),
      annet: velger.hentAnnet(),
      melding: document.getElementById("b-melding").value.trim(),
    };

    try {
      await fetchJSON("/api/bedrift/forespoersel", { method: "POST", body: data });
      tearout.classList.add("is-done");
      suksess.classList.add("is-visible");
    } catch (err) {
      visFeil(melding, err.message);
      knapp.disabled = false;
    }
  });
});
