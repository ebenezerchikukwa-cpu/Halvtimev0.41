// server.js
// HALVTIME — backend for forespørsler, Min side og admin.
import "dotenv/config";
import express from "express";
import session from "express-session";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NISJER,
  finnKreatorVedEpost,
  finnKreatorVedId,
  opprettKreator,
  hentAlleKreatorer,
  slettKreator,
  hentOppdragForKreator,
  opprettOppdrag,
  slettOppdrag,
  lagreKreatorForespoersel,
  lagreBedriftForespoersel,
  hentAlleKreatorForespoersler,
  hentAlleBedriftForespoersler,
  hentInnhold,
  lagreInnhold,
  hentStatistikk,
} from "./lib/store.js";
import {
  hashPassord,
  sjekkPassord,
  krevInnlogging,
  krevAdmin,
  erGyldigEpost,
  lagTilfeldigKode,
} from "./lib/auth.js";
import { tilCsv } from "./lib/csv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Admin-innlogging. Standardverdiene gjør at siden virker på Render selv
// om man glemmer å sette miljøvariablene. Bytt dem gjerne i .env / Render
// for ekstra sikkerhet.
const ADMIN_EPOST = (process.env.ADMIN_EPOST || "admin@halvtime.no").toLowerCase();
const ADMIN_PASSORD = process.env.ADMIN_PASSORD || "halvtime567";
const ADMIN_TILGANGSKODE = process.env.ADMIN_TILGANGSKODE || "ungezimbo567";

app.use(express.json());

// Render (og de fleste skytjenester) kjører appen bak en proxy som
// håndterer HTTPS. Express må stole på den proxyen, ellers tror den at
// forbindelsen er usikker og dropper innloggingscookien. Dette er den
// vanligste grunnen til at "innlogging ikke henger med" i produksjon.
app.set("trust proxy", 1);

const I_PRODUKSJON = process.env.NODE_ENV === "production";

