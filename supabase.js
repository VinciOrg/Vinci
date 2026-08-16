const SUPABASE_URL = "https://jqbiodjbrliqghshatmv.supabase.co";
const SUPABASE_KEY = "sb_publishable_XEF6TMRQ6cHCWw8Z6LYnHA_YPDpmYV4";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);