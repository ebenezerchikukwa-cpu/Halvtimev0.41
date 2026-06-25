// public/js/main.js
// Delte hjelpefunksjoner brukt på flere sider.

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* tomt svar er ok */
  }
  if (!res.ok) {
    const feil = new Error(data.feil || "Noe gikk feil. Prøv igjen.");
    feil.status = res.status;
    throw feil;
  }
  return data;
}

function visFeil(boksEl, melding) {
  boksEl.textContent = melding;
  boksEl.classList.remove("is-success");
  boksEl.classList.add("is-error");
}

function visSuksess(boksEl, melding) {
  boksEl.textContent = melding;
  boksEl.classList.remove("is-error");
  boksEl.classList.add("is-success");
}

function skjulMelding(boksEl) {
  boksEl.classList.remove("is-error", "is-success");
  boksEl.textContent = "";
}
