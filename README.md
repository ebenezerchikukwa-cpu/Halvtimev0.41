# HALVTIME

Minimalistisk nettside med backend for creator-markedsplassen. Avis/retro-stil,
men med litt mer moderne interaksjon. Bygget som "Idé 3" i strateginotatet
(enkel entry, smal nisje), med ambisjonen mot "Idé 1" som visjon i teksten.

## Hva er med

**Offentlige sider** (`public/`):
- `index.html` — forside med hero, "for creators" / "for bedrifter"
- `kreator-forespoersel.html` — creator-forespørsel (ingen innlogging nødvendig)
- `bedrifter.html` — "finn creators"-side + uforpliktende forespørsel
- `kontakt.html` — e-post, telefon, adresse (redigeres i adminpanelet)
- `minside.html` — Min side: innlogging + oversikt over oppdrag

**Adminpanel** (`admin.html`, passordbeskyttet med `ADMIN_PASSORD`):
- **Statistikk** — antall forespørsler, og fordeling over nisjer (creators og bedrifter)
- **Innsendinger** — alle forespørsler i tabeller, med CSV-nedlasting (åpnes i Excel)
- **Min side-tilganger** — opprett innlogginger for creators du har koblet på et
  oppdrag. La kode-feltet stå tomt, så lages en tilfeldig kode du sender på mail.
- **Innhold på siden** — rediger alle tekstene på siden uten å røre kode

## Slik fungerer flyten

1. **Forespørsler er åpne for alle.** Både creators og bedrifter sender inn uten
   konto. Begge må oppgi e-post og telefon. Creators velger nisje(r) med knapper.
2. **Alt lagres i databasen** og vises/eksporteres fra adminpanelet. Ingen mail sendes.
3. **Min side** er kun for creators du selv har gitt tilgang. Du oppretter
   innloggingen i adminpanelet, sender e-post + kode manuelt, og creatoren logger
   inn for å se oppdrag (tilgjengelige / aktive / ferdige).

## Kom i gang lokalt

```bash
npm install
copy .env.example .env      # Windows (Mac/Linux: cp .env.example .env)
```

Åpne `.env` og sett et eget `ADMIN_PASSORD` (og gjerne en egen `SESSION_SECRET`).

```bash
npm start
```

Forsiden: <http://localhost:3000> — Adminpanel: <http://localhost:3000/admin.html>

## Om nisjene

De ti nisjene (pluss "Annet" med fritekst) er definert ett sted i backend
(`lib/store.js`, `NISJER`). Skjemaene henter lista derfra, og statistikken
grupperes etter de samme nisjene, så alt holdes i sync. Vil du endre nisjene,
endrer du bare den ene lista.

## Deploy

Vanlig Node.js-app uten eksterne avhengigheter. Kan kjøre på Render, Railway
eller en egen VPS. Sett miljøvariablene fra `.env.example` (inkl. `ADMIN_PASSORD`)
i plattformens dashboard. Husk `NODE_ENV=production` og en lang, tilfeldig
`SESSION_SECRET`.

`data/db.json` lever på serverens filsystem. På plattformer med "ephemeral"
filsystem bør den byttes ut med en ordentlig database før dere har volum.
`lib/store.js` er skrevet som et tynt lag for å gjøre den utskiftingen enkel.

## Mappestruktur

```
halvtime/
├── server.js              Express-app og alle API-ruter
├── lib/
│   ├── store.js             JSON-fil "database", nisjer, innhold, statistikk
│   ├── auth.js                passord-hashing, vakter, tilfeldig kode-generator
│   ├── csv.js                  CSV-bygger for eksport
│   └── mailer.js                e-post (SMTP) — ikke i bruk akkurat nå
├── public/                    statisk frontend
│   ├── css/styles.css
│   ├── js/                    main.js, content.js, nisjevelger.js,
│   │                            apply.js, business.js, minside.js, admin.js
│   ├── admin.html               adminpanel
│   ├── minside.html             Min side (creator-innlogging)
│   └── *.html
└── data/                       db.json (opprettes automatisk)
```
