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
  omoss: null,
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
  forside_tagline: "Her møter creators og bedrifter hverandre. UGC gjort enkelt.",

  forside_leder_headline: "Ekte mennesker, ekte innhold, ekte resultater.",
  forside_leder_lede:
    "Sosiale medier er markedet i dag. HALVTIME kobler bedriften din med creators som lager autentisk innhold folk faktisk bryr seg om — videoer, bilder og konsepter som konverterer. Riktige profiler, riktige oppdrag, ingen gjettelek.",
  forside_visjon:
    "UGC står for «user-generated content» — innhold laget av vanlige folk og creators, ikke av et reklamebyrå. Det er ikke en trend, men et skifte i hvordan folk oppdager og velger merkevarer. Rundt 82 % av forbrukere sier de er mer tilbøyelige til å kjøpe fra en merkevare som bruker innhold laget av ekte folk. Reklame fungerer ikke som før: alle har egne feeder og algoritmer, og tillit avgjør alt. Målet vårt er å løfte synligheten til norske selskaper på en autentisk og rimelig måte — ved å koble dem med creators som skaper innhold folk bryr seg om.",

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
// ---- "Om oss"-side: faste seksjoner med redigerbare spørsmål/svar --------

// Hver seksjon har fast id + redigerbar tittel. Spørsmålene under kan
// legges til, endres og slettes fritt i admin. Juridisk-teksten lagres
// separat og vises i en egen boks nederst på siden.
export const OMOSS_DEFAULTS = {
  seksjoner: [
    {
      id: "om",
      tittel: "Om HALVTIME",
      sporsmaal: [
        {
          id: "om-1",
          sporsmaal: "Hva er HALVTIME?",
          svar:
            "HALVTIME er en norsk plattform som kobler bedrifter med innholdskapere, mikroinfluensere og creators som lager innhold folk faktisk bryr seg om. Vi gjør det enklere for bedrifter å finne riktige personer til kampanjer, og enklere for creators å få betalte oppdrag uten å måtte jage samarbeid alene. I stedet for at bedrifter bruker timer på research, tilfeldige DM-er og usikre avtaler, samler HALVTIME begge sider på ett sted. Vårt mål er enkelt: riktig creator til riktig oppdrag.",
        },
        {
          id: "om-2",
          sporsmaal: "Hva tror dere på?",
          svar:
            "Vi tror ikke at flest følgere alltid betyr best resultat. Ofte er det mindre og mer troverdige profiler som skaper innhold som føles ekte, relevant og nært målgruppen. Derfor handler HALVTIME om kvalitet, match og gjennomføring — ikke bare tall. For bedrifter betyr det mindre tid brukt på leting, bedre oversikt og større trygghet før innhold publiseres. For creators betyr det flere muligheter, tydeligere oppdrag og en mer profesjonell vei inn i betalte samarbeid. HALVTIME er bygget for det norske markedet, med fokus på ekte innhold, ryddig kommunikasjon og samarbeid som gir mening for begge parter.",
        },
      ],
    },
    {
      id: "bedrifter",
      tittel: "For bedrifter",
      sporsmaal: [
        {
          id: "bed-1",
          sporsmaal: "Hvorfor bør bedriften vår bruke HALVTIME?",
          svar:
            "Fordi dere slipper å gjøre hele jobben selv. Mange bedrifter vet at creator-markedsføring kan fungere, men bruker unødvendig mye tid på å finne riktige profiler, sende meldinger, vente på svar og vurdere hvem som faktisk passer. HALVTIME hjelper dere med å finne creators som matcher målgruppen, budskapet og budsjettet deres. Vi gjør prosessen enklere, mer strukturert og mer profesjonell — fra første forespørsel til ferdig innhold.",
        },
        {
          id: "bed-2",
          sporsmaal: "Hva slags bedrifter passer HALVTIME for?",
          svar:
            "HALVTIME passer spesielt godt for små og mellomstore bedrifter som ønsker mer synlighet, bedre innhold til sosiale medier eller samarbeid med lokale og norske creators. Det kan være nettbutikker, restauranter, treningssentre, klesmerker, arrangementer, tjenestebedrifter, produkter eller merkevarer som ønsker å nå målgruppen sin gjennom TikTok, Instagram, Snapchat eller YouTube.",
        },
        {
          id: "bed-3",
          sporsmaal: "Hva får vi som bedrift?",
          svar:
            "Dere får hjelp til å finne relevante creators, sette opp et tydelig samarbeid og gjennomføre kampanjen på en ryddig måte. Målet er at dere skal bruke mindre tid på research og mer tid på resultatet: innhold, synlighet og bedre kontakt med målgruppen. HALVTIME hjelper med å vurdere hvilke creators som passer, hvor mange som trengs, og hvordan kampanjen bør settes opp ut fra målet og budsjettet deres.",
        },
        {
          id: "bed-4",
          sporsmaal: "Må vi vite nøyaktig hvilken creator vi vil ha?",
          svar:
            "Nei. Det er nettopp derfor HALVTIME finnes. Dere kan sende inn hva dere ønsker å promotere, hvem dere vil nå, hvilket budsjett dere ser for dere og hva slags innhold dere ønsker. Deretter hjelper HALVTIME med å finne ut hvilke creators som passer best. Dere trenger ikke ha hele kampanjen ferdig planlagt før dere tar kontakt.",
        },
        {
          id: "bed-5",
          sporsmaal: "Hvor mange creators trenger vi?",
          svar:
            "Det finner HALVTIME ut sammen med dere. Antall creators avhenger av målet med kampanjen, budsjettet, ønsket rekkevidde, type innhold, plattform, nisje og hvor raskt dere ønsker synlighet. Noen bedrifter trenger bare én riktig creator for å teste markedet. Andre kan ha nytte av flere creators samtidig for å skape mer volum, mer variasjon og bredere synlighet.",
        },
        {
          id: "bed-6",
          sporsmaal: "Har bedriften kontroll før innhold publiseres?",
          svar:
            "Ja. Bedriften har siste ord før noe publiseres, med mindre noe annet er avtalt på forhånd. Det betyr at innhold kan sendes til godkjenning før publisering, slik at dere får sjekket at budskap, produktinformasjon, merkevare og merking er riktig. Dette gir bedriften trygghet, samtidig som creator fortsatt får rom til å lage innhold som føles ekte og naturlig for sin egen profil.",
        },
        {
          id: "bed-7",
          sporsmaal: "Er dette bare for store kampanjer?",
          svar:
            "Nei. HALVTIME er laget for å gjøre creator-samarbeid mer tilgjengelig, også for bedrifter som ikke har store markedsbudsjetter. Dere kan starte med ett enkelt oppdrag, teste responsen og bygge videre derfra.",
        },
        {
          id: "bed-8",
          sporsmaal: "Hva koster det?",
          svar:
            "Pris avhenger av oppdragets størrelse, plattform, creator, innholdstype, antall creators og hvor mye innhold som skal lages. Når dere sender inn en forespørsel, kan HALVTIME hjelpe dere med å finne et realistisk nivå ut fra budsjettet deres. Dere binder dere ikke til noe bare ved å sende inn interesse.",
        },
        {
          id: "bed-9",
          sporsmaal: "Hvordan starter vi?",
          svar:
            "Send inn en bedriftsforespørsel på nettsiden. Fortell kort hva dere tilbyr, hvem dere ønsker å nå, hvilket budsjett dere ser for dere og hva slags samarbeid dere ønsker. Deretter tar HALVTIME kontakt videre.",
        },
      ],
    },
    {
      id: "creators",
      tittel: "For creators",
      sporsmaal: [
        {
          id: "cre-1",
          sporsmaal: "Hvorfor bør jeg registrere meg hos HALVTIME?",
          svar:
            "Fordi HALVTIME kan gjøre det enklere å få betalte oppdrag fra bedrifter som faktisk passer profilen din. I stedet for at du må vente på at noen kontakter deg, eller sende masse meldinger selv, kan du bli en del av en database der vi matcher creators med relevante oppdrag.",
        },
        {
          id: "cre-2",
          sporsmaal: "Må jeg ha mange følgere?",
          svar:
            "Nei. HALVTIME handler ikke bare om store profiler. Mikro- og nano-creators kan være veldig verdifulle fordi de ofte har høyere tillit, mer ekte engasjement og en tydeligere relasjon til følgerne sine. Det viktigste er at du lager innhold som passer en målgruppe, og at du kan levere seriøst når du får et oppdrag.",
        },
        {
          id: "cre-3",
          sporsmaal: "Hvilke plattformer gjelder?",
          svar:
            "Vi ser etter creators på blant annet TikTok, Instagram, Snapchat og YouTube. Har du en aktiv profil, en tydelig stil eller en målgruppe bedrifter kan være interessert i, kan du registrere deg.",
        },
        {
          id: "cre-4",
          sporsmaal: "Hva slags oppdrag kan jeg få?",
          svar:
            "Det kan være innholdsproduksjon, produktomtaler, korte videoer, kampanjer, UGC-innhold, event-promotering eller andre typer samarbeid. Oppdragene varierer ut fra hva bedriften trenger og hva som passer profilen din.",
        },
        {
          id: "cre-5",
          sporsmaal: "Er jeg garantert oppdrag hvis jeg registrerer meg?",
          svar:
            "Nei. Registrering betyr at du kan bli vurdert for relevante samarbeid, men HALVTIME kan ikke garantere oppdrag. Vi matcher basert på behovet til bedriften, målgruppe, innholdsstil, plattform og hva som passer best for oppdraget.",
        },
        {
          id: "cre-6",
          sporsmaal: "Må jeg betale for å registrere meg?",
          svar:
            "Nei. Registrering som creator er gratis i startfasen. HALVTIME tjener penger når samarbeid gjennomføres, ikke ved at creators betaler for å stå i en liste.",
        },
        {
          id: "cre-7",
          sporsmaal: "Kan jeg si nei til oppdrag?",
          svar:
            "Ja. Du bestemmer selv hvilke samarbeid du vil takke ja til. Et godt samarbeid må føles riktig både for bedriften og for deg som creator.",
        },
        {
          id: "cre-8",
          sporsmaal: "Må jeg ha erfaring med betalte samarbeid?",
          svar:
            "Nei. Du trenger ikke ha lang erfaring med betalte samarbeid for å registrere deg. Det viktigste er at du er seriøs, svarer ryddig, følger instrukser og kan levere innhold til avtalt tid. HALVTIME skal gjøre det enklere for nye creators å komme inn i markedet på en mer profesjonell måte.",
        },
        {
          id: "cre-9",
          sporsmaal: "Hvordan blir jeg med?",
          svar:
            "Fyll ut creator-skjemaet på nettsiden. Legg inn informasjon om kanalene dine, hva slags innhold du lager og hvilke samarbeid du kunne vært interessert i. Hvis profilen din passer et oppdrag, tar HALVTIME kontakt.",
        },
      ],
    },
    {
      id: "faq",
      tittel: "Ofte stilte spørsmål",
      sporsmaal: [
        {
          id: "faq-1",
          sporsmaal: "Hva er forskjellen på HALVTIME og et vanlig influencer-byrå?",
          svar:
            "HALVTIME starter mer fleksibelt og tilgjengelig. Vi fokuserer på matching mellom bedrifter og creators, spesielt i mikro- og nano-segmentet. Målet er å gjøre samarbeid enklere, raskere og mer treffsikkert uten at prosessen føles tung eller uoversiktlig.",
        },
        {
          id: "faq-2",
          sporsmaal: "Er HALVTIME bare en liste over creators?",
          svar:
            "Nei. Verdien ligger ikke i å ha flest mulig navn i en database. Verdien ligger i å finne riktig match, følge opp prosessen og lære av hvilke samarbeid som faktisk fungerer.",
        },
        {
          id: "faq-3",
          sporsmaal: "Jobber HALVTIME kun med norske creators?",
          svar:
            "Fokuset vårt er det norske markedet, norske bedrifter og creators som kan nå relevante målgrupper i Norge.",
        },
        {
          id: "faq-4",
          sporsmaal: "Hvorfor satser HALVTIME på ekte creators når KI-innhold blir bedre?",
          svar:
            "Fordi ekte mennesker fortsatt skaper en type tillit som KI ikke kan kopiere fullt ut. Forbrukere merker fort når innhold føles kunstig, generisk eller upersonlig. HALVTIME bygger på idéen om at troverdig innhold fra riktige personer kan gi bedre effekt enn masseprodusert reklame.",
        },
        {
          id: "faq-5",
          sporsmaal: "Er et samarbeid bindende når man sender inn skjema?",
          svar:
            "Nei. Innsending av skjema er ikke bindende. Det er en måte å melde interesse på. Videre avtale, pris, innhold, frister og forventninger avklares før et samarbeid starter.",
        },
      ],
    },
  ],
  juridisk:
    "HALVTIME er en formidler mellom bedrifter og creators. Alle samarbeid skal gjennomføres på en ryddig måte, med tydelige forventninger mellom partene før oppdrag starter. Creators er selv ansvarlige for at innhold de publiserer følger gjeldende lover, regler og plattformenes retningslinjer. Betalt samarbeid, reklame, sponsing eller mottatte produkter skal merkes tydelig i tråd med norske regler for markedsføring. Bedrifter er ansvarlige for at informasjon, påstander, produkter og kampanjemateriell de gir til creators er korrekt og lovlig å bruke i markedsføring. HALVTIME kan bistå med matching, struktur og kommunikasjon, men gir ikke juridisk rådgivning. Endelige avtaler, betaling, rettigheter til innhold, frister, godkjenning og bruk av materiale bør avklares skriftlig mellom partene før samarbeid gjennomføres. Bedriften bør få mulighet til å godkjenne innhold før publisering, med mindre noe annet er avtalt. Creators skal få nødvendige instrukser før oppdraget starter, slik at innholdet kan leveres i tråd med bedriftens forventninger og gjeldende regler. Ved å bruke HALVTIME aksepterer både bedrifter og creators at samarbeid skal gjennomføres profesjonelt, ærlig og i tråd med gjeldende regler.",
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
// ---- "Om oss"-innhold -----------------------------------------------------

export function hentOmOss() {
  const db = read();
  if (!db.omoss || !Array.isArray(db.omoss.seksjoner)) {
    return structuredClone(OMOSS_DEFAULTS);
  }
  return db.omoss;
}

export function lagreOmOss(omoss) {
  const db = read();
  db.omoss = omoss;
  write(db);
  return db.omoss;
}
