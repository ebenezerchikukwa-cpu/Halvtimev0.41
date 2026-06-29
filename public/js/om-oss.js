// public/js/om-oss.js
// Henter "Om oss"-innholdet fra API-et og bygger klikkbare spørsmål.

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("omoss-innhold");

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  let data;
  try {
    const res = await fetch("/api/omoss");
    if (!res.ok) throw new Error();
    data = await res.json();
  } catch {
    container.innerHTML = '<p class="admin-empty">Kunne ikke laste innholdet akkurat nå.</p>';
    return;
  }

  const seksjoner = Array.isArray(data.seksjoner) ? data.seksjoner : [];
  container.innerHTML = "";

  seksjoner.forEach((seksjon) => {
    const sporsmaal = Array.isArray(seksjon.sporsmaal) ? seksjon.sporsmaal : [];
    if (!sporsmaal.length) return;

    const wrap = document.createElement("div");
    wrap.className = "omoss-seksjon";

    const h2 = document.createElement("h2");
    h2.textContent = seksjon.tittel || "";
    wrap.appendChild(h2);

    sporsmaal.forEach((qa) => {
      const rad = document.createElement("div");
      rad.className = "qa";
      rad.innerHTML = `
        <button type="button" class="qa__sporsmaal">${escapeHtml(qa.sporsmaal)}</button>
        <div class="qa__svar">${escapeHtml(qa.svar)}</div>
      `;
      const knapp = rad.querySelector(".qa__sporsmaal");
      knapp.addEventListener("click", () => rad.classList.toggle("is-open"));
      wrap.appendChild(rad);
    });

    container.appendChild(wrap);
  });

  // Juridisk-boksen nederst
  if (data.juridisk && String(data.juridisk).trim()) {
    document.getElementById("omoss-juridisk-tekst").textContent = data.juridisk;
    document.getElementById("omoss-juridisk-boks").style.display = "block";
  }
});
