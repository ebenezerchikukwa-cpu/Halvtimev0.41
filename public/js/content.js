// public/js/content.js
// Henter tekstene fra /api/innhold og setter dem inn i alle elementer som
// har et data-c-attributt. HTML-en har alltid en hardkodet standardtekst
// i tillegg — så siden ser riktig ut selv om dette skriptet ikke kjører.
document.addEventListener("DOMContentLoaded", async () => {
  let innhold = {};
  try {
    innhold = await fetchJSON("/api/innhold");
    document.querySelectorAll("[data-c]").forEach((el) => {
      const key = el.getAttribute("data-c");
      if (innhold[key]) el.textContent = innhold[key];
    });
  } catch {
    // Beholder standardtekstene i HTML-en hvis dette feiler.
  }
  document.dispatchEvent(new CustomEvent("innhold:lastet", { detail: innhold }));
});
