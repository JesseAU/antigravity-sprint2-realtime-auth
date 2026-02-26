import { supabase } from '../lib/supabase/client';
import { roomLogger, logRoomEvent } from '../lib/utils/debug-logger';
import { AuthService } from './auth-service';
import { validateStatusTransition, checkRoomPermission } from '../lib/utils/room-rules';

// Track active subscriptions to prevent duplicates
const activeSubscriptions = new Map();

export const RoomService = {
    // Helper to get current user via AuthService
    async getCurrentUser() {
        const user = await AuthService.getUser();
        if (!user) {
            throw new Error('User not authenticated or session expired');
        }
        return user;
    },

    async createRoom(name, category = 'General') {
        try {
            const user = await this.getCurrentUser();
            const createdBy = user.id;

            roomLogger.info('createRoom called', { name, category, createdBy });

            if (!name || name.trim().length === 0) {
                const error = 'Room name is required';
                roomLogger.warn('Validation failed: Room name missing');
                return { success: false, error };
            }

            const { data, error } = await supabase
                .from('rooms')
                .insert([{ name, category, created_by: createdBy, status: 'waiting' }])
                .select()
                .single();

            if (error) throw error;

            // Automatically join the creator as the first participant
            await supabase.from('participants').insert([{
                room_id: data.id,
                user_id: createdBy
            }]);

            roomLogger.info('Room created and creator joined successfully', data);
            return { success: true, data };
        } catch (error) {
            roomLogger.error('Error creating room', error);
            return { success: false, error: error.message };
        }
    },

    // Get all rooms that are waiting or active
    async getRooms() {
        roomLogger.debug('getRooms called');
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .in('status', ['waiting', 'ready', 'playing'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            roomLogger.info(`Fetched ${data.length} rooms`);
            return { success: true, data };
        } catch (error) {
            roomLogger.error('Error fetching rooms', error);
            return { success: false, error: error.message };
        }
    },

    // Join a room (add participant)
    async joinRoom(roomId) {
        try {
            const user = await this.getCurrentUser();
            const userId = user.id;

            roomLogger.info('joinRoom called', { roomId, userId });

            // 1. Fetch room details FIRST to check ownership and status
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .select('status, max_participants, created_by')
                .eq('id', roomId)
                .single();

            if (roomError) throw roomError;

            const isCreator = room.created_by === userId;

            // 2. Check if already joined (RE-ENTRY)
            const { data: existing } = await supabase
                .from('participants')
                .select('*')
                .eq('room_id', roomId)
                .eq('user_id', userId)
                .maybeSingle();

            if (existing) {
                roomLogger.info('User already in room (Re-entry success)', existing);
                return { success: true, data: existing };
            }

            // 3. Validation for NEW joiners or RE-JOINING hosts
            // Hosts can ALWAYS re-enter their rooms if they are in waiting, ready or playing
            const allowedStatusesForHost = ['waiting', 'ready', 'playing'];
            const isAllowedStatus = isCreator
                ? allowedStatusesForHost.includes(room.status)
                : room.status === 'waiting';

            if (!isAllowedStatus) {
                const msg = `Cannot join room with status: ${room.status}`;
                roomLogger.warn(msg);
                return { success: false, error: msg };
            }

            // Check participant count (Race condition possible here, handled by DB constraints ideally)
            const { count } = await supabase
                .from('participants')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            if (room.max_participants && count >= room.max_participants) {
                const msg = 'Room is full';
                roomLogger.warn(msg);
                return { success: false, error: msg };
            }

            const { data, error } = await supabase
                .from('participants')
                .insert([{ room_id: roomId, user_id: userId }])
                .select()
                .single();

            if (error) throw error;

            roomLogger.info('Joined room successfully', data);
            return { success: true, data };
        } catch (error) {
            roomLogger.error('Error joining room', error);
            return { success: false, error: error.message };
        }
    },

    // Get participants for a room
    async getParticipants(roomId) {
        roomLogger.debug('getParticipants called', { roomId });
        try {
            const { data, error } = await supabase
                .from('participants')
                .select('*, profiles:user_id(username, email)')
                .eq('room_id', roomId);

            if (error) throw error;
            roomLogger.info(`Fetched ${data.length} participants for room ${roomId}`);
            return { success: true, data };
        } catch (error) {
            roomLogger.error('Error fetching participants', error);
            return { success: false, error: error.message };
        }
    },

    // Leave a room
    async leaveRoom(roomId) {
        try {
            const user = await this.getCurrentUser();
            const userId = user.id;

            roomLogger.info('leaveRoom called', { roomId, userId });

            const { error } = await supabase
                .from('participants')
                .delete()
                .eq('room_id', roomId)
                .eq('user_id', userId);

            if (error) throw error;
            roomLogger.info('User left room successfully', { roomId, userId });
            return { success: true };
        } catch (error) {
            roomLogger.error('Error leaving room', error);
            return { success: false, error: error.message };
        }
    },

    // Simulation: Temporarily break network for a channel
    async simulateNetworkFailure(roomId) {
        roomLogger.warn(`Simulating network failure for room: ${roomId}`);
        const channelName = `room:${roomId}`;
        if (activeSubscriptions.has(channelName)) {
            const wrapper = activeSubscriptions.get(channelName);
            // This is a simulation: we remove the channel without calling unsubscribe logic to lose sync
            supabase.removeChannel(supabase.channel(channelName));
            roomLogger.error(`Network sync lost for ${channelName}. UI might become inconsistent.`);
            return { success: true, message: 'Network failure simulated' };
        }
        return { success: false, error: 'No active subscription found' };
    },

    // Fetch room details and participants for state revalidation
    async getRoomDetails(roomId) {
        try {
            const [roomResult, participantsResult] = await Promise.all([
                supabase.from('rooms').select('*').eq('id', roomId).single(),
                this.getParticipants(roomId)
            ]);

            if (roomResult.error) throw roomResult.error;
            if (!participantsResult.success) throw new Error(participantsResult.error);

            return {
                success: true,
                data: {
                    room: roomResult.data,
                    participants: participantsResult.data
                }
            };
        } catch (error) {
            roomLogger.error('Error revalidating room details', error);
            return { success: false, error: error.message };
        }
    },

    // Securely update room status via Supabase Edge Function (Server-Side Validation)
    async updateRoomStatusRemote(roomId, nextStatus, expectedCurrentStatus) {
        roomLogger.info('updateRoomStatusRemote: START', { roomId, nextStatus });
        try {
            const { data, error } = await supabase.functions.invoke('room-manager', {
                body: { roomId, nextStatus, expectedCurrentStatus }
            });

            if (error) {
                // Handle FunctionsHttpError and other invocation errors
                const errorMessage = error.context?.error || error.message || 'Unknown Function Error';
                roomLogger.error('Edge Function Invocation Error', {
                    message: errorMessage,
                    status: error.status,
                    requestId: error.context?.requestId
                });
                return {
                    success: false,
                    error: errorMessage,
                    status: error.status,
                    requestId: error.context?.requestId
                };
            }

            if (data && data.error) {
                roomLogger.warn('Edge Function Business Logic Failed', {
                    error: data.error,
                    requestId: data.requestId
                });
                return { success: false, error: data.error, requestId: data.requestId };
            }

            roomLogger.info('Edge Function Success', {
                roomId,
                newStatus: data.data.status,
                requestId: data.requestId
            });
            return { success: true, data: data.data, requestId: data.requestId };
        } catch (error) {
            roomLogger.error('Fatal calling Edge Function', error);
            return { success: false, error: error.message };
        }
    },

    // Simulation: Force a delayed transition to test race conditions
    async simulateDelayedTransition(roomId, nextStatus, expectedCurrentStatus, delayMs = 3000) {
        roomLogger.warn(`Simulating DELAYED transition (race condition test)... Sleeping for ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.updateRoomStatusRemote(roomId, nextStatus, expectedCurrentStatus);
    },

    // Simulation: Force a session "expiration" by clearing tokens (client-side only)
    simulateExpiredSession() {
        roomLogger.error('Simulating EXPIRED SESSION. Clearing local auth tokens.');
        localStorage.clear(); // Extreme version
        // In a real app, you might just clear the supabase cookie/memory
        window.location.reload();
    },

    // Securely update room status with strict state validation and race condition detection
    async updateRoomStatusSecure(roomId, nextStatus, expectedCurrentStatus) {
        try {
            const user = await this.getCurrentUser();
            const userId = user.id;

            roomLogger.info('updateRoomStatusSecure: START', {
                roomId,
                nextStatus,
                expectedCurrentStatus,
                requestedBy: userId
            });

            // 1. Obtener estado actual
            const { data: room, error: fetchError } = await supabase
                .from('rooms')
                .select('status, created_by')
                .eq('id', roomId)
                .single();

            if (fetchError) throw fetchError;

            // 2. Validar permisos vía Domain Layer
            const permission = checkRoomPermission(userId, room.created_by);
            if (!permission.allowed) {
                roomLogger.error(permission.error, { userId, hostId: room.created_by });
                return { success: false, error: permission.error };
            }

            // 3. Validar transición vía Domain Layer
            const transition = validateStatusTransition(room.status, nextStatus);
            if (!transition.allowed) {
                roomLogger.warn(transition.error);
                return { success: false, error: transition.error };
            }

            // 4. Comparar el estado recibido vs el estado actual en DB (Optimistic Validation)
            const actualStatus = room.status;
            if (actualStatus !== expectedCurrentStatus) {
                // 3. Registrar un warning estructurado si no coinciden (CONFLICT)
                logRoomEvent('CONFLICT', {
                    roomId,
                    userId,
                    estadoAnterior: actualStatus,
                    estadoIntentado: nextStatus
                });

                return {
                    success: false,
                    error: `State mismatch: expected ${expectedCurrentStatus} but found ${actualStatus}`,
                    code: 'STATE_MISMATCH_CONFLICT'
                };
            }

            // 4. Evitar que el update se ejecute si el estado ya cambió (Implicitly handled by above check)
            roomLogger.debug('State validation passed. Proceeding with DB update.', { roomId, nextStatus });

            const { data, error: updateError } = await supabase
                .from('rooms')
                .update({ status: nextStatus })
                .eq('id', roomId)
                // Extra safety: only update if status is still what we just checked
                .eq('status', actualStatus)
                .select()
                .single();

            if (updateError) {
                roomLogger.error('Update failed after validation. Final state check failed.', updateError);
                throw updateError;
            }

            logRoomEvent('SUCCESS', {
                roomId,
                userId,
                estadoAnterior: actualStatus,
                estadoIntentado: nextStatus
            });

            return { success: true, data };

        } catch (error) {
            logRoomEvent('ERROR', {
                roomId,
                userId: (typeof user !== 'undefined' && user) ? user.id : 'unknown',
                estadoAnterior: expectedCurrentStatus,
                estadoIntentado: nextStatus
            });
            roomLogger.error('Fatal error in updateRoomStatusSecure lifecycle', error);
            return { success: false, error: error.message };
        }
    },

    // Helper to simulate a race condition by firing two rapid status updates
    async simulateRaceCondition(roomId) {
        roomLogger.info('--- SIMULATING RACE CONDITION ---');

        try {
            // First we need to know the current status to start the race
            const { data: room } = await supabase.from('rooms').select('status').eq('id', roomId).single();
            const initialStatus = room.status;

            roomLogger.info(`Starting race from status: ${initialStatus}`);

            // Fire two update attempts almost simultaneously
            // Note: Both are using 'initialStatus' as the expected state
            const attempt1 = this.updateRoomStatusSecure(roomId, 'playing', initialStatus);
            const attempt2 = this.updateRoomStatusSecure(roomId, 'ready', initialStatus);

            const [res1, res2] = await Promise.all([attempt1, attempt2]);

            roomLogger.info('Race simulation results gathered:', { res1, res2 });

            if (!res1.success || !res2.success) {
                roomLogger.warn('Simulation complete: One or more updates failed as expected due to state collision.');
            } else {
                roomLogger.error('Race condition simulation FAILED to catch the conflict (timing might be too slow).');
            }

            return { res1, res2 };
        } catch (err) {
            roomLogger.error('Error during race simulation', err);
            return { error: err.message };
        }
    },

    // Primary status update method (hardened via Edge Function)
    async updateRoomStatus(roomId, nextStatus, currentStatus = 'waiting') {
        // Fallback or explicit mapping if needed
        let targetStatus = nextStatus;
        if (nextStatus === 'active') targetStatus = 'playing';
        if (nextStatus === 'ended') targetStatus = 'finished';

        roomLogger.debug(`updateRoomStatus called: ${currentStatus} -> ${targetStatus}`);
        return this.updateRoomStatusRemote(roomId, targetStatus, currentStatus);
    },

    // Helper to handle subscription creation with deduplication, Reference Counting and Reconnection recovery
    _subscribeToChannel(channelName, table, filter, callback, onReconnect = null) {
        // Track disconnection status for this specific lifecycle
        let hasBeenDisconnected = false;

        // 1. Si ya existe una suscripción activa, incrementamos el contador de referencias
        if (activeSubscriptions.has(channelName)) {
            const subscriptionEntry = activeSubscriptions.get(channelName);
            subscriptionEntry.refCount += 1;

            roomLogger.debug(`Reusing existing subscription for ${channelName}`, {
                currentRefCount: subscriptionEntry.refCount
            });

            return {
                unsubscribe: () => {
                    this._handleUnsubscribe(channelName);
                }
            };
        }

        roomLogger.info(`Creating NEW subscription for ${channelName}`);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: table, filter: filter },
                (payload) => {
                    roomLogger.debug(`${table} update received on ${channelName}`, payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                roomLogger.debug(`Subscription status for ${channelName}: ${status}`);

                if (status === 'SUBSCRIBED') {
                    if (hasBeenDisconnected) {
                        roomLogger.info(`%cConnection RESTORED for ${channelName}. Triggering revalidation.`, 'color: #10b981; font-weight: bold;');
                        if (onReconnect) onReconnect();
                        hasBeenDisconnected = false;
                    } else {
                        roomLogger.info(`Connection established: ${channelName}`);
                    }
                } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    roomLogger.warn(`Connection LOSS on ${channelName}: ${status}. Will attempt recovery.`);
                    hasBeenDisconnected = true;
                }
            });

        // 2. Guardamos la entrada con refCount inicial en 1
        activeSubscriptions.set(channelName, {
            channel,
            refCount: 1
        });

        return {
            unsubscribe: () => {
                this._handleUnsubscribe(channelName);
            }
        };
    },

    // Manejador centralizado de desuscripción con lógica de Reference Counting
    _handleUnsubscribe(channelName) {
        if (!activeSubscriptions.has(channelName)) return;

        const subscriptionEntry = activeSubscriptions.get(channelName);
        subscriptionEntry.refCount -= 1;

        roomLogger.debug(`Decrementing refCount for ${channelName}`, {
            remainingRefs: subscriptionEntry.refCount
        });

        // Solo si no quedan más componentes escuchando, cerramos el canal real
        if (subscriptionEntry.refCount <= 0) {
            roomLogger.info(`Closing FINAL subscription for ${channelName}. Cleaning up resources.`);
            supabase.removeChannel(subscriptionEntry.channel);
            activeSubscriptions.delete(channelName);
        }
    },

    // Realtime subscription for Rooms list
    subscribeToRooms(callback, onReconnect = null) {
        return this._subscribeToChannel('public:rooms', 'rooms', undefined, callback, onReconnect);
    },

    // Realtime subscription for a specific Room's participants
    subscribeToParticipants(roomId, callback, onReconnect = null) {
        return this._subscribeToChannel(`room:${roomId}`, 'participants', `room_id=eq.${roomId}`, callback, onReconnect);
    },

    // Realtime subscription for a specific Room's details (e.g. status change)
    subscribeToRoomDetails(roomId, callback, onReconnect = null) {
        return this._subscribeToChannel(`room_details:${roomId}`, 'rooms', `id=eq.${roomId}`, callback, onReconnect);
    }
};
