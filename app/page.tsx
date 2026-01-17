'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

// Simple player passwords (in production, use proper auth)
// Each player logs in with their name + password
const PLAYER_PASSWORDS: Record<string, string> = {
  'Jerin': 'jerin123',
  'Jijesh': 'jijesh123',
  'Jaison': 'jaison123',
  'Jason': 'jason123',
  'Jeff': 'jeff123',
  'Jogi': 'jogi123',
  'Jubee': 'jubee123',
  'Nelson': 'nelson123',
  'Paul': 'paul123',
  'Renjith': 'renjith123',
}

// Types
interface ESPNGame {
  id: string
  date: string
  name: string
  shortName: string
  status: {
    type: {
      state: 'pre' | 'in' | 'post'
      completed: boolean
      detail: string
      shortDetail: string
    }
    displayClock: string
    period: number
  }
  competitions: Array<{
    competitors: Array<{
      id: string
      homeAway: 'home' | 'away'
      team: {
        displayName: string
        abbreviation: string
        shortDisplayName: string
      }
      score: string
      winner?: boolean
      records?: Array<{ summary: string }>
    }>
  }>
}

interface GameData {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  homeSeed: number
  awaySeed: number
  status: 'scheduled' | 'live' | 'final'
  statusDetail: string
  kickoff: Date
  winner: string | null
  conference: 'AFC' | 'NFC'
  round: RoundKey
}

type RoundKey = 'wildcard' | 'divisional' | 'conference' | 'superbowl'

interface RoundInfo {
  name: string
  basePoints: number
  games: number
}

const ROUNDS: Record<RoundKey, RoundInfo> = {
  wildcard: { name: 'Wild Card', basePoints: 1, games: 6 },
  divisional: { name: 'Divisional', basePoints: 2, games: 4 },
  conference: { name: 'Conference Championship', basePoints: 4, games: 2 },
  superbowl: { name: 'Super Bowl', basePoints: 8, games: 1 }
}

// Team seeding lookup (update for your season)
const TEAM_SEEDS: Record<string, { seed: number; conference: 'AFC' | 'NFC' }> = {
  // AFC
  'Denver Broncos': { seed: 1, conference: 'AFC' },
  'Broncos': { seed: 1, conference: 'AFC' },
  'New England Patriots': { seed: 2, conference: 'AFC' },
  'Patriots': { seed: 2, conference: 'AFC' },
  'Jacksonville Jaguars': { seed: 3, conference: 'AFC' },
  'Jaguars': { seed: 3, conference: 'AFC' },
  'Pittsburgh Steelers': { seed: 4, conference: 'AFC' },
  'Steelers': { seed: 4, conference: 'AFC' },
  'Houston Texans': { seed: 5, conference: 'AFC' },
  'Texans': { seed: 5, conference: 'AFC' },
  'Buffalo Bills': { seed: 6, conference: 'AFC' },
  'Bills': { seed: 6, conference: 'AFC' },
  'Los Angeles Chargers': { seed: 7, conference: 'AFC' },
  'Chargers': { seed: 7, conference: 'AFC' },
  // NFC
  'Seattle Seahawks': { seed: 1, conference: 'NFC' },
  'Seahawks': { seed: 1, conference: 'NFC' },
  'Chicago Bears': { seed: 2, conference: 'NFC' },
  'Bears': { seed: 2, conference: 'NFC' },
  'Philadelphia Eagles': { seed: 3, conference: 'NFC' },
  'Eagles': { seed: 3, conference: 'NFC' },
  'Carolina Panthers': { seed: 4, conference: 'NFC' },
  'Panthers': { seed: 4, conference: 'NFC' },
  'Los Angeles Rams': { seed: 5, conference: 'NFC' },
  'Rams': { seed: 5, conference: 'NFC' },
  'San Francisco 49ers': { seed: 6, conference: 'NFC' },
  '49ers': { seed: 6, conference: 'NFC' },
  'Green Bay Packers': { seed: 7, conference: 'NFC' },
  'Packers': { seed: 7, conference: 'NFC' },
}

const getTeamInfo = (teamName: string) => {
  return TEAM_SEEDS[teamName] || TEAM_SEEDS[teamName.replace(/^(Los Angeles|San Francisco|New England|Green Bay|Jacksonville|Pittsburgh|Houston|Buffalo|Denver|Seattle|Chicago|Philadelphia|Carolina) /, '')] || { seed: 0, conference: 'AFC' as const }
}

