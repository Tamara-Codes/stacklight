// One-click unsubscribe. Linked from every digest footer. No login required —
// the signed token proves the link belongs to this user. Sets unsubscribed_at,
// which every send checks before emailing.
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { verifyUnsub } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";

  if (!u || !t || !verifyUnsub(u, t)) {
    return new Response("Invalid or expired unsubscribe link.", { status: 400 });
  }

  await supabaseAdmin
    .from("users")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", u);

  return new Response(
    "<h1>You're unsubscribed.</h1><p>You won't receive any more Stacklight emails. Changed your mind? Sign back in any time.</p>",
    { status: 200, headers: { "content-type": "text/html" } }
  );
}
