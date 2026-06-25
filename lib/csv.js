// lib/csv.js
// Liten, avhengighetsfri CSV-bygger — nok til å lage filer Excel åpner
// riktig (semikolon-skilt, som er standard for norsk Excel, og med
// UTF-8 BOM så æøå vises riktig).

function celle(verdi) {
  const tekst = verdi === null || verdi === undefined ? "" : String(verdi);
  if (/[;"\n]/.test(tekst)) {
    return `"${tekst.replace(/"/g, '""')}"`;
  }
  return tekst;
}

export function tilCsv(rader, kolonner) {
  const header = kolonner.map((k) => celle(k.tittel)).join(";");
  const linjer = rader.map((rad) => kolonner.map((k) => celle(rad[k.felt])).join(";"));
  const BOM = "\uFEFF";
  return BOM + [header, ...linjer].join("\r\n") + "\r\n";
}
