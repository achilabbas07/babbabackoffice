import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();
const isValidSupabaseUrl = (() => {
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === "https:"
      || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
})();

export const supabaseConfigError = !supabaseUrl
  || !supabaseAnonKey
  || !isValidSupabaseUrl
  || supabaseUrl.includes("YOUR_PROJECT_ID")
  || supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
  ? "Supabase belum dikonfigurasi. Isi REACT_APP_SUPABASE_URL dan REACT_APP_SUPABASE_ANON_KEY di frontend/.env."
  : "";

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
