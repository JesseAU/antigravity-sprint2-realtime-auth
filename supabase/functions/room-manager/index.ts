import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Initialize Supabase Client with Auth header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header', requestId }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // 3. Get User from JWT (Identity check)
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token', requestId }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // 4. Parse Request Body
        const { roomId, nextStatus, expectedCurrentStatus } = await req.json()

        console.log(`[${requestId}] Request:`, { userId: user.id, roomId, nextStatus, expectedCurrentStatus, timestamp });

        if (!roomId || !nextStatus || !expectedCurrentStatus) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters', requestId }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // --- NEW: Strict State Transition Validation ---
        const allowedTransitions: Record<string, string[]> = {
            'waiting': ['ready'],
            'ready': ['playing'],
            'playing': ['finished'],
            'finished': [] // No transitions allowed from finished
        };

        const validTargets = allowedTransitions[expectedCurrentStatus] || [];
        if (!validTargets.includes(nextStatus)) {
            console.warn(`[${requestId}] Illegal transition attempt: ${expectedCurrentStatus} -> ${nextStatus}`);
            return new Response(
                JSON.stringify({
                    error: `Illegal transition: ${expectedCurrentStatus} -> ${nextStatus}`,
                    requestId
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }
        // ----------------------------------------------

        // 5. Build Service Role Client for Sensitive DB Operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 6. ATOMIC UPDATE (Eliminates Race Conditions)
        // We include ALL conditions in the update query itself.
        const { data: updatedRoom, error: updateError } = await supabaseAdmin
            .from('rooms')
            .update({
                status: nextStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', roomId)
            .eq('created_by', user.id) // Authorization: Only creator
            .eq('status', expectedCurrentStatus) // Concurrency: Only if status hasn't changed
            .select()
            .maybeSingle()

        if (updateError) throw updateError

        // 7. Investigate failure if no row was updated
        if (!updatedRoom) {
            const { data: roomCheck } = await supabaseAdmin
                .from('rooms')
                .select('status, created_by')
                .eq('id', roomId)
                .maybeSingle()

            if (!roomCheck) {
                return new Response(
                    JSON.stringify({ error: 'Room not found', requestId }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
                );
            }

            if (roomCheck.created_by !== user.id) {
                return new Response(
                    JSON.stringify({ error: 'Forbidden: Only the host can manage this room', requestId }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
                );
            }

            if (roomCheck.status !== expectedCurrentStatus) {
                return new Response(
                    JSON.stringify({
                        error: 'Conflict: Room status has changed',
                        currentStatus: roomCheck.status,
                        expectedStatus: expectedCurrentStatus,
                        requestId
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
                );
            }

            return new Response(
                JSON.stringify({ error: 'Atomic update failed for unknown reason', requestId }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        console.log(`[${requestId}] Success:`, { roomId, prevStatus: expectedCurrentStatus, newStatus: nextStatus });

        return new Response(
            JSON.stringify({ success: true, data: updatedRoom, requestId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error(`[${requestId}] Fatal Error:`, error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error', message: error.message, requestId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
