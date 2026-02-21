import { useState, useEffect } from 'react';
import { RoomService } from '../../services/room-service';
import { Users, LogIn } from 'lucide-react';

export default function RoomList({ session, onJoinRoom }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRooms();

        // Subscribe to realtime updates for new rooms or status changes
        const subscription = RoomService.subscribeToRooms((payload) => {
            if (payload.eventType === 'INSERT') {
                setRooms((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setRooms((prev) =>
                    prev.map((room) => (room.id === payload.new.id ? payload.new : room))
                );
            } else if (payload.eventType === 'DELETE') {
                setRooms((prev) => prev.filter((room) => room.id !== payload.old.id));
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await RoomService.getRooms();
            if (response.success) {
                setRooms(response.data);
            } else {
                console.error('Error fetching rooms:', response.error);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (roomId) => {
        try {
            const response = await RoomService.joinRoom(roomId);
            if (response.success) {
                onJoinRoom(roomId);
            } else {
                alert(response.error);
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room.');
        }
    };

    if (loading) return <p className="loading-text">Loading rooms...</p>;

    const myRooms = rooms.filter(room => room.created_by === session.user.id);
    const availableRooms = rooms.filter(room => room.created_by !== session.user.id);

    return (
        <div className="room-list-container">
            {/* My Rooms Section */}
            <div className="rooms-section">
                <div className="section-header">
                    <Users size={20} className="text-blue-400" />
                    <h3>Mis Salas (Creadas por ti)</h3>
                </div>
                {myRooms.length === 0 ? (
                    <div className="empty-section-card">
                        <p>No has creado ninguna sala todavía.</p>
                    </div>
                ) : (
                    <ul className="rooms-grid">
                        {myRooms.map((room) => (
                            <li key={room.id} className="room-card mine">
                                <div className="room-info">
                                    <div className="room-name-wrapper">
                                        <h4>{room.name}</h4>
                                        <span className="owner-badge">Owner</span>
                                    </div>
                                    <div className="room-badges">
                                        <span className={`status-badge ${room.status}`}>{room.status}</span>
                                        <span className="category-badge">{room.category || 'General'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleJoin(room.id)} className="join-btn pulse">
                                    <LogIn size={16} /> Re-entrar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="section-divider"></div>

            {/* Available Rooms Section */}
            <div className="rooms-section">
                <div className="section-header">
                    <Users size={20} className="text-purple-400" />
                    <h3>Salas Disponibles</h3>
                </div>
                {availableRooms.length === 0 ? (
                    <div className="empty-section-card">
                        <p>No hay otras salas activas ahora mismo.</p>
                    </div>
                ) : (
                    <ul className="rooms-grid">
                        {availableRooms.map((room) => (
                            <li key={room.id} className="room-card">
                                <div className="room-info">
                                    <h4>{room.name}</h4>
                                    <div className="room-badges">
                                        <span className={`status-badge ${room.status}`}>{room.status}</span>
                                        <span className="category-badge">{room.category || 'General'}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleJoin(room.id)} className="join-btn">
                                    <LogIn size={16} /> Unirse
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
