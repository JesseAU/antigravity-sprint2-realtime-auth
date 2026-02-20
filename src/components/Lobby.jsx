import { useState, useEffect } from 'react'
import './Lobby.css'

// Mock data (simulada)
const initialMockRooms = [
  { id: '1', name: 'Sala Alpha', status: 'waiting', members: ['usuario1@test.com'] },
  { id: '2', name: 'Sala Beta', status: 'active', members: ['usuario2@test.com', 'usuario3@test.com'] },
  { id: '3', name: 'Sala Gamma', status: 'waiting', members: ['usuario4@test.com'] },
]

export default function Lobby({ session, onJoinRoom, onLogout }) {
  const [rooms, setRooms] = useState(initialMockRooms)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateInput, setShowCreateInput] = useState(false)

  useEffect(() => {
    const canvas = document.getElementById('stars');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15 + 0.05})`;
      ctx.fill();
    }
  }, []);

  // Obtener inicial del email
  const userInitial = session?.user?.email ? session.user.email[0].toUpperCase() : 'U'

  const handleCreateRoom = (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return

    // Simulación de creación de sala
    const newRoom = {
      id: Date.now().toString(),
      name: newRoomName,
      status: 'waiting',
      members: [session.user.email]
    }
    
    setRooms([...rooms, newRoom])
    setNewRoomName('')
    setShowCreateInput(false)
    // Opcionalmente unirse automáticamente
    onJoinRoom(newRoom)
  }

  return (
    <div className="lobby-container">
      <canvas id="stars" style={{position:'fixed', inset:0, zIndex:0, pointerEvents:'none'}} />
      <div className="lobby-content" style={{position: 'relative', zIndex: 1}}>
        <header className="lobby-compact-header">
          <div className="platform-logo">SYNCROOMS</div>
          <div className="user-controls">
            <div className="user-avatar-circle">
              {userInitial}
            </div>
            <span className="user-email-compact">{session.user.email}</span>
            <button onClick={onLogout} className="logout-button-with-text" title="Cerrar Sesión">
              ⏻ <span className="logout-label">Cerrar sesión</span>
            </button>
          </div>
        </header>

        <main className="lobby-main">
          <div className="list-header">
            <div>
              <h2 className="list-title">Salas Disponibles</h2>
              <p className="list-subtitle">
                {rooms.length} {rooms.length === 1 ? 'sala disponible' : 'salas disponibles'} para conectarte
              </p>
            </div>
            <button 
              className={`new-room-btn ${showCreateInput ? 'active' : ''}`}
              onClick={() => setShowCreateInput(!showCreateInput)}
            >
              {showCreateInput ? 'Cancelar' : '+ Nueva Sala'}
            </button>
          </div>

          {showCreateInput && (
            <div className="create-room-inline">
              <form onSubmit={handleCreateRoom} className="inline-form">
                <input
                  type="text"
                  placeholder="Nombre de la nueva sala..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="inline-input"
                  autoFocus
                />
                <button type="submit" className="inline-submit-btn">
                  Crear
                </button>
              </form>
            </div>
          )}

          <div className="rooms-grid large-grid">
            {rooms.map((room) => {
              const isFull = room.members.length >= 2
              return (
                <div key={room.id} className="room-card large-card">
                  <div className="card-top">
                    <h4 className="room-name-large">{room.name}</h4>
                    <span className={`status-badge-pill status-${room.status}`}>
                      {room.status === 'active' ? 'Activo' : 'Esperando'}
                    </span>
                  </div>
                  
                  <div className="card-middle">
                    <div className="members-indicator">
                      <span className="icon">👥</span>
                      <span>{room.members.length} / 2</span>
                    </div>
                  </div>

                  <div className="card-bottom">
                    <button 
                      onClick={() => onJoinRoom(room)}
                      className={`join-button-large ${isFull ? 'full' : ''}`}
                      disabled={isFull}
                    >
                      {isFull ? (
                        <>🔒 Sala Llena</>
                      ) : (
                        'Unirse ahora'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
