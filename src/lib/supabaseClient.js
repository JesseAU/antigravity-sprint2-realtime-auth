import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🛡️ Validación de Entorno (Developer 2)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "❌ [Supabase Client] Faltan variables de entorno. Verifica tu archivo .env.local",
    { url: !!supabaseUrl, key: !!supabaseAnonKey }
  );
} else {
  console.log("✅ [Supabase Client] Inicializado correctamente.");
}

// Cliente Singleton
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