app.use(
  session({
    name: "halvtime.sid",
    secret: process.env.SESSION_SECRET || "endre-denne-hemmeligheten-i-produksjon",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: I_PRODUKSJON,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

app.use(express.static(join(__dirname, "public")));

// Hjelper: rens en liste med nisjer mot den faste lista, pluss valgfri
// fritekst for "annet".
function rensNisjer(valgte, annetTekst) {
  const liste = Array.isArray(valgte) ? valgte : [];
  const gyldige = liste.filter((n) => NISJER.includes(n));
  const annet = String(annetTekst || "").trim();
  if (annet) gyldige.push("Annet: " + annet);
  return gyldige;
}

// ---------------------------------------------------------------------
// Creator-forespørsel (åpen for alle, ingen innlogging)
// ---------------------------------------------------------------------

app.post("/api/kreator/forespoersel", (req, res) => {
  const {
    navn, epost, telefon, nisjer, annet,
    tiktok, instagram, snapchat, youtube, følgere, melding,
  } = req.body || {};

  if (!navn || !String(navn).trim()) {
    return res.status(400).json({ feil: "Skriv inn navnet ditt." });
  }
  if (!erGyldigEpost(epost)) {
    return res.status(400).json({ feil: "Skriv inn en gyldig e-postadresse." });
  }
  if (!telefon || !String(telefon).trim()) {
    return res.status(400).json({ feil: "Skriv inn telefonnummeret ditt." });
  }

  const valgteNisjer = rensNisjer(nisjer, annet);
  if (valgteNisjer.length === 0) {
    return res.status(400).json({ feil: "Velg minst én nisje (eller fyll inn “annet”)." });
  }

  const harPlattform = [tiktok, instagram, snapchat, youtube].some((v) => v && String(v).trim());
  if (!harPlattform) {
    return res.status(400).json({ feil: "Legg inn minst ett brukernavn (TikTok, Instagram, Snapchat eller YouTube)." });
  }

  const lagret = lagreKreatorForespoersel({
    navn: String(navn).trim(),
    epost: String(epost).trim(),
    telefon: String(telefon).trim(),
    nisjer: valgteNisjer,
    tiktok: tiktok || "",
    instagram: instagram || "",
    snapchat: snapchat || "",
    youtube: youtube || "",
    følgere: følgere || "",
    melding: melding || "",
  });

  res.json({ ok: true, id: lagret.id });
});

// ---------------------------------------------------------------------
// Bedrift-forespørsel (åpen for alle)
// ---------------------------------------------------------------------

app.post("/api/bedrift/forespoersel", (req, res) => {
  const { bedriftsnavn, kontaktperson, epost, telefon, nisjer, annet, melding } = req.body || {};

  if (!bedriftsnavn || !String(bedriftsnavn).trim()) {
    return res.status(400).json({ feil: "Skriv inn navnet på bedriften." });
  }
  if (!erGyldigEpost(epost)) {
    return res.status(400).json({ feil: "Skriv inn en gyldig e-postadresse." });
  }
  if (!telefon || !String(telefon).trim()) {
    return res.status(400).json({ feil: "Skriv inn et telefonnummer." });
  }

  const valgteNisjer = rensNisjer(nisjer, annet);
  if (valgteNisjer.length === 0) {
    return res.status(400).json({ feil: "Velg minst én type content (eller fyll inn “annet”)." });
  }

  const lagret = lagreBedriftForespoersel({
    bedriftsnavn: String(bedriftsnavn).trim(),
    kontaktperson: kontaktperson || "",
    epost: String(epost).trim(),
    telefon: String(telefon).trim(),
    nisjer: valgteNisjer,
    melding: melding || "",
  });

  res.json({ ok: true, id: lagret.id });
});

// ---------------------------------------------------------------------
// Min side — creator-innlogging (kontoer opprettes av admin)
// ---------------------------------------------------------------------

app.post("/api/minside/logg-inn", async (req, res) => {
  const { epost, passord } = req.body || {};
  const epostRen = String(epost || "").trim().toLowerCase();

  // Admin kan logge inn via samme skjema. Bruker man admin-eposten og
  // admin-passordet, får man admin-tilgang og sendes til /admin.html.
  if (epostRen === ADMIN_EPOST && passord === ADMIN_PASSORD) {
    req.session.erAdmin = true;
    return res.json({ admin: true });
  }

  const kreator = finnKreatorVedEpost(epostRen);
  if (!kreator || !(await sjekkPassord(passord || "", kreator.passordHash))) {
    return res.status(401).json({ feil: "Feil e-post eller kode." });
  }

  req.session.kreatorId = kreator.id;
  res.json({ navn: kreator.navn, epost: kreator.epost });
});

app.post("/api/minside/logg-ut", (req, res) => {
  if (req.session) req.session.kreatorId = null;
  res.json({ ok: true });
});

app.get("/api/minside/meg", (req, res) => {
  if (!req.session?.kreatorId) return res.status(401).json({ feil: "Ikke innlogget." });
  const kreator = finnKreatorVedId(req.session.kreatorId);
  if (!kreator) return res.status(401).json({ feil: "Ikke innlogget." });
  res.json({ navn: kreator.navn, epost: kreator.epost });
});

app.get("/api/minside/oppdrag", krevInnlogging, (req, res) => {
  const oppdrag = hentOppdragForKreator(req.session.kreatorId);
  res.json({
    tilgjengelig: oppdrag.filter((o) => o.status === "tilgjengelig"),
    aktivt: oppdrag.filter((o) => o.status === "aktivt"),
    ferdig: oppdrag.filter((o) => o.status === "ferdig"),
  });
});

// ---------------------------------------------------------------------
// Innhold (tekstene i boksene — redigeres i /admin.html)
// ---------------------------------------------------------------------

app.get("/api/nisjer", (req, res) => {
  res.json(NISJER);
});

app.get("/api/innhold", (req, res) => {
  res.json(hentInnhold());
});

app.post("/api/innhold", krevAdmin, (req, res) => {
  res.json(lagreInnhold(req.body || {}));
});
// "Om oss"-innhold: åpent å lese (siden viser det), kun admin kan endre.
app.get("/api/omoss", (req, res) => {
  res.json(hentOmOss());
});

app.post("/api/omoss", krevAdmin, (req, res) => {
  const data = req.body || {};
  if (!Array.isArray(data.seksjoner)) {
    return res.status(400).json({ feil: "Ugyldig innhold." });
  }
  res.json(lagreOmOss(data));
});
// ---------------------------------------------------------------------
// Admin-innlogging
// ---------------------------------------------------------------------

// Lag 1: e-post + passord. Setter et halvferdig flagg — IKKE full
// admin-tilgang ennå. Brukeren må gjennom lag 2 (tilgangskoden) etterpå.
app.post("/api/admin/logg-inn", (req, res) => {
  const { epost, passord } = req.body || {};
  const epostRen = String(epost || "").trim().toLowerCase();
  if (epostRen !== ADMIN_EPOST || passord !== ADMIN_PASSORD) {
    return res.status(401).json({ feil: "Feil e-post eller passord." });
  }
  req.session.adminSteg1 = true;
  req.session.erAdmin = false;
  res.json({ ok: true, trengerTilgangskode: true });
});

// Lag 2: tilgangskoden. Først her settes ekte admin-tilgang.
app.post("/api/admin/tilgangskode", (req, res) => {
  if (!req.session?.adminSteg1) {
    return res.status(401).json({ feil: "Logg inn med e-post og passord først." });
  }
  const { tilgangskode } = req.body || {};
  if (tilgangskode !== ADMIN_TILGANGSKODE) {
    return res.status(401).json({ feil: "Feil tilgangskode." });
  }
  req.session.erAdmin = true;
  req.session.adminSteg1 = false;
  res.json({ ok: true });
});

app.post("/api/admin/logg-ut", (req, res) => {
  if (req.session) {
    req.session.erAdmin = false;
    req.session.adminSteg1 = false;
  }
  res.json({ ok: true });
});

app.get("/api/admin/meg", (req, res) => {
  if (!req.session?.erAdmin) return res.status(401).json({ feil: "Ikke innlogget som admin." });
  res.json({ erAdmin: true });
});

// Forteller admin-siden hvilket steg man er på: ikke logget inn,
// midt i (trenger tilgangskode), eller ferdig innlogget.
app.get("/api/admin/status", (req, res) => {
  if (req.session?.erAdmin) return res.json({ steg: "inne" });
  if (req.session?.adminSteg1) return res.json({ steg: "tilgangskode" });
  res.json({ steg: "ut" });
});

// ---------------------------------------------------------------------
// Admin — creator-innlogginger (Min side-kontoer)
// ---------------------------------------------------------------------

app.get("/api/admin/kreatorer", krevAdmin, (req, res) => {
  res.json(hentAlleKreatorer());
});

// Oppretter en innlogging. Hvis ingen kode sendes, lager vi en tilfeldig
// og returnerer den i klartekst denne ene gangen, slik at admin kan
// kopiere den inn i en mail til creatoren.
app.post("/api/admin/kreatorer", krevAdmin, async (req, res) => {
  const { navn, epost, kode } = req.body || {};

  if (!erGyldigEpost(epost)) {
    return res.status(400).json({ feil: "Skriv inn en gyldig e-postadresse." });
  }
  if (finnKreatorVedEpost(epost)) {
    return res.status(409).json({ feil: "Det finnes allerede en innlogging med denne e-posten." });
  }

  const valgtKode = String(kode || "").trim() || lagTilfeldigKode();
  const passordHash = await hashPassord(valgtKode);
  const kreator = opprettKreator({ navn, epost, passordHash });

  res.json({ id: kreator.id, navn: kreator.navn, epost: kreator.epost, kode: valgtKode });
});

app.delete("/api/admin/kreatorer/:id", krevAdmin, (req, res) => {
  slettKreator(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Admin — oppdrag per creator
// ---------------------------------------------------------------------

app.get("/api/admin/kreatorer/:id/oppdrag", krevAdmin, (req, res) => {
  res.json(hentOppdragForKreator(req.params.id));
});

app.post("/api/admin/kreatorer/:id/oppdrag", krevAdmin, (req, res) => {
  const { tittel, beskrivelse, status } = req.body || {};
  if (!tittel || !String(tittel).trim()) {
    return res.status(400).json({ feil: "Gi oppdraget en tittel." });
  }
  const nytt = opprettOppdrag({
    kreatorId: req.params.id,
    tittel: String(tittel).trim(),
    beskrivelse: beskrivelse || "",
    status,
  });
  res.json(nytt);
});

app.delete("/api/admin/oppdrag/:id", krevAdmin, (req, res) => {
  slettOppdrag(req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------
// Admin — innsendinger, statistikk, CSV
// ---------------------------------------------------------------------

app.get("/api/admin/forespoersler/kreatorer", krevAdmin, (req, res) => {
  res.json(hentAlleKreatorForespoersler());
});

app.get("/api/admin/forespoersler/bedrifter", krevAdmin, (req, res) => {
  res.json(hentAlleBedriftForespoersler());
});

app.get("/api/admin/statistikk", krevAdmin, (req, res) => {
  res.json(hentStatistikk());
});

app.get("/api/admin/eksport/kreatorer.csv", krevAdmin, (req, res) => {
  const rader = hentAlleKreatorForespoersler().map((r) => ({
    ...r,
    nisjer: Array.isArray(r.nisjer) ? r.nisjer.join(" | ") : "",
  }));
  const csv = tilCsv(rader, [
    { felt: "opprettet", tittel: "Sendt" },
    { felt: "navn", tittel: "Navn" },
    { felt: "epost", tittel: "E-post" },
    { felt: "telefon", tittel: "Telefon" },
    { felt: "nisjer", tittel: "Nisjer" },
    { felt: "tiktok", tittel: "TikTok" },
    { felt: "instagram", tittel: "Instagram" },
    { felt: "snapchat", tittel: "Snapchat" },
    { felt: "youtube", tittel: "YouTube" },
    { felt: "følgere", tittel: "Følgere/rekkevidde" },
    { felt: "melding", tittel: "Melding" },
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="halvtime-creator-forespoersler.csv"');
  res.send(csv);
});

app.get("/api/admin/eksport/bedrifter.csv", krevAdmin, (req, res) => {
  const rader = hentAlleBedriftForespoersler().map((r) => ({
    ...r,
    nisjer: Array.isArray(r.nisjer) ? r.nisjer.join(" | ") : "",
  }));
  const csv = tilCsv(rader, [
    { felt: "opprettet", tittel: "Sendt" },
    { felt: "bedriftsnavn", tittel: "Bedrift" },
    { felt: "kontaktperson", tittel: "Kontaktperson" },
    { felt: "epost", tittel: "E-post" },
    { felt: "telefon", tittel: "Telefon" },
    { felt: "nisjer", tittel: "Ønsket content" },
    { felt: "melding", tittel: "Melding" },
  ]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="halvtime-bedrift-forespoersler.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`HALVTIME kjører på http://localhost:${PORT}`);
});
