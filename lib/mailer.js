// lib/mailer.js
// Sender e-post via SMTP når miljøvariabler er satt. Hvis ikke (f.eks.
// lokal utvikling uten innloggingsdetaljer), logges e-posten til
// data/sendte-eposter.log i stedet for å feile — så ingen innsendte
// forespørsler går tapt mens man tester.

import nodemailer from "nodemailer";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "..", "data", "sendte-eposter.log");

const EPOST_TIL = process.env.EPOST_TIL || "kontakt@halvtime.no";
const EPOST_FRA = process.env.EPOST_FRA || "HALVTIME <ikke-svar@halvtime.no>";

function harSmtpOppsett() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function fåTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function loggLokalt(emne, tekst) {
  const dir = dirname(LOG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const oppføring = `\n--- ${new Date().toISOString()} ---\nTil: ${EPOST_TIL}\nEmne: ${emne}\n\n${tekst}\n`;
  appendFileSync(LOG_PATH, oppføring);
  console.log(`[e-post] SMTP er ikke konfigurert — loggført i data/sendte-eposter.log: "${emne}"`);
}

export async function sendEpost({ emne, tekst }) {
  if (!harSmtpOppsett()) {
    loggLokalt(emne, tekst);
    return { levert: false, loggført: true };
  }

  try {
    await fåTransporter().sendMail({
      from: EPOST_FRA,
      to: EPOST_TIL,
      subject: emne,
      text: tekst,
    });
    return { levert: true };
  } catch (feil) {
    console.error("[e-post] Sending feilet, loggfører lokalt i stedet:", feil.message);
    loggLokalt(emne, `(SMTP-sending feilet: ${feil.message})\n\n${tekst}`);
    return { levert: false, loggført: true };
  }
}
