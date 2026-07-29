import { randomInt } from "crypto";

// Excludes visually ambiguous characters (0/O, 1/I) since codes are read off a screen.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSecretCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
