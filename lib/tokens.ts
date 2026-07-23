// Signed user-id tokens. There are no accounts or logins — a user is identified
// by their id, and links we email must work WITHOUT a session (one-click
// unsubscribe, and the "manage your stack" link). We can't trust a raw id in a
// URL — anyone could unsubscribe or edit anyone — so we sign the id with a
// secret and only act when the signature matches. The same token gates both the
// unsubscribe route and the /manage page + its API routes.
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "";

// Sign a user id → the opaque token that proves "this really is user X".
export function signUserId(userId: string): string {
  return createHmac("sha256", SECRET).update(userId).digest("hex");
}

export function verifyUserId(userId: string, token: string): boolean {
  const expected = signUserId(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Absolute /manage link for a user, carrying their signed token. Used in every
// email footer ("manage tools") so a returning user needs no login.
export function manageUrl(base: string, userId: string): string {
  return `${base}/manage?u=${userId}&t=${signUserId(userId)}`;
}

// Backwards-compatible aliases: the unsubscribe route predates the rename and
// the token is identical (HMAC of the user id).
export const unsubToken = signUserId;
export const verifyUnsub = verifyUserId;
