import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://edxhpcichekurwlwewdn.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_IS_82ltK6smMPoFNmI4HUg_vMDwFlyL";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Always use the real production URL for auth redirects — never localhost
export const APP_URL = import.meta.env.VITE_APP_URL || "https://virtuosquotebuilder.vercel.app";
