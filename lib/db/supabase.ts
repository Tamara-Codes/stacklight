// Browser-safe Supabase client (anon key). Used for auth (magic link / GitHub)
// and any client-side reads allowed by row-level security.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
