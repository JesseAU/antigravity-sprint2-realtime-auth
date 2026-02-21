import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase/client';
import Auth from './components/auth/auth-view';
import CreateRoom from './components/dashboard/create-room';
import RoomList from './components/dashboard/room-list';
import Room from './components/dashboard/room-view';
import ErrorBoundary from './components/layout/error-boundary';
import { LogOut, Heart } from 'lucide-react';
import { authLogger } from './lib/utils/debug-logger';
import { SwipeView } from './components/matching/swipe-view';
import { MatchPrompt } from './components/layout/match-prompt';
import './app/globals.css';

import { AuthService } from './services/auth-service';

function App() {
    const [session, setSession] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('lobby'); // 'lobby' or 'swipe'

    useEffect(() => {
        // Initial session check via AuthService
        AuthService.getSession().then((session) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes via AuthService
        const {
            data: { subscription },
        } = AuthService.onAuthChange((event, session) => {
            setSession(session);

            if (event === 'SIGNED_OUT') {
                setCurrentRoom(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleJoinRoom = async (roomId) => {
        // Fetch room details to set currentRoom
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (data) setCurrentRoom(data);
    };

    const handleLeaveRoom = () => {
        setCurrentRoom(null);
    };

    if (loading) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!session) {
        return (
            <ErrorBoundary>
                <Auth />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <div className="header-content">
                        <h1>SyncRoom</h1>
                        <div className="user-profile">
                            <div className="user-info">
                                <span className="user-email">{session.user.email}</span>
                            </div>
                            <button className="sign-out-btn" onClick={() => supabase.auth.signOut()}>
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="dashboard-main">
                    <MatchPrompt />

                    {currentRoom ? (
                        <Room room={currentRoom} session={session} onLeave={handleLeaveRoom} />
                    ) : (
                        <div className="lobby-container">
                            <div className="welcome-section">
                                <h2>¡Bienvenido al Sprint 2!</h2>
                                <p>Explora salas o usa el sistema de Match para conectar.</p>

                                <div className="view-selector-container">
                                    <div className="view-selector">
                                        <button
                                            onClick={() => setView('lobby')}
                                            className={view === 'lobby' ? 'active' : ''}
                                        >
                                            Lobby
                                        </button>
                                        <button
                                            onClick={() => setView('swipe')}
                                            className={view === 'swipe' ? 'active match' : 'match'}
                                        >
                                            <Heart size={16} fill={view === 'swipe' ? 'currentColor' : 'none'} />
                                            Matching
                                        </button>
                                        <div className={`selector-slider ${view}`}></div>
                                    </div>
                                </div>
                            </div>

                            {view === 'lobby' ? (
                                <div className="lobby-grid">
                                    <CreateRoom session={session} onRoomCreated={(room) => setCurrentRoom(room)} />
                                    <RoomList session={session} onJoinRoom={handleJoinRoom} />
                                </div>
                            ) : (
                                <SwipeView onMatch={(room) => console.log('Matching View Success!')} />
                            )}
                        </div>
                    )}
                </main>
            </div>
        </ErrorBoundary>
    );
}

export default App;
