// Read + edit a subscriber's stack, for the /manage page. There's no login:
// the caller proves identity with the signed (u, t) token from their emailed
// manage link — the same token that gates unsubscribe (see lib/tokens.ts).
// Service-role client; the browser never touches the tables directly.
//
//   GET  ?u=&t=            → { email, vendorIds }
//   PUT  ?u=&t= { vendorIds } → replace the stack, → { ok }
//
// Alert channels (email/Slack/Discord) are managed by /api/alerts and
// /api/slack, which authenticate the same way.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";
import { verifyUserId } from "@/lib/tokens";

// Returns the verified user id, or null if the token doesn't check out.
function authed(req: NextRequest): string | null {
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  return u && t && verifyUserId(u, t) ? u : null;
}

export async function GET(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: user }, { data: stack }] = await Promise.all([
    supabaseAdmin.from("users").select("email").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_stacks").select("vendor_id").eq("user_id", userId),
  ]);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    email: user.email,
    vendorIds: (stack ?? []).map((s) => s.vendor_id),
  });
}

export async function PUT(req: NextRequest) {
  const userId = authed(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vendorIds } = (await req.json()) as { vendorIds?: number[] };
  const ids = Array.isArray(vendorIds) ? [...new Set(vendorIds.filter((n) => Number.isInteger(n)))] : [];

  // Validate against real vendors — never trust the client's numbers.
  const { data: realVendors } = await supabaseAdmin.from("vendors").select("id").in("id", ids);
  const validIds = (realVendors ?? []).map((v) => v.id);

  await supabaseAdmin.from("user_stacks").delete().eq("user_id", userId);
  if (validIds.length) {
    await supabaseAdmin
      .from("user_stacks")
      .insert(validIds.map((vendor_id) => ({ user_id: userId, vendor_id })));
  }

  return NextResponse.json({ ok: true, vendorIds: validIds });
}
