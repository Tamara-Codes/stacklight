// Signed unsubscribe tokens. The unsubscribe link must work WITHOUT login
// (one-click, legally required), so we can't trust a raw user id in the URL —
// anyone could unsubscribe anyone. Instead we sign the id with a secret; the
// route only acts if the signature matches.
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "";

export function unsubToken(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

export function verifyUnsub(userId: string, token: string): boolean {
  const expected = unsubToken(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
