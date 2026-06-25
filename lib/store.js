// lib/store.js
// Minimal, dependency-free JSON-file "database".
//
// HALVTIME starter bevisst enkelt: én lokal JSON-fil holder for å bevise
// konseptet. Når volumet krever det kan denne byttes ut med en ordentlig
// database, uten at resten av koden trenger å endre seg, så lenge de
// samme funksjonene beholdes.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "db.json");

const EMPTY_DB = {
  kreatorer: [],
  oppdrag: [],
  kreatorForespoersler: [],
  bedriftForespoersler: [],
  innhold: {},
};

// De faste nisjene som vises som knapper i creator-skjemaet, og som
// statistikken grupperes etter. "annet" har egen fritekst.
export const NISJER = [
  "Lifestyle / hverdagsliv",
  "Mat",
  "Trening og helse",
  "Beauty / hudpleie / grooming",
  "Fashion / klær / streetwear",
  "Reise og opplevelser",
  "Uteliv og events",
  "Bolig og interiør",
  "Tech og gadgets",
  "Business / student / karriere",
];

// Standardtekster som boksene viser før noe er redigert i admin-panelet.
export const INNHOLD_DEFAULTS = {
  forside_metabar_venstre: "CREATOR-MARKED · NORGE",
  forside_fase_badge: "FASE 01 — TIDLIG TILGANG",
  forside_tagline: "Her finner norske creators og bedrifter hverandre, og får ting gjort.",

  forside_leder_headline: "Laget for de som leverer. Ikke bare de med flest følgere.",
  forside_leder_lede:
    "Trenger du innhold som faktisk føles ekte? HALVTIME kobler bedrifter med aktuelle SoMe-profiler som kan lage videoer, bilder og konsepter folk faktisk bryr seg om. Ingen gjettelek. Ingen random DM-runder. Bare riktige folk til de riktige oppdragene.",
  forside_visjon:
    "Markedsføring fungerer ikke på samme måte som før. Folk forventer innhold som føles ekte, relevant og tilpasset det de faktisk bryr seg om. Derfor må creator-markedet bli enklere og mer treffsikkert. HALVTIME skal gjøre det lettere for bedrifter å finne creators som passer, og for creators å få oppdrag basert på kvalitet, relevans og gjennomføring, ikke bare antall følgere.",

  forside_kreator_intro: "Lag content for bedrifter som faktisk betaler. Du bestemmer hva du sier ja til.",
  forside_kreator_steg1_tittel: "Send en forespørsel",
  forside_kreator_steg1_tekst: "Fortell oss hva du lager og hvor du legger det ut.",
  forside_kreator_steg2_tittel: "Vi matcher deg",
  forside_kreator_steg2_tekst: "Med bedrifter som passer nisjen din.",
  forside_kreator_steg3_tittel: "Få betalt",
  forside_kreator_steg3_tekst: "Du lager content og får betalt. Enkelt, uten unødvendige mellomledd.",

  forside_bedrift_intro: "Finn riktig creator for produktet ditt, uten timer med research og DM-er.",
  forside_bedrift_steg1_tittel: "Si hva du leter etter",
  forside_bedrift_steg1_tekst: "Nisje, budsjett og type content.",
  forside_bedrift_steg2_tittel: "Vi matcher manuelt",
  forside_bedrift_steg2_tekst: "Mens basen bygges, finner vi creators for hånd.",
  forside_bedrift_steg3_tittel: "Få forslag på mail",
  forside_bedrift_steg3_tekst: "Helt uforpliktende, og uten kostnad.",

  bedrifter_lede:
    "Basen er fortsatt under oppbygging, så fritt søk er ikke åpent ennå. Si hva dere leter etter, så matcher vi dere manuelt med relevante creators. Gratis, og uten at dere binder dere til noe.",
  bedrifter_status:
    "Vi tar inn creators fortløpende innenfor utvalgte nisjer. Send forespørselen under, så hører dere fra oss på mail når vi har et godt forslag. Som regel innen et par virkedager.",

  minside_intro: "Her ser du oppdragene dine når vi har koblet deg på noe.",

  kontakt_intro: "Lurer du på noe? Bare ta kontakt.",
  kontakt_epost: "kontakt@halvtime.no",
  kontakt_telefon: "",
  kontakt_adresse: "",
  kontakt_annet: "",
};

function ensureDb() {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
  }
}

