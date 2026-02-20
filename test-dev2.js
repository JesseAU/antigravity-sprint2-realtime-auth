// 🧪 Script de Verificación para Developer 2
// Ejecutar con: node test-dev2.js

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";

// Cargar .env.local manualmente porque no estamos en Vite
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan credenciales en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("🔍 Iniciando Test de Integración (Developer 2)...");

    // 1. Host: Alex
    const hostEmail = "alex@gmail.com";
    const hostPass = "123456";

    console.log(`🔑 Login Host (${hostEmail})...`);
    const { data: hostAuth, error: loginError } = await supabase.auth.signInWithPassword({
        email: hostEmail,
        password: hostPass,
    });

    if (loginError) {
        console.error("❌ Error Login Host:", loginError.message);
        return;
    }
    const hostId = hostAuth.user.id;
    console.log(`✅ Host autenticado: ${hostId}`);

    // 2. Crear Sala
    console.log("🏠 Creando Sala...");
    const { data: room, error: createError } = await supabase
        .from("rooms")
        .insert([{ host_id: hostId, status: "waiting" }])
        .select()
        .single();

    if (createError) {
        console.error("❌ Error creando sala:", createError.message);
        return;
    }
    console.log(`✅ Sala creada: ${room.id} (Status: ${room.status})`);

    // 3. Guest (Simulado)
    // Como tenemos Rate Limit y solo 1 usuario, vamos a intentar unir al MISMO usuario.
    // Esto debería FALLAR por validación de lógica si la implementamos, o funcionar si no.
    // Pero al menos prueba que la función 'joinRoom' es accesible y la DB responde.

    console.log("🔗 Intentando unirse (Simulando Guest con mismo usuario por Rate Limit)...");

    // Nota: En la UI real, el guest sería otro usuario.
    // Aquí usamos a Alex también solo para verificar que el UPDATE funciona a nivel de base de datos.

    const { data: updatedRoom, error: joinError } = await supabase
        .from("rooms")
        .update({ guest_id: hostId, status: "active" }) // Usamos hostId temporalmente
        .eq("id", room.id)
        .eq("status", "waiting")
        .select()
        .single();

    if (joinError) {
        console.error("❌ Error update:", joinError.message);
    } else if (!updatedRoom) {
        console.log("⚠️ No se actualizó (Probablemente RLS o filtro status correcto).");
    } else {
        console.log(`✅ Match Exitoso (Técnicamente)! Room Status: ${updatedRoom.status}`);
        console.log(`   Guest ID guardado: ${updatedRoom.guest_id}`);
    }

    // 4. Limpieza
    console.log("🧹 Borrando sala de prueba...");
    await supabase.from("rooms").delete().eq("id", room.id);
    console.log("✅ Ciclo completo.");
}

runTest();
