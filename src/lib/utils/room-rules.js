export const RoomStates = {
    WAITING: 'waiting',
    READY: 'ready',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

/**
 * Validates if a status transition is allowed.
 * This is pure business logic, decoupled from Supabase and React.
 * 
 * @param {string} currentStatus 
 * @param {string} nextStatus 
 * @returns {Object} { allowed: boolean, error?: string }
 */
export const validateStatusTransition = (currentStatus, nextStatus) => {
    const flow = {
        [RoomStates.WAITING]: [RoomStates.READY],
        [RoomStates.READY]: [RoomStates.PLAYING, RoomStates.WAITING],
        [RoomStates.PLAYING]: [RoomStates.FINISHED],
        [RoomStates.FINISHED]: [RoomStates.WAITING]
    };

    const allowedNext = flow[currentStatus] || [];

    if (currentStatus === nextStatus) {
        return { allowed: true }; // No change
    }

    if (!allowedNext.includes(nextStatus)) {
        return {
            allowed: false,
            error: `Illegal transition: ${currentStatus} -> ${nextStatus}`
        };
    }

    return { allowed: true };
};

/**
 * Checks if a user has permission to manage a room.
 * @param {string} userId 
 * @param {string} hostId 
 * @returns {Object} { allowed: boolean, error?: string }
 */
export const checkRoomPermission = (userId, hostId) => {
    if (userId !== hostId) {
        return {
            allowed: false,
            error: 'Permission Denied: Only the host can manage this room'
        };
    }
    return { allowed: true };
};
