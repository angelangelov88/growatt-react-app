import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY)
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");

// Supabase with the secret key: full control of every user's login. Server-only,
// and only for what a user's own session can't do (deleting their account).
// Never import it from src/.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export { supabaseAdmin };
