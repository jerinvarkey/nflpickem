'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PLAYERS = ['Jerin', 'Jijesh', 'Jaison', 'Jason', 'Jeff', 'Jogi', 'Jubee', 'Nelson', 'Paul', 'Renjith']

const PLAYER_PASSWORDS: Record<string, string> = {
  Jerin: 'jerin123', Jijesh: 'jijesh123', Jaison: 'jaison123', Jason: 'jason123', Jeff: 'jeff123',
  Jogi: 'jogi123', Jubee: 'jubee123', Nelson: 'nelson123', Paul: 'paul123', Renjith: 'renjith123'
}

const ROUNDS = {
  divisional: { name: 'Divisional', basePoints: 2 },
  conference: { name: 'Conference Championship', basePoints: 4 },
  superbowl: { name: 'Super Bowl', basePoints: 8 }
}

interface Game {
  id: string
  awayTeam: string
  awaySeed: number
  homeTeam: string
  homeSeed: number
  kickoff: Date
  winner?: string
  round: 'divisional' | 'conference' | 'superbowl'
}

const GAMES: Game[] = [
  // Divisional
  { id: 'div-1', awayTeam: 'Texans', awaySeed: 4, homeTeam: 'Chiefs', homeSeed: 1, kickoff: new Date('2026-01-18T16:30:00'), round: 'divisional' },
  { id: 'div-2', awayTeam: 'Rams', awaySeed: 3, homeTeam: 'Eagles', homeSeed: 2, kickoff: new Date('2026-01-19T15:00:00'), round: 'divisional' },
  { id: 'div-3', awayTeam: 'Ravens', awaySeed: 3, homeTeam: 'Bills', homeSeed: 2, kickoff: new Date('2026-01-19T18:30:00'), round: 'divisional' },
  { id: 'div-4', awayTeam: 'Commanders', awaySeed: 6, homeTeam: 'Lions', homeSeed: 1, kickoff: new Date('2026-01-18T20:15:00'), round: 'divisional' },
  // Conference (TBD - will be populated based on divisional results)
  { id: 'conf-afc', awayTeam: 'TBD', awaySeed: 0, homeTeam: 'TBD', homeSeed: 0, kickoff: new Date('2026-01-26T15:00:00'), round: 'conference' },
  { id: 'conf-nfc', awayTeam: 'TBD', awaySeed: 0, homeTeam: 'TBD', homeSeed: 0, kickoff: new Date('2026-01-26T18:30:00'), round: 'conference' },
  // Super Bowl (TBD)
  { id: 'sb', awayTeam: 'TBD', awaySeed: 0, homeTeam: 'TBD', homeSeed: 0, kickoff: new Date('2026-02-09T18:30:00'), round: 'superbowl' }
]

