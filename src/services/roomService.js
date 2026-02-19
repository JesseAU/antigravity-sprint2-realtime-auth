import { supabase } from "../lib/supabaseClient";

/**
 * 🛠️ Servicio de Salas (Rooms) - Developer 2
 * Encargado del CRUD y manejo de errores para la lógica de Match.
 */

export const roomService = {
    /**
     * Crea una nueva sala en estado 'waiting'.
     * @param {string} hostId - UUID del usuario que crea la sala.
     */
    async createRoom(hostId) {
        try {
            console.log(`Creating room for host: ${hostId}`);

            if (!hostId) throw new Error("Host ID is required");

            const { data, error } = await supabase
                .from("rooms")
                .insert([{ host_id: hostId, status: "waiting" }])
                .select()
                .single();

            if (error) throw error;

            console.log("✅ Room created:", data);
            return { success: true, data };
        } catch (error) {
            console.error("❌ Error creating room:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Intenta unir a un usuario (Guest) a una sala existente.
     * Valida que la sala esté en 'waiting' antes de actualizar.
     * @param {string} roomId - UUID de la sala.
     * @param {string} guestId - UUID del usuario que se une.
     */
    async joinRoom(roomId, guestId) {
        try {
            console.log(`User ${guestId} attempting to join room ${roomId}`);

            if (!roomId || !guestId) throw new Error("Room ID and Guest ID are required");

            // 1. Validar estado actual (Evitar sobreescribir si ya está activa)
            const { data: currentRoom, error: fetchError } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", roomId)
                .single();

            if (fetchError) throw fetchError;

            if (currentRoom.status !== "waiting") {
                throw new Error("La sala ya no está disponible (Status: " + currentRoom.status + ")");
            }

            if (currentRoom.host_id === guestId) {
                throw new Error("El Host no puede unirse como Guest a su propia sala.");
            }

            // 2. Actualizar la sala (Optimistic Update)
            const { data, error } = await supabase
                .from("rooms")
                .update({ guest_id: guestId, status: "active" }) // Cambio de estado atómico
                .eq("id", roomId)
                .select()
                .single();

            if (error) throw error;

            console.log("✅ Joined room successfully:", data);
            return { success: true, data };
        } catch (error) {
            console.error("❌ Error joining room:", error.message);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtiene todas las salas en espera (Para el Lobby).
     */
    async getWaitingRooms() {
        try {
            const { data, error } = await supabase
                .from("rooms")
                .select(`*, profiles(email)`) // Join opcional si profiles existe
                .eq("status", "waiting")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error("❌ Error fetching rooms:", error.message);
            return { success: false, error: error.message };
        }
    },
};
