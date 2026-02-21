import React, { useState, useEffect } from 'react';
import { RoomService } from '../../services/room-service';
import { MatchService } from '../../services/match-service';
import { Heart, X } from 'lucide-react';

export const SwipeView = ({ onMatch }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        const { success, data } = await RoomService.getRooms();
        if (success) {
            setRooms(data);
        }
        setLoading(false);
    };

    const handleSwipe = async (vote) => {
        const currentRoom = rooms[currentIndex];
        if (!currentRoom) return;

        console.log(`Swiping ${vote ? 'RIGHT' : 'LEFT'} on room: ${currentRoom.name}`);

        const result = await MatchService.recordSwipe(currentRoom.created_by, vote);

        if (result.matched) {
            console.log("IT'S A MATCH!");
            if (onMatch) onMatch(currentRoom);
        }

        setCurrentIndex(prev => prev + 1);
    };

    if (loading) return <div className="p-4 text-center">Cargando salas...</div>;

    if (currentIndex >= rooms.length) {
        return (
            <div className="swipe-empty-state">
                <div className="empty-icon">✨</div>
                <h3>¡Has visto todo por ahora!</h3>
                <p>No hay más salas disponibles. Vuelve pronto para nuevas oportunidades o crea la tuya.</p>
                <button
                    onClick={() => setCurrentIndex(0)}
                    className="restart-swipe-btn"
                >
                    Reiniciar Exploración
                </button>
            </div>
        );
    }

    const room = rooms[currentIndex];

    return (
        <div className="swipe-view-container">
            <div className="swipe-card-wrapper">
                <div className="swipe-card">
                    <div className="swipe-card-header">
                        <div className="category-tag">{room.category || 'General'}</div>
                        <div className="room-icon">🏢</div>
                    </div>
                    <div className="swipe-card-body">
                        <div className="room-status-top">
                            <span className={`status-dot ${room.status}`}></span>
                            {room.status}
                        </div>
                        <h2>{room.name}</h2>
                        <p className="room-bio">
                            Únete a esta sala para coordinar y jugar en tiempo real.
                            {room.category === 'Gaming' ? ' ¡Ideal para partidas competitivas!' : ' ¡Excelente para pasar el rato!'}
                        </p>
                    </div>
                    <div className="swipe-actions">
                        <button
                            onClick={() => handleSwipe(false)}
                            className="swipe-btn reject"
                            title="Descartar"
                        >
                            <X size={32} />
                        </button>
                        <button
                            onClick={() => handleSwipe(true)}
                            className="swipe-btn accept"
                            title="Me interesa"
                        >
                            <Heart size={32} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
