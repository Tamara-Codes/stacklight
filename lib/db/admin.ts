// Server-only Supabase client (service role key). Bypasses row-level security —
// used by background jobs (ingestion, digest fan-out). NEVER import this into
// client components or expose the key to the browser.
import "./node-ws";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
