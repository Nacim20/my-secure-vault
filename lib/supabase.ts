import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- LE MOUCHARD ---
// Regarde ta console (F12) quand tu lanceras le site
if (typeof window !== 'undefined') {
  console.log("🔍 DIAGNOSTIC SUPABASE :");
  console.log("URL:", supabaseUrl ? "✅ OK (" + supabaseUrl + ")" : "❌ MANQUANTE");
  console.log("KEY:", supabaseKey ? "✅ OK (Commence par " + supabaseKey.substring(0, 5) + "...)" : "❌ MANQUANTE");
}
// -------------------

if (!supabaseUrl || !supabaseKey) {
  throw new Error("CRITIQUE: Les variables Supabase sont introuvables !");
}

export const supabase = createClient(supabaseUrl, supabaseKey);