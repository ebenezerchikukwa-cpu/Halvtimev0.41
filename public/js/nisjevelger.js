// public/js/nisjevelger.js
// Bygger nisje-knappene (toggle av/på) inni et gitt container-element, og
// en "Annet"-knapp som åpner et fritekstfelt. Brukes på både creator- og
// bedrift-skjemaet. Hentes alltid friskt fra /api/nisjer så lista holdes i
// sync med backend.
//
// Bruk:
//   const velger = await lagNisjevelger(containerEl, { label: "..." });
//   velger.hentValgte()  -> ["Mat", "Trening og helse"]
//   velger.hentAnnet()   -> "fritekst" (tom streng hvis ikke brukt)

async function lagNisjevelger(container, opts = {}) {
  let nisjer = [];
  try {
    nisjer = await fetchJSON("/api/nisjer");
  } catch {
    nisjer = [];
  }

  const valgt = new Set();

  const grid = document.createElement("div");
  grid.className = "nisje-grid";

  nisjer.forEach((navn) => {
    const knapp = document.createElement("button");
    knapp.type = "button";
    knapp.className = "nisje-knapp";
    knapp.textContent = navn;
    knapp.setAttribute("aria-pressed", "false");
    knapp.addEventListener("click", () => {
      if (valgt.has(navn)) {
        valgt.delete(navn);
        knapp.classList.remove("is-valgt");
        knapp.setAttribute("aria-pressed", "false");
      } else {
        valgt.add(navn);
        knapp.classList.add("is-valgt");
        knapp.setAttribute("aria-pressed", "true");
      }
    });
    grid.appendChild(knapp);
  });

  // "Annet"-knapp
  const annetKnapp = document.createElement("button");
  annetKnapp.type = "button";
  annetKnapp.className = "nisje-knapp";
  annetKnapp.textContent = "Annet";
  annetKnapp.setAttribute("aria-pressed", "false");
  grid.appendChild(annetKnapp);

  const annetFelt = document.createElement("input");
  annetFelt.type = "text";
  annetFelt.className = "nisje-annet";
  annetFelt.placeholder = "Beskriv selv";
  annetFelt.style.display = "none";
  annetFelt.setAttribute("aria-label", "Beskriv nisjen din");

  let annetAktiv = false;
  annetKnapp.addEventListener("click", () => {
    annetAktiv = !annetAktiv;
    annetKnapp.classList.toggle("is-valgt", annetAktiv);
    annetKnapp.setAttribute("aria-pressed", annetAktiv ? "true" : "false");
    annetFelt.style.display = annetAktiv ? "block" : "none";
    if (annetAktiv) annetFelt.focus();
    else annetFelt.value = "";
  });

  container.appendChild(grid);
  container.appendChild(annetFelt);

  return {
    hentValgte: () => Array.from(valgt),
    hentAnnet: () => (annetAktiv ? annetFelt.value.trim() : ""),
    harNoe: () => valgt.size > 0 || (annetAktiv && annetFelt.value.trim().length > 0),
  };
}
