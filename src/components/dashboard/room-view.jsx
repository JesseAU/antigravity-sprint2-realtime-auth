import { useState, useEffect } from 'react';
import { RoomService } from '../../services/room-service';
import { Users, Play, LogOut } from 'lucide-react';
import { roomLogger } from '../../lib/utils/debug-logger';

export default function Room({ room, session, onLeave }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const isCreator = room.created_by === session.user.id;

    const [status, setStatus] = useState(room.status);

    useEffect(() => {
        roomLogger.info(`Room View mounted: ${room.id}`, { initialStatus: room.status });
        setStatus(room.status); // Sync initial prop
        fetchParticipants();

        // Subscribe to participant changes (joins/leaves)
        const participantSub = RoomService.subscribeToParticipants(room.id, (payload) => {
            roomLogger.debug('Realtime Participant Event', payload);
            if (payload.eventType === 'INSERT') {
                setParticipants((prev) => [...prev, payload.new]);
            } else if (payload.eventType === 'DELETE') {
                setParticipants((prev) => prev.filter((p) => p.user_id !== payload.old.user_id));
            }
        });

        // Subscribe to room status changes
        const roomSub = RoomService.subscribeToRoomDetails(room.id, (payload) => {
            roomLogger.info('Realtime Room update received', payload.new);
            if (payload.new.status) {
                setStatus(payload.new.status);
            }
        });

        return () => {
            roomLogger.info(`Room View unmounted: ${room.id}`);
            participantSub.unsubscribe();
            roomSub.unsubscribe();
        };
    }, [room.id, room.status]);

    const fetchParticipants = async () => {
        try {
            const response = await RoomService.getParticipants(room.id);
            if (response.success) {
                setParticipants(response.data);
            } else {
                console.error('Error fetching participants:', response.error);
            }
        } catch (error) {
            console.error('Unexpected error fetching participants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            const response = await RoomService.updateRoomStatus(room.id, newStatus, status);
            if (!response.success) {
                // Ignore conflict errors caused by race conditions to avoid annoying alerts
                if (response.status !== 409) {
                    console.warn(response.error);
                }
            }
        } catch (error) {
            console.error(`Error updating status to ${newStatus}:`, error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLeave = async () => {
        try {
            const response = await RoomService.leaveRoom(room.id);
            if (response.success) {
                onLeave();
            } else {
                console.error('Error leaving room:', response.error);
            }
        } catch (error) {
            console.error("Error leaving room", error);
        }
    };

    return (
        <div className="room-view">
            <div className="room-header">
                <h2>{room.name}</h2>
                <div className="room-meta">
                    <span className="category-badge">{room.category || 'General'}</span>
                    <span className="room-id">ID: {room.id.slice(0, 8)}...</span>
                    <span className={`status-badge ${status}`}>{status}</span>
                </div>
            </div>

            <div className="participants-section">
                <h3>Participants ({participants.length})</h3>
                <ul className="participants-list">
                    {participants.map((p) => (
                        <li key={p.id} className="participant-item">
                            <Users size={16} />
                            <span>{p.user_id === session.user.id ? 'You' : `User ${p.user_id.slice(0, 4)}`}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="room-content">
                {status === 'waiting' && (
                    <div className="waiting-area">
                        <p>Waiting for players...</p>
                    </div>
                )}

                {status === 'ready' && (
                    <div className="ready-area">
                        <p>Host is preparing to start...</p>
                    </div>
                )}

                {status === 'playing' && (
                    <div className="game-area">
                        <h3>Game in Progress 🎮</h3>
                        {/* Game Component Would Go Here */}
                    </div>
                )}

                {status === 'finished' && (
                    <div className="results-area">
                        <h3>Match Finished 🏆</h3>
                        <button onClick={() => handleUpdateStatus('waiting')} className="restart-btn">Play Again</button>
                    </div>
                )}
            </div>

            <div className="room-actions">
                {isCreator && status === 'waiting' && (
                    <button onClick={() => handleUpdateStatus('ready')} className="action-btn" disabled={isUpdating}>
                        {isUpdating ? 'Updating...' : 'Set Ready'}
                    </button>
                )}
                {isCreator && status === 'ready' && (
                    <button onClick={() => handleUpdateStatus('playing')} className="start-btn" disabled={isUpdating}>
                        <Play size={18} /> {isUpdating ? 'Starting...' : 'Start Match'}
                    </button>
                )}
                {isCreator && status === 'playing' && (
                    <button onClick={() => handleUpdateStatus('finished')} className="end-btn" disabled={isUpdating}>
                        {isUpdating ? 'Finishing...' : 'Finish Match'}
                    </button>
                )}

                <button onClick={handleLeave} className="leave-btn">
                    <LogOut size={18} /> Leave Room
                </button>
            </div>
        </div>
    );
}