function read() {
  ensureDb();
  try {
    const raw = readFileSync(DB_PATH, "utf-8");
    return { ...EMPTY_DB, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

function write(db) {
  ensureDb();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---- Kreatør-innlogginger (Min side, opprettes av admin) -----------------

export function finnKreatorVedEpost(epost) {
  const db = read();
  return db.kreatorer.find((k) => k.epost.toLowerCase() === String(epost).toLowerCase());
}

export function finnKreatorVedId(id) {
  const db = read();
  return db.kreatorer.find((k) => k.id === id);
}

export function opprettKreator({ navn, epost, passordHash }) {
  const db = read();
  const ny = {
    id: randomUUID(),
    navn: navn || "",
    epost: String(epost).toLowerCase(),
    passordHash,
    opprettet: new Date().toISOString(),
  };
  db.kreatorer.push(ny);
  write(db);
  return ny;
}

export function hentAlleKreatorer() {
  return read()
    .kreatorer.slice()
    .reverse()
    .map(({ passordHash, ...resten }) => resten);
}

export function slettKreator(id) {
  const db = read();
  db.kreatorer = db.kreatorer.filter((k) => k.id !== id);
  db.oppdrag = db.oppdrag.filter((o) => o.kreatorId !== id);
  write(db);
}

// ---- Oppdrag (vises på Min side) -----------------------------------------

const OPPDRAG_STATUSER = ["tilgjengelig", "aktivt", "ferdig"];

export function hentOppdragForKreator(kreatorId) {
  return read()
    .oppdrag.filter((o) => o.kreatorId === kreatorId)
    .sort((a, b) => new Date(b.opprettet) - new Date(a.opprettet));
}

export function opprettOppdrag({ kreatorId, tittel, beskrivelse, status }) {
  const db = read();
  const nytt = {
    id: randomUUID(),
    kreatorId,
    tittel: tittel || "",
    beskrivelse: beskrivelse || "",
    status: OPPDRAG_STATUSER.includes(status) ? status : "tilgjengelig",
    opprettet: new Date().toISOString(),
  };
  db.oppdrag.push(nytt);
  write(db);
  return nytt;
}

export function slettOppdrag(id) {
  const db = read();
  db.oppdrag = db.oppdrag.filter((o) => o.id !== id);
  write(db);
}

// ---- Forespørsler ---------------------------------------------------------

export function lagreKreatorForespoersel(data) {
  const db = read();
  const rad = { id: randomUUID(), opprettet: new Date().toISOString(), ...data };
  db.kreatorForespoersler.push(rad);
  write(db);
  return rad;
}

export function lagreBedriftForespoersel(data) {
  const db = read();
  const rad = { id: randomUUID(), opprettet: new Date().toISOString(), ...data };
  db.bedriftForespoersler.push(rad);
  write(db);
  return rad;
}

export function hentAlleKreatorForespoersler() {
  return read().kreatorForespoersler.slice().reverse();
}

export function hentAlleBedriftForespoersler() {
  return read().bedriftForespoersler.slice().reverse();
}

// ---- Innhold (tekstene i boksene på siden) -------------------------------

export function hentInnhold() {
  const db = read();
  return { ...INNHOLD_DEFAULTS, ...db.innhold };
}

export function lagreInnhold(delvisInnhold) {
  const db = read();
  db.innhold = { ...db.innhold, ...delvisInnhold };
  write(db);
  return { ...INNHOLD_DEFAULTS, ...db.innhold };
}

// ---- Statistikk -----------------------------------------------------------

function tellNisjer(liste) {
  const tellinger = {};
  for (const rad of liste) {
    const nisjer = Array.isArray(rad.nisjer) ? rad.nisjer : [];
    for (const n of nisjer) {
      tellinger[n] = (tellinger[n] || 0) + 1;
    }
  }
  return Object.entries(tellinger)
    .map(([verdi, antall]) => ({ verdi, antall }))
    .sort((a, b) => b.antall - a.antall);
}

export function hentStatistikk() {
  const db = read();
  return {
    antallKreatorer: db.kreatorer.length,
    antallKreatorForespoersler: db.kreatorForespoersler.length,
    antallBedriftForespoersler: db.bedriftForespoersler.length,
    kreatorNisjer: tellNisjer(db.kreatorForespoersler),
    bedriftNisjer: tellNisjer(db.bedriftForespoersler),
  };
}