export default function Home() {
  const [activeTab, setActiveTab] = useState<'standings' | 'divisional' | 'conference' | 'superbowl' | 'picks'>('divisional')
  const [isAdminAuth, setIsAdminAuth] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [loggedInPlayer, setLoggedInPlayer] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [picks, setPicks] = useState<Record<string, Record<string, string>>>({})
  const [games, setGames] = useState<Game[]>(GAMES)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Load picks from Supabase
  useEffect(() => {
    loadPicks()
    const savedPlayer = localStorage.getItem('nfl-pickem-player')
    if (savedPlayer && PLAYERS.includes(savedPlayer)) {
      setLoggedInPlayer(savedPlayer)
    }
  }, [])

  const loadPicks = async () => {
    const { data, error } = await supabase.from('picks').select('*')
    if (!error && data) {
      const picksMap: Record<string, Record<string, string>> = {}
      data.forEach((pick: any) => {
        if (!picksMap[pick.player]) picksMap[pick.player] = {}
        picksMap[pick.player][pick.game_id] = pick.pick
      })
      setPicks(picksMap)
    }
  }

  const savePick = async (player: string, gameId: string, pick: string) => {
    await supabase.from('picks').upsert({
      player,
      game_id: gameId,
      pick
    }, { onConflict: 'player,game_id' })
    
    setPicks(prev => ({
      ...prev,
      [player]: { ...prev[player], [gameId]: pick }
    }))
  }

  const handleAdminLogin = () => {
    if (adminPassword === 'stgs2026') {
      setIsAdminAuth(true)
      setAdminPassword('')
      setShowAdmin(false)
    } else {
      alert('Incorrect password')
    }
  }

  const handlePlayerLogin = () => {
    const correctPassword = PLAYER_PASSWORDS[loginName]
    if (correctPassword && loginPassword === correctPassword) {
      setLoggedInPlayer(loginName)
      localStorage.setItem('nfl-pickem-player', loginName)
      setShowLoginModal(false)
      setLoginName('')
      setLoginPassword('')
      setLoginError('')
    } else {
      setLoginError('Invalid name or password')
    }
  }

  const handleLogout = () => {
    setLoggedInPlayer(null)
    localStorage.removeItem('nfl-pickem-player')
  }

  const calculatePoints = () => {
    const points: Record<string, number> = {}
    PLAYERS.forEach(player => {
      points[player] = 0
      Object.entries(picks[player] || {}).forEach(([gameId, pick]) => {
        const game = games.find(g => g.id === gameId)
        if (game?.winner && game.winner === pick) {
          const seed = pick === game.awayTeam ? game.awaySeed : game.homeSeed
          points[player] += ROUNDS[game.round].basePoints + seed
        }
      })
    })
    return points
  }

  const standings = PLAYERS.map(player => ({
    player,
    points: calculatePoints()[player]
  })).sort((a, b) => b.points - a.points)

  const renderRound = (round: 'divisional' | 'conference' | 'superbowl') => {
    const roundGames = games.filter(g => g.round === round)
    
    return (
      <div className="fade-in">
        <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 1rem 0' }}>
          <h2>🏈 {ROUNDS[round].name}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
            {ROUNDS[round].basePoints} pts + seed
          </p>
        </div>

        {/* Games */}
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {roundGames.map(game => {
            const isLocked = new Date() >= game.kickoff
            return (
              <div key={game.id} className="card">
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {game.kickoff.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {game.kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {game.winner && <span style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>✓ Final</span>}
                  </div>
                  
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {[{ team: game.awayTeam, seed: game.awaySeed }, { team: game.homeTeam, seed: game.homeSeed }].map(({ team, seed }) => {
                      if (team === 'TBD') return null
                      const isWinner = game.winner === team
                      return (
                        <div 
                          key={team}
                          onClick={() => isAdminAuth && setGames(prev => prev.map(g => g.id === game.id ? { ...g, winner: team } : g))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: isWinner ? 'rgba(76, 175, 80, 0.1)' : 'var(--bg-card-alt)',
                            border: `2px solid ${isWinner ? 'var(--accent-green)' : 'transparent'}`,
                            borderRadius: '8px',
                            cursor: isAdminAuth ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ 
                              background: 'var(--accent-gold)', 
                              color: 'var(--bg-primary)', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px', 
                              fontSize: '0.85rem', 
                              fontWeight: 'bold' 
                            }}>
                              {seed}
                            </span>
                            <span style={{ fontWeight: isWinner ? 'bold' : 'normal', fontSize: '1.1rem' }}>{team}</span>
                          </div>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            +{ROUNDS[round].basePoints + seed} pts
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Picks Table */}
        <div className="card">
          <div className="card-header">
            <h3>Player Picks</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>PLAYER</th>
                  {roundGames.map(game => (
                    <th key={game.id} style={{ padding: '1rem', textAlign: 'center', minWidth: '120px' }}>
                      {game.awayTeam !== 'TBD' ? `${game.awayTeam} @ ${game.homeTeam}` : 'TBD'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map(player => (
                  <tr key={player} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{player}</td>
                    {roundGames.map(game => {
                      const pick = picks[player]?.[game.id]
                      const isLocked = new Date() >= game.kickoff
                      const isCorrect = game.winner && pick === game.winner
                      
                      if (isAdminAuth) {
                        return (
                          <td key={game.id} style={{ padding: '1rem', textAlign: 'center' }}>
                            <select
                              value={pick || ''}
                              onChange={(e) => savePick(player, game.id, e.target.value)}
                              style={{
                                padding: '0.5rem',
                                background: 'var(--bg-card-alt)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="">-</option>
                              {game.awayTeam !== 'TBD' && <option value={game.awayTeam}>{game.awayTeam}</option>}
                              {game.homeTeam !== 'TBD' && <option value={game.homeTeam}>{game.homeTeam}</option>}
                            </select>
                          </td>
                        )
                      }
                      
                      return (
                        <td key={game.id} style={{ padding: '1rem', textAlign: 'center' }}>
                          {!isLocked && !pick && '-'}
                          {!isLocked && pick && '🔒'}
                          {isLocked && !pick && '-'}
                          {isLocked && pick && (
                            <span style={{ color: isCorrect ? 'var(--accent-green)' : game.winner ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                              {pick} {isCorrect && '✓'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style jsx global>{`
        :root {
          --bg-primary: #0a1929;
          --bg-secondary: #132f4c;
          --bg-card: #1e3a5f;
          --bg-card-alt: #152238;
          --text-primary: #ffffff;
          --text-secondary: #b0bec5;
          --text-muted: #7a8b99;
          --accent-gold: #ffd700;
          --accent-green: #4caf50;
          --accent-red: #f44336;
          --border-color: #2d4a6a;
        }
        body { margin: 0; padding: 0; }
        .card {
          background: var(--bg-card);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .card-header {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6a 100%);
          padding: 1.5rem;
          border-bottom: 2px solid var(--border-color);
        }
        .btn {
          padding: 0.75rem 1.5rem;
          background: var(--accent-gold);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover { opacity: 0.9; transform: translateY(-2px); }
        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .btn-danger {
          background: var(--accent-red);
          color: white;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-card);
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow: auto;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--accent-gold), #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          St. G's NFL Pick'em 2025-2026 PLAYOFFS
        </h1>

        {/* Admin/Login Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            {loggedInPlayer ? (
              <span style={{ color: 'var(--accent-green)' }}>
                ✓ Logged in as <strong>{loggedInPlayer}</strong>
                <button onClick={handleLogout} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                  Logout
                </button>
              </span>
            ) : (
              <button className="btn" onClick={() => setShowLoginModal(true)}>
                🔑 Login to Make Picks
              </button>
            )}
          </div>
          <button 
            className={`btn ${isAdminAuth ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => isAdminAuth ? setIsAdminAuth(false) : setShowAdmin(true)}
          >
            {isAdminAuth ? '🔒 Lock' : '⚙️ Admin'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {(['standings', 'divisional', 'conference', 'superbowl', 'picks'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn ${activeTab === tab ? '' : 'btn-secondary'}`}
              style={{ flex: '1', minWidth: '120px' }}
            >
              {tab === 'standings' ? '🏆 Standings' : 
               tab === 'picks' ? '📝 My Picks' :
               `🏈 ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'standings' && (
          <div className="card fade-in">
            <div className="card-header">
              <h2>🏆 Leaderboard</h2>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {standings.map((s, i) => (
                <div key={s.player} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '1rem', 
                  background: i === 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <span>
                    {i + 1}. <strong>{s.player}</strong>
                  </span>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{s.points}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'divisional' && renderRound('divisional')}
        {activeTab === 'conference' && renderRound('conference')}
        {activeTab === 'superbowl' && renderRound('superbowl')}

        {activeTab === 'picks' && (
          <div className="fade-in">
            {!loggedInPlayer ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  You need to login to make picks
                </p>
                <button className="btn" onClick={() => setShowLoginModal(true)}>
                  🔑 Login to Make Picks
                </button>
              </div>
            ) : (
              <div className="card">
                <div className="card-header">
                  <h3>Your Picks - {loggedInPlayer}</h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {(['divisional', 'conference', 'superbowl'] as const).map(round => {
                    const roundGames = games.filter(g => g.round === round)
                    return (
                      <div key={round} style={{ marginBottom: '2rem' }}>
                        <h4 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>{ROUNDS[round].name}</h4>
                        {roundGames.map(game => {
                          if (game.awayTeam === 'TBD') return null
                          const isLocked = new Date() >= game.kickoff
                          const currentPick = picks[loggedInPlayer]?.[game.id]
                          
                          return (
                            <div key={game.id} style={{ marginBottom: '1rem', opacity: isLocked ? 0.6 : 1 }}>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                {game.kickoff.toLocaleDateString()} • {isLocked ? 'Locked' : 'Pick before kickoff'}
                              </p>
                              <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {[{ team: game.awayTeam, seed: game.awaySeed }, { team: game.homeTeam, seed: game.homeSeed }].map(({ team, seed }) => (
                                  <button
                                    key={team}
                                    disabled={isLocked}
                                    onClick={() => savePick(loggedInPlayer, game.id, team)}
                                    style={{
                                      padding: '1rem',
                                      background: currentPick === team ? 'var(--accent-green)' : 'var(--bg-card-alt)',
                                      border: `2px solid ${currentPick === team ? 'var(--accent-green)' : 'var(--border-color)'}`,
                                      borderRadius: '8px',
                                      color: 'var(--text-primary)',
                                      cursor: isLocked ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <span><strong>{seed}</strong> {team}</span>
                                    <span>+{ROUNDS[round].basePoints + seed} pts</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Modal */}
      {showAdmin && (
        <div className="modal-overlay" onClick={() => setShowAdmin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h3>⚙️ Admin Login</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter admin password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg-card-alt)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem'
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowAdmin(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn" onClick={handleAdminLogin} style={{ flex: 1 }}>Login</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h3>🔑 Player Login</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <select 
                value={loginName}
                onChange={e => setLoginName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg-card-alt)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem'
                }}
              >
                <option value="">Select your name...</option>
                {PLAYERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlayerLogin()}
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--bg-card-alt)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem'
                }}
              />
              {loginError && <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '1rem' }}>{loginError}</p>}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Password is your name + 123 (e.g., jerin123)
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowLoginModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn" onClick={handlePlayerLogin} style={{ flex: 1 }}>Login</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
