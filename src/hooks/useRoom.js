import { useState, useEffect, useCallback } from 'react';
import { RoomService } from '../services/roomService';
import { roomLogger } from '../utils/debugLogger';

/**
 * Custom hook to manage room state, participants, and realtime synchronization.
 * Decouples the UI components from direct service calls and subscription management.
 * 
 * @param {string} roomId 
 * @returns {Object} { room, participants, loading, error, actions: { startMatch, leaveRoom, revalidate } }
 */
export function useRoom(roomId) {
    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Centralized state revalidation (Missed events recovery)
    const revalidate = useCallback(async () => {
        roomLogger.debug('useRoom: Revalidating full state...', { roomId });
        const result = await RoomService.getRoomDetails(roomId);
        if (result.success) {
            setRoom(result.data.room);
            setParticipants(result.data.participants);
            setError(null);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;

        let active = true;
        setLoading(true);

        // Initial Load
        revalidate();

        // 2. Setup Realtime Subscriptions with onReconnect support

        // Listen to Room Changes (Status, Name, etc.)
        const roomSub = RoomService.subscribeToRoomDetails(
            roomId,
            (payload) => {
                if (active) setRoom(payload.new);
            },
            () => revalidate() // Auto-sync on reconnection
        );

        // Listen to Participant Changes (Join/Leave)
        const participantsSub = RoomService.subscribeToParticipants(
            roomId,
            () => {
                // For participants, usually easier to refetch full list to maintain group state
                if (active) revalidate();
            },
            () => revalidate() // Auto-sync on reconnection
        );

        return () => {
            active = false;
            roomSub.unsubscribe();
            participantsSub.unsubscribe();
        };
    }, [roomId, revalidate]);

    // Actions
    const updateStatus = async (nextStatus, expectedStatus) => {
        const result = await RoomService.updateRoomStatusSecure(roomId, nextStatus, expectedStatus);
        if (!result.success) {
            setError(result.error);
        }
        return result;
    };

    return {
        room,
        participants,
        loading,
        error,
        actions: {
            updateStatus,
            revalidate
        }
    };
}