// Initial data
const initialPlayers = ['Jerin', 'Jijesh', 'Jaison', 'Jason', 'Jeff', 'Jogi', 'Jubee', 'Nelson', 'Paul', 'Renjith']

const initialPicks: Record<string, Record<string, string>> = {
  'Jerin': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jijesh': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Packers', 'wc-5': 'Eagles', 'wc-6': 'Rams' },
  'Jaison': { 'wc-1': 'Chargers', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams' },
  'Jason': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': 'Seahawks', 'div-4': 'Rams' },
  'Jeff': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams' },
  'Jogi': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jubee': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams' },
  'Nelson': { 'wc-1': 'Patriots', 'wc-2': 'Jaguars', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Paul': { 'wc-1': 'Chargers', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams' },
  'Renjith': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams' },
}

// Wild card results (completed games)
const wildcardResults: Record<string, string> = {
  'wc-1': 'Patriots',
  'wc-2': 'Bills', 
  'wc-3': 'Texans',
  'wc-4': 'Bears',
  'wc-5': '49ers',
  'wc-6': 'Rams',
}

export default function NFLPickem() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [players] = useState(initialPlayers)
  const [picks, setPicks] = useState(initialPicks)
  const [liveGames, setLiveGames] = useState<GameData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAdminAuth, setIsAdminAuth] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showPickModal, setShowPickModal] = useState(false)
  
  // Player login state
  const [loggedInPlayer, setLoggedInPlayer] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  // Check for saved login on mount
  useEffect(() => {
    const saved = localStorage.getItem('nfl-pickem-player')
    if (saved && PLAYER_PASSWORDS[saved]) {
      setLoggedInPlayer(saved)
      setSelectedPlayer(saved)
    }
  }, [])

  // Fetch live scores from ESPN
  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
      const data = await res.json()
      
      const games: GameData[] = data.events?.map((event: ESPNGame, index: number) => {
        const comp = event.competitions[0]
        const home = comp.competitors.find(c => c.homeAway === 'home')!
        const away = comp.competitors.find(c => c.homeAway === 'away')!
        
        const homeInfo = getTeamInfo(home.team.displayName)
        const awayInfo = getTeamInfo(away.team.displayName)
        
        let status: 'scheduled' | 'live' | 'final' = 'scheduled'
        if (event.status.type.state === 'in') status = 'live'
        else if (event.status.type.state === 'post') status = 'final'
        
        let winner: string | null = null
        if (status === 'final') {
          const homeScore = parseInt(home.score || '0')
          const awayScore = parseInt(away.score || '0')
          winner = homeScore > awayScore ? home.team.shortDisplayName : away.team.shortDisplayName
        }
        
        return {
          id: `div-${index + 1}`,
          homeTeam: home.team.shortDisplayName,
          awayTeam: away.team.shortDisplayName,
          homeScore: parseInt(home.score || '0'),
          awayScore: parseInt(away.score || '0'),
          homeSeed: homeInfo.seed,
          awaySeed: awayInfo.seed,
          status,
          statusDetail: event.status.type.shortDetail,
          kickoff: new Date(event.date),
          winner,
          conference: homeInfo.conference,
          round: 'divisional' as RoundKey
        }
      }) || []
      
      setLiveGames(games)
      setLastUpdate(new Date())
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching scores:', error)
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh every 30 seconds during live games
  useEffect(() => {
    fetchScores()
    const hasLiveGame = liveGames.some(g => g.status === 'live')
    const interval = setInterval(fetchScores, hasLiveGame ? 30000 : 60000)
    return () => clearInterval(interval)
  }, [fetchScores, liveGames.some(g => g.status === 'live')])

  // Calculate points
  const calculatePoints = useCallback((playerName: string) => {
    const playerPicks = picks[playerName] || {}
    let total = 0
    const breakdown: Record<RoundKey, number> = { wildcard: 0, divisional: 0, conference: 0, superbowl: 0 }
    
    // Wildcard points
    Object.entries(wildcardResults).forEach(([gameId, winner]) => {
      if (playerPicks[gameId] === winner) {
        const winnerInfo = getTeamInfo(winner)
        const pts = ROUNDS.wildcard.basePoints + winnerInfo.seed
        breakdown.wildcard += pts
        total += pts
      }
    })
    
    // Divisional points (from live/final games)
    liveGames.forEach(game => {
      if (game.status === 'final' && game.winner) {
        const pick = playerPicks[game.id]
        if (pick === game.winner) {
          const winnerInfo = getTeamInfo(game.winner)
          const pts = ROUNDS.divisional.basePoints + winnerInfo.seed
          breakdown.divisional += pts
          total += pts
        }
      }
    })
    
    return { total, breakdown }
  }, [picks, liveGames])

  // Generate leaderboard
  const leaderboard = useMemo(() => {
    return players.map(player => {
      const { total, breakdown } = calculatePoints(player)
      return { name: player, total, breakdown }
    }).sort((a, b) => b.total - a.total)
  }, [players, calculatePoints])

  // Check if picks should be hidden (game hasn't started)
  const shouldHidePick = (gameId: string, currentPlayer: string, viewingPlayer: string | null): boolean => {
    if (isAdminAuth) return false
    if (currentPlayer === viewingPlayer) return false
    
    // For wildcard games (already completed)
    if (gameId.startsWith('wc-')) return false
    
    // For divisional games, check kickoff time
    const game = liveGames.find(g => g.id === gameId)
    if (game && new Date() >= game.kickoff) return false
    
    return true
  }

  const hasLiveGame = liveGames.some(g => g.status === 'live')

  // Admin authentication
  const handleAdminLogin = () => {
    // Simple password check (in production, use proper auth)
    if (adminPassword === 'stgs2026' || adminPassword === process.env.ADMIN_PASSWORD) {
      setIsAdminAuth(true)
      setAdminPassword('')
    } else {
      alert('Incorrect password')
    }
  }

  // Player login
  const handlePlayerLogin = () => {
    const correctPassword = PLAYER_PASSWORDS[loginName]
    if (correctPassword && loginPassword === correctPassword) {
      setLoggedInPlayer(loginName)
      setSelectedPlayer(loginName)
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
    setSelectedPlayer(null)
    localStorage.removeItem('nfl-pickem-player')
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header fade-in">
        <h1>St. G&apos;s NFL Pick&apos;em</h1>
        <p className="subtitle">2025-2026 Playoffs</p>
        {hasLiveGame && (
          <div className="live-indicator">
            <span className="pulse"></span>
            LIVE GAMES IN PROGRESS
          </div>
        )}
      </header>

      {/* Navigation */}
      <nav className="nav-tabs fade-in">
        {[
          { id: 'leaderboard', label: '🏆 Standings' },
          { id: 'live', label: '📺 Live Scores' },
          { id: 'wildcard', label: 'Wild Card' },
          { id: 'divisional', label: 'Divisional' },
          { id: 'picks', label: '📝 My Picks' },
          { id: 'scoring', label: 'How It Works' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Admin Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div>
          {loggedInPlayer ? (
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-green)' }}>
              ✓ Logged in as <strong>{loggedInPlayer}</strong>
              <button 
                onClick={handleLogout}
                style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Logout
              </button>
            </span>
          ) : (
            <button className="btn" onClick={() => setShowLoginModal(true)}>
              🔑 Login to Make Picks
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {lastUpdate && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button className="btn btn-small btn-secondary" onClick={fetchScores} disabled={isLoading}>
            🔄
          </button>
          <button 
            className={`btn btn-small ${isAdminAuth ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => isAdminAuth ? setIsAdminAuth(false) : setShowAdmin(true)}
          >
            {isAdminAuth ? '🔒' : '⚙️'}
          </button>
        </div>
      </div>

      {/* Player Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Player Login</h3>
              <button className="modal-close" onClick={() => setShowLoginModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Your Name</label>
                <select 
                  value={loginName}
                  onChange={e => setLoginName(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select your name...</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePlayerLogin()}
                  placeholder="Enter your password"
                  style={{ width: '100%' }}
                />
              </div>
              {loginError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{loginError}</p>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                Password is your name + 123 (e.g., jerin123)
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLoginModal(false)}>Cancel</button>
              <button className="btn" onClick={handlePlayerLogin}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdmin && !isAdminAuth && (
        <div className="modal-overlay" onClick={() => setShowAdmin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Admin Login</h3>
              <button className="modal-close" onClick={() => setShowAdmin(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="Enter admin password"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdmin(false)}>Cancel</button>
              <button className="btn" onClick={handleAdminLogin}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="card fade-in">
          <div className="card-header">
            <h2>🏆 Leaderboard</h2>
          </div>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Wild Card</th>
                <th>Divisional</th>
                <th>Conf</th>
                <th>SB</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, idx) => (
                <tr key={player.name}>
                  <td className={`rank rank-${idx + 1}`}>{idx + 1}</td>
                  <td className="player-name">{player.name}</td>
                  <td className="week-points">{player.breakdown.wildcard || '-'}</td>
                  <td className="week-points">{player.breakdown.divisional || '-'}</td>
                  <td className="week-points">{player.breakdown.conference || '-'}</td>
                  <td className="week-points">{player.breakdown.superbowl || '-'}</td>
                  <td className="points">{player.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live Scores Tab */}
      {activeTab === 'live' && (
        <div className="fade-in">
          <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 1rem 0' }}>
            <h2>📺 Divisional Round - Live Scores</h2>
          </div>
          
          {isLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>Loading scores...</p>
          ) : (
            <div className="games-grid">
              {liveGames.map(game => (
                <div key={game.id} className={`game-card ${game.status}`}>
                  <div className={`game-status ${game.status}`}>
                    <span>{game.conference} Divisional</span>
                    <span>{game.statusDetail}</span>
                  </div>
                  <div className="game-teams">
                    <div className={`game-team ${game.status === 'final' && game.winner === game.awayTeam ? 'winner' : ''} ${game.status === 'final' && game.winner !== game.awayTeam ? 'loser' : ''}`}>
                      <span className="seed-badge">{game.awaySeed}</span>
                      <span className="team-name">{game.awayTeam}</span>
                      <span className="team-score">{game.status !== 'scheduled' ? game.awayScore : '-'}</span>
                    </div>
                    <span className="game-vs">@</span>
                    <div className={`game-team ${game.status === 'final' && game.winner === game.homeTeam ? 'winner' : ''} ${game.status === 'final' && game.winner !== game.homeTeam ? 'loser' : ''}`}>
                      <span className="seed-badge">{game.homeSeed}</span>
                      <span className="team-name">{game.homeTeam}</span>
                      <span className="team-score">{game.status !== 'scheduled' ? game.homeScore : '-'}</span>
                    </div>
                  </div>
                  <div className="game-info">
                    <span>Potential: <span className="potential-pts">{game.awayTeam} +{ROUNDS.divisional.basePoints + game.awaySeed}</span> | <span className="potential-pts">{game.homeTeam} +{ROUNDS.divisional.basePoints + game.homeSeed}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Wild Card Tab */}
      {activeTab === 'wildcard' && (
        <div className="fade-in">
          <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 1rem 0' }}>
            <h2>🏈 Wild Card Round (Complete)</h2>
            <span style={{ background: 'var(--accent-green)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}>1 pt + seed</span>
          </div>
          
          <div className="card">
            <div className="picks-table-container">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>CHG@PAT</th>
                    <th>BIL@JAG</th>
                    <th>TEX@STL</th>
                    <th>PAC@BEA</th>
                    <th>49R@EAG</th>
                    <th>RAM@PAN</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => {
                    const playerPicks = picks[player] || {}
                    const { breakdown } = calculatePoints(player)
                    return (
                      <tr key={player}>
                        <td>{player}</td>
                        {['wc-1', 'wc-2', 'wc-3', 'wc-4', 'wc-5', 'wc-6'].map(gameId => {
                          const pick = playerPicks[gameId]
                          const result = wildcardResults[gameId]
                          const isCorrect = pick === result
                          return (
                            <td key={gameId} className={`pick-cell ${isCorrect ? 'correct' : 'incorrect'}`}>
                              {pick || '-'}
                            </td>
                          )
                        })}
                        <td className="points">{breakdown.wildcard}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Results: Patriots, Bills, Texans, Bears, 49ers, Rams
          </p>
        </div>
      )}

      {/* Divisional Tab */}
      {activeTab === 'divisional' && (
        <div className="fade-in">
          <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 1rem 0' }}>
            <h2>🏈 Divisional Round</h2>
            <span style={{ background: 'var(--accent-gold)', color: 'var(--bg-dark)', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}>2 pts + seed</span>
          </div>
          
          <div className="card">
            <div className="picks-table-container">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    {liveGames.map(game => (
                      <th key={game.id}>{game.awayTeam.substring(0,3).toUpperCase()}@{game.homeTeam.substring(0,3).toUpperCase()}</th>
                    ))}
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => {
                    const playerPicks = picks[player] || {}
                    const { breakdown } = calculatePoints(player)
                    return (
                      <tr key={player}>
                        <td>{player}</td>
                        {liveGames.map(game => {
                          const pick = playerPicks[game.id]
                          const hidden = shouldHidePick(game.id, player, selectedPlayer)
                          const isCorrect = game.status === 'final' && pick === game.winner
                          const isIncorrect = game.status === 'final' && pick && pick !== game.winner
                          
                          return (
                            <td 
                              key={game.id} 
                              className={`pick-cell ${hidden ? 'hidden' : isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}
                            >
                              {hidden ? '🔒' : pick || '-'}
                            </td>
                          )
                        })}
                        <td className="points">{breakdown.divisional}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My Picks Tab */}
      {activeTab === 'picks' && (
        <div className="fade-in">
          <div className="card-header" style={{ background: 'transparent', border: 'none', padding: '0 0 1rem 0' }}>
            <h2>📝 Enter Your Picks</h2>
          </div>
          
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
                <h3>Divisional Round Picks for {loggedInPlayer}</h3>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div className="pick-entry">
                  {liveGames.map(game => {
                    const isLocked = new Date() >= game.kickoff
                    const currentPick = picks[loggedInPlayer]?.[game.id]
                    
                    return (
                      <div key={game.id} className="pick-matchup">
                        <div 
                          className={`pick-option ${currentPick === game.awayTeam ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                          onClick={() => {
                            if (isLocked || !loggedInPlayer) return
                            setPicks(prev => ({
                              ...prev,
                              [loggedInPlayer]: {
                                ...prev[loggedInPlayer],
                                [game.id]: game.awayTeam
                              }
                            }))
                          }}
                        >
                          <span className="seed-badge">{game.awaySeed}</span>
                          <span className="team-name">{game.awayTeam}</span>
                          <span className="potential-pts">+{ROUNDS.divisional.basePoints + game.awaySeed} pts</span>
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isLocked ? '🔒 LOCKED' : game.statusDetail}
                          </span>
                        </div>
                        
                        <div 
                          className={`pick-option ${currentPick === game.homeTeam ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                          onClick={() => {
                            if (isLocked || !loggedInPlayer) return
                            setPicks(prev => ({
                              ...prev,
                              [loggedInPlayer]: {
                                ...prev[loggedInPlayer],
                                [game.id]: game.homeTeam
                              }
                            }))
                          }}
                        >
                          <span className="seed-badge">{game.homeSeed}</span>
                          <span className="team-name">{game.homeTeam}</span>
                          <span className="potential-pts">+{ROUNDS.divisional.basePoints + game.homeSeed} pts</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
                  ⚠️ Picks lock at kickoff and are hidden from others until then
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scoring Tab */}
      {activeTab === 'scoring' && (
        <div className="fade-in">
          <div className="card">
            <div className="card-header">
              <h2>📊 How Scoring Works</h2>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Correct picks earn base points plus a seed bonus. Picking underdogs pays off big!
              </p>
              
              <div className="scoring-grid">
                {Object.entries(ROUNDS).map(([key, round]) => (
                  <div className="scoring-item" key={key}>
                    <span className="scoring-multiplier">+{round.basePoints}</span>
                    <div className="scoring-details">
                      <span className="scoring-round">{round.name}</span>
                      <span className="scoring-formula">{round.basePoints} + seed ({round.games} games)</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--bg-card-alt)', borderRadius: '12px' }}>
                <h4 style={{ fontFamily: 'Oswald', marginBottom: '1rem' }}>Example - Divisional Round</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  If you correctly pick the <strong style={{ color: 'var(--accent-gold)' }}>#6 Bills</strong> to beat the #1 Broncos:<br />
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--accent-green)' }}>
                    2 (base) + 6 (seed) = 8 points! 🎉
                  </span>
                </p>
                <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.8 }}>
                  If you pick the <strong style={{ color: 'var(--accent-gold)' }}>#1 Broncos</strong>:<br />
                  <span style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', color: 'var(--accent-green)' }}>
                    2 (base) + 1 (seed) = 3 points
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>St. G&apos;s NFL Pick&apos;em 2025-2026 • Scores via ESPN</p>
      </footer>
    </div>
  )
}
