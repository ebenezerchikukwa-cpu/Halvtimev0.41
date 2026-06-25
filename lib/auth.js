// lib/auth.js
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

export async function hashPassord(passord) {
  return bcrypt.hash(passord, 10);
}

export async function sjekkPassord(passord, hash) {
  return bcrypt.compare(passord, hash);
}

// Vakt for Min side: krever at en creator er logget inn.
export function krevInnlogging(req, res, next) {
  if (!req.session || !req.session.kreatorId) {
    return res.status(401).json({ feil: "Du må logge inn først." });
  }
  next();
}

export function krevAdmin(req, res, next) {
  if (!req.session || !req.session.erAdmin) {
    return res.status(401).json({ feil: "Du må logge inn som admin først." });
  }
  next();
}

export function erGyldigEpost(epost) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(epost || "").trim());
}

// Lager en lesbar tilfeldig kode admin kan gi en creator som passord,
// f.eks. "K7P2-9MXQ". Uten lett forvekslbare tegn (0/O, 1/I).
export function lagTilfeldigKode() {
  const tegn = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let kode = "";
  for (let i = 0; i < 8; i++) {
    kode += tegn[bytes[i] % tegn.length];
    if (i === 3) kode += "-";
  }
  return kode;
}
