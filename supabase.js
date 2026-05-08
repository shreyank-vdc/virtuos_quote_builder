import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Always use the real production URL for auth redirects — never localhost
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
