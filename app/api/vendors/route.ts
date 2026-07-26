// Public list of monitorable vendors, for the picker on /subscribe and /manage.
// Vendors are the product's public "menu" — no auth needed. Served from the
// service-role client so the browser never needs a Supabase client of its own.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/admin";

export async function GET() {
  // Only ACTIVE vendors: parked ones (lib/feeds/sources.ts PARKED_SLUGS) aren't
  // polled, so offering them would promise updates that never arrive.
  const { data } = await supabaseAdmin
    .from("vendors")
    .select("id, slug, name")
    .eq("active", true)
    .order("name");
  return NextResponse.json({ vendors: data ?? [] });
}
