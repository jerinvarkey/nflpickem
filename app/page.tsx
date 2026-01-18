'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Player passwords
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

// Game data structure
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
  round: 'wildcard' | 'divisional' | 'conference' | 'superbowl'
}

// Team seeding
const TEAM_SEEDS: Record<string, { seed: number; conference: 'AFC' | 'NFC' }> = {
  'Chiefs': { seed: 1, conference: 'AFC' },
  'Patriots': { seed: 2, conference: 'AFC' },
  'Jaguars': { seed: 3, conference: 'AFC' },
  'Steelers': { seed: 4, conference: 'AFC' },
  'Texans': { seed: 5, conference: 'AFC' },
  'Bills': { seed: 6, conference: 'AFC' },
  'Chargers': { seed: 7, conference: 'AFC' },
  'Broncos': { seed: 1, conference: 'AFC' }, // Assuming top seed
  'Lions': { seed: 1, conference: 'NFC' },
  'Bears': { seed: 2, conference: 'NFC' },
  'Eagles': { seed: 3, conference: 'NFC' },
  'Panthers': { seed: 4, conference: 'NFC' },
  'Rams': { seed: 5, conference: 'NFC' },
  '49ers': { seed: 6, conference: 'NFC' },
  'Packers': { seed: 7, conference: 'NFC' },
  'Seahawks': { seed: 1, conference: 'NFC' }, // Assuming top seed
}

const getTeamInfo = (team: string) => TEAM_SEEDS[team] || { seed: 7, conference: 'AFC' }

// HARDCODED PLAYOFF GAMES - These never change
const PLAYOFF_GAMES: GameData[] = [
  // WILDCARD (completed)
  { id: 'wc-1', awayTeam: 'Chargers', awaySeed: 7, homeTeam: 'Patriots', homeSeed: 2, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-11'), winner: 'Patriots', conference: 'AFC', round: 'wildcard' },
  { id: 'wc-2', awayTeam: 'Bills', awaySeed: 6, homeTeam: 'Jaguars', homeSeed: 3, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-11'), winner: 'Bills', conference: 'AFC', round: 'wildcard' },
  { id: 'wc-3', awayTeam: 'Texans', awaySeed: 5, homeTeam: 'Steelers', homeSeed: 4, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-12'), winner: 'Texans', conference: 'AFC', round: 'wildcard' },
  { id: 'wc-4', awayTeam: 'Packers', awaySeed: 7, homeTeam: 'Bears', homeSeed: 2, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-12'), winner: 'Bears', conference: 'NFC', round: 'wildcard' },
  { id: 'wc-5', awayTeam: '49ers', awaySeed: 6, homeTeam: 'Eagles', homeSeed: 3, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-13'), winner: '49ers', conference: 'NFC', round: 'wildcard' },
  { id: 'wc-6', awayTeam: 'Rams', awaySeed: 5, homeTeam: 'Panthers', homeSeed: 4, homeScore: 0, awayScore: 0, status: 'final', statusDetail: 'Final', kickoff: new Date('2026-01-13'), winner: 'Rams', conference: 'NFC', round: 'wildcard' },
  
  // DIVISIONAL (from your spreadsheet)
  { id: 'div-1', awayTeam: 'Bills', awaySeed: 6, homeTeam: 'Broncos', homeSeed: 1, homeScore: 0, awayScore: 0, status: 'scheduled', statusDetail: 'TBD', kickoff: new Date('2026-01-18T20:00:00'), winner: null, conference: 'AFC', round: 'divisional' },
  { id: 'div-2', awayTeam: 'Texans', awaySeed: 5, homeTeam: 'Patriots', homeSeed: 2, homeScore: 0, awayScore: 0, status: 'scheduled', statusDetail: 'TBD', kickoff: new Date('2026-01-18T20:00:00'), winner: null, conference: 'AFC', round: 'divisional' },
  { id: 'div-3', awayTeam: '49ers', awaySeed: 6, homeTeam: 'Seahawks', homeSeed: 1, homeScore: 0, awayScore: 0, status: 'scheduled', statusDetail: 'TBD', kickoff: new Date('2026-01-19T20:00:00'), winner: null, conference: 'NFC', round: 'divisional' },
  { id: 'div-4', awayTeam: 'Rams', awaySeed: 5, homeTeam: 'Bears', homeSeed: 2, homeScore: 0, awayScore: 0, status: 'scheduled', statusDetail: 'TBD', kickoff: new Date('2026-01-19T20:00:00'), winner: null, conference: 'NFC', round: 'divisional' },
]

// Round scoring
const ROUNDS = {
  wildcard: { name: 'Wild Card', basePoints: 1, games: 6 },
  divisional: { name: 'Divisional', basePoints: 2, games: 4 },
  conference: { name: 'Conference Championship', basePoints: 4, games: 2 },
  superbowl: { name: 'Super Bowl', basePoints: 8, games: 1 }
}

// Initial picks from your spreadsheet
const initialPicks: Record<string, Record<string, string>> = {
  'Jerin': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jijesh': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Packers', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jaison': { 'wc-1': 'Chargers', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jason': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': 'Seahawks', 'div-4': 'Rams' },
  'Jeff': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jogi': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Jubee': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Broncos', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Rams' },
  'Nelson': { 'wc-1': 'Patriots', 'wc-2': 'Jaguars', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Texans', 'div-3': '49ers', 'div-4': 'Bears' },
  'Paul': { 'wc-1': 'Chargers', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': 'Eagles', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Seahawks', 'div-3': '49ers', 'div-4': 'Rams' },
  'Renjith': { 'wc-1': 'Patriots', 'wc-2': 'Bills', 'wc-3': 'Texans', 'wc-4': 'Bears', 'wc-5': '49ers', 'wc-6': 'Rams', 'div-1': 'Bills', 'div-2': 'Seahawks', 'div-3': '49ers', 'div-4': 'Rams' },
}

const initialPlayers = Object.keys(PLAYER_PASSWORDS)

export default function NFLPickem() {
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [players] = useState(initialPlayers)
  const [picks, setPicks] = useState(initialPicks)
  const [liveGames, setLiveGames] = useState<GameData[]>(PLAYOFF_GAMES)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Admin state
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [isAdminAuth, setIsAdminAuth] = useState(false)
  
  // Login state
  const [loggedInPlayer, setLoggedInPlayer] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginName, setLoginName] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwords, setPasswords] = useState(PLAYER_PASSWORDS)

  // Load picks from Supabase on mount
  useEffect(() => {
    loadPicksFromSupabase()
  }, [])
  
  const loadPicksFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('picks').select('*')
      if (error) throw error
      
      // Start with initialPicks as the base
      const picksMap: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(initialPicks))
      
      // Merge in Supabase data (overrides initialPicks where it exists)
      if (data && data.length > 0) {
        data.forEach((pick: any) => {
          if (!picksMap[pick.player]) picksMap[pick.player] = {}
          picksMap[pick.player][pick.game_id] = pick.pick
        })
      }
      
      setPicks(picksMap)
    } catch (error) {
      console.error('Error loading picks:', error)
      setPicks(initialPicks) // Fallback to initialPicks on error
    }
  }
  
  const savePickToSupabase = async (player: string, gameId: string, pick: string) => {
    try {
      const { error } = await supabase
        .from('picks')
        .upsert({
          player,
          game_id: gameId,
          pick
        }, { 
          onConflict: 'player,game_id'
        })
      
      if (error) throw error
    } catch (error) {
      console.error('Error saving pick:', error)
    }
  }

  // Check for saved login on mount
  useEffect(() => {
    const saved = localStorage.getItem('nfl-pickem-player')
    if (saved && passwords[saved]) {
      setLoggedInPlayer(saved)
    }
  }, [passwords])

  // Fetch live scores from ESPN (updates hardcoded games + auto-detects conference/SB)
  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard')
      const data = await res.json()
      
      const allGames: GameData[] = []
      
      // First, update our hardcoded games with live scores
      PLAYOFF_GAMES.forEach(game => {
        const espnGame = data.events?.find((e: any) => {
          const comp = e.competitions[0]
          const home = comp.competitors.find((c: any) => c.homeAway === 'home')
          const away = comp.competitors.find((c: any) => c.homeAway === 'away')
          return home?.team.shortDisplayName === game.homeTeam && 
                 away?.team.shortDisplayName === game.awayTeam
        })
        
        if (espnGame) {
          const comp = espnGame.competitions[0]
          const home = comp.competitors.find((c: any) => c.homeAway === 'home')
          const away = comp.competitors.find((c: any) => c.homeAway === 'away')
          
          let status: 'scheduled' | 'live' | 'final' = 'scheduled'
          if (espnGame.status.type.state === 'in') status = 'live'
          else if (espnGame.status.type.state === 'post') status = 'final'
          
          let winner: string | null = null
          if (status === 'final') {
            const homeScore = parseInt(home.score || '0')
            const awayScore = parseInt(away.score || '0')
            winner = homeScore > awayScore ? game.homeTeam : game.awayTeam
          }
          
          allGames.push({
            ...game,
            homeScore: parseInt(home.score || '0'),
            awayScore: parseInt(away.score || '0'),
            status,
            statusDetail: espnGame.status.type.shortDetail,
            winner
          })
        } else {
          allGames.push(game)
        }
      })
      
      // Now auto-detect conference championship and super bowl games from ESPN
      data.events?.forEach((event: any) => {
        const eventName = event.name.toLowerCase()
        let round: 'conference' | 'superbowl' | null = null
        
        if (eventName.includes('conference') || eventName.includes('championship')) {
          round = 'conference'
        } else if (eventName.includes('super bowl')) {
          round = 'superbowl'
        }
        
        // Only process conference/super bowl games
        if (round) {
          const comp = event.competitions[0]
          const home = comp.competitors.find((c: any) => c.homeAway === 'home')
          const away = comp.competitors.find((c: any) => c.homeAway === 'away')
          
          const homeTeam = home.team.shortDisplayName
          const awayTeam = away.team.shortDisplayName
          const homeInfo = getTeamInfo(homeTeam)
          const awayInfo = getTeamInfo(awayTeam)
          
          // Create stable ID based on teams
          const gameId = `${round}-${awayTeam.toLowerCase()}-${homeTeam.toLowerCase()}`
          
          // Check if we already have this game
          if (!allGames.find(g => g.id === gameId)) {
            let status: 'scheduled' | 'live' | 'final' = 'scheduled'
            if (event.status.type.state === 'in') status = 'live'
            else if (event.status.type.state === 'post') status = 'final'
            
            let winner: string | null = null
            if (status === 'final') {
              const homeScore = parseInt(home.score || '0')
              const awayScore = parseInt(away.score || '0')
              winner = homeScore > awayScore ? homeTeam : awayTeam
            }
            
            allGames.push({
              id: gameId,
              homeTeam,
              awayTeam,
              homeScore: parseInt(home.score || '0'),
              awayScore: parseInt(away.score || '0'),
              homeSeed: homeInfo.seed,
              awaySeed: awayInfo.seed,
              status,
              statusDetail: event.status.type.shortDetail,
              kickoff: new Date(event.date),
              winner,
              conference: homeInfo.conference,
              round
            })
          }
        }
      })
      
      setLiveGames(allGames)
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
  }, [fetchScores, liveGames])

  // Calculate points
  const calculatePoints = useCallback((playerName: string) => {
    const playerPicks = picks[playerName] || {}
    let total = 0
    const breakdown = { wildcard: 0, divisional: 0, conference: 0, superbowl: 0 }
    
    liveGames.forEach(game => {
      if (game.status === 'final' && game.winner) {
        const pick = playerPicks[game.id]
        if (pick === game.winner) {
          const winnerInfo = getTeamInfo(game.winner)
          const pts = ROUNDS[game.round].basePoints + winnerInfo.seed
          breakdown[game.round] += pts
          total += pts
        }
      }
    })
    
    return { total, breakdown }
  }, [picks, liveGames])

  // Player login
  const handleLogin = () => {
    if (passwords[loginName] === loginPassword) {
      setLoggedInPlayer(loginName)
      localStorage.setItem('nfl-pickem-player', loginName)
      setShowLoginModal(false)
      setLoginError('')
      setLoginName('')
      setLoginPassword('')
    } else {
      setLoginError('Invalid name or password')
    }
  }

  const handleLogout = () => {
    setLoggedInPlayer(null)
    localStorage.removeItem('nfl-pickem-player')
  }

  // Admin authentication
  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdminAuth(true)
      setShowAdmin(false)
      setAdminPassword('')
    }
  }

  // Password change
  const handlePasswordChange = async () => {
    if (!loggedInPlayer) return
    
    // Admin can change anyone's password, users can only change their own
    if (!isAdminAuth && passwords[loggedInPlayer] !== oldPassword) {
      setPasswordError('Current password is incorrect')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    
    // Update password in state (in production, save to database)
    setPasswords(prev => ({
      ...prev,
      [loggedInPlayer]: newPassword
    }))
    
    setShowPasswordModal(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    alert('Password changed successfully!')
  }

  // Check if game has started
  const hasGameStarted = (gameId: string) => {
    const game = liveGames.find(g => g.id === gameId)
    if (!game) return false
    return new Date() >= game.kickoff
  }

  // Check if picks are locked
  const arePicksLocked = (gameId: string) => {
    if (isAdminAuth) return false
    return hasGameStarted(gameId)
  }

  // Leaderboard
  const leaderboard = useMemo(() => {
    return players.map(player => {
      const { total, breakdown } = calculatePoints(player)
      return { player, total, breakdown }
    }).sort((a, b) => b.total - a.total)
  }, [players, calculatePoints])

  // Divisional dropdown options
  const divisionalOptions = useMemo(() => {
    const divGames = liveGames.filter(g => g.round === 'divisional')
    return divGames.reduce((acc, game) => {
      acc[game.id] = [game.awayTeam, game.homeTeam]
      return acc
    }, {} as Record<string, string[]>)
  }, [liveGames])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#e0e0e0', fontFamily: "'Oswald', sans-serif" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Source Sans 3', sans-serif; }
        h1, h2, h3 { font-family: 'Bebas Neue', cursive; letter-spacing: 2px; }
        
        :root {
          --bg-dark: #0f1419;
          --bg-card: #1a1f29;
          --bg-card-alt: #242b38;
          --text-primary: #e0e0e0;
          --text-secondary: #a0a0a0;
          --text-muted: #666;
          --border-color: #2a3441;
          --accent-gold: #ffd700;
          --accent-green: #00ff88;
          --accent-red: #ff4444;
        }
        
        .btn {
          background: linear-gradient(135deg, var(--accent-gold), #ffed4e);
          color: #000;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255, 215, 0, 0.4); }
        .btn-secondary { background: var(--bg-card-alt); color: var(--text-primary); }
        .btn-danger { background: linear-gradient(135deg, #ff4444, #ff6666); color: white; }
        .btn-small { padding: 0.5rem 1rem; font-size: 0.9rem; }
        
        .card {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        
        .card-header {
          background: var(--bg-card-alt);
          padding: 1rem 1.5rem;
          border-bottom: 2px solid var(--accent-gold);
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border-color);
        }
        
        th {
          background: var(--bg-card-alt);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 1px;
          color: var(--accent-gold);
        }
        
        tr:hover {
          background: var(--bg-card-alt);
        }
        
        .pick-cell {
          font-weight: 600;
        }
        
        .pick-cell.correct {
          background: rgba(0, 255, 136, 0.1);
          color: var(--accent-green);
        }
        
        .pick-cell.incorrect {
          background: rgba(255, 68, 68, 0.1);
          color: var(--accent-red);
          text-decoration: line-through;
        }
        
        .pick-cell.pending {
          color: var(--text-secondary);
        }
        
        .pick-cell.hidden {
          color: var(--text-muted);
          font-size: 1.5rem;
        }
        
        .points {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent-gold);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
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
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .modal-body {
          padding: 1.5rem;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        
        input, select {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 1rem;
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: var(--accent-gold);
        }
        
        .error {
          color: var(--accent-red);
          font-size: 0.85rem;
          margin-top: 0.5rem;
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

        {/* Login/Admin Bar */}
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
            className={`btn btn-small ${isAdminAuth ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => isAdminAuth ? setIsAdminAuth(false) : setShowAdmin(true)}
          >
            {isAdminAuth ? '🔒 Lock' : '⚙️ Admin'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('leaderboard')} className={`btn ${activeTab === 'leaderboard' ? '' : 'btn-secondary'}`} style={{ flex: '1', minWidth: '120px' }}>
            🏆 Standings
          </button>
          <button onClick={() => setActiveTab('divisional')} className={`btn ${activeTab === 'divisional' ? '' : 'btn-secondary'}`} style={{ flex: '1', minWidth: '120px' }}>
            🏈 Divisional
          </button>
          <button onClick={() => setActiveTab('conference')} className={`btn ${activeTab === 'conference' ? '' : 'btn-secondary'}`} style={{ flex: '1', minWidth: '120px' }}>
            🏆 Conference
          </button>
          <button onClick={() => setActiveTab('superbowl')} className={`btn ${activeTab === 'superbowl' ? '' : 'btn-secondary'}`} style={{ flex: '1', minWidth: '120px' }}>
            🏆 Super Bowl
          </button>
        </div>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="card">
            <div className="card-header">
              <h3>Current Standings</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>WC</th>
                    <th>DIV</th>
                    <th>CONF</th>
                    <th>SB</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item, idx) => (
                    <tr key={item.player}>
                      <td style={{ fontSize: '1.5rem' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </td>
                      <td style={{ fontWeight: '700', fontSize: '1.1rem' }}>{item.player}</td>
                      <td>{item.breakdown.wildcard}</td>
                      <td>{item.breakdown.divisional}</td>
                      <td>{item.breakdown.conference}</td>
                      <td>{item.breakdown.superbowl}</td>
                      <td className="points">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Divisional Tab */}
        {activeTab === 'divisional' && (
          <div>
            {/* Wildcard Results */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h3>🏆 Wild Card Round (Complete)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      {liveGames.filter(g => g.round === 'wildcard').map(game => (
                        <th key={game.id}>{game.awayTeam} @ {game.homeTeam}</th>
                      ))}
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => {
                      const playerPicks = picks[player] || {}
                      const { breakdown } = calculatePoints(player)
                      
                      return (
                        <tr key={player}>
                          <td style={{ fontWeight: '700' }}>{player}</td>
                          {liveGames.filter(g => g.round === 'wildcard').map(game => {
                            const pick = playerPicks[game.id]
                            const isCorrect = pick === game.winner
                            return (
                              <td key={game.id} className={`pick-cell ${isCorrect ? 'correct' : 'incorrect'}`}>
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

            {/* Divisional Picks */}
            <div className="card">
              <div className="card-header">
                <h3>🔥 Divisional Round</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      {liveGames.filter(g => g.round === 'divisional').map(game => (
                        <th key={game.id}>{game.awayTeam} @ {game.homeTeam}</th>
                      ))}
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => {
                      const playerPicks = picks[player] || {}
                      const { breakdown } = calculatePoints(player)
                      const canEdit = (loggedInPlayer === player || isAdminAuth)
                      
                      return (
                        <tr key={player}>
                          <td style={{ fontWeight: '700' }}>{player}</td>
                          {liveGames.filter(g => g.round === 'divisional').map(game => {
                            const pick = playerPicks[game.id]
                            const isLocked = arePicksLocked(game.id)
                            const isCorrect = game.winner && pick === game.winner
                            const isIncorrect = game.winner && pick && pick !== game.winner
                            
                            if (canEdit && !isLocked) {
                              return (
                                <td key={game.id} className={`pick-cell ${isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                  <select
                                    value={pick || ''}
                                    onChange={async (e) => {
                                      const newPick = e.target.value
                                      setPicks(prev => ({
                                        ...prev,
                                        [player]: { ...prev[player], [game.id]: newPick }
                                      }))
                                      await savePickToSupabase(player, game.id, newPick)
                                    }}
                                    style={{
                                      background: 'var(--bg-dark)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '0.25rem',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    <option value="">-</option>
                                    <option value={game.awayTeam}>{game.awayTeam}</option>
                                    <option value={game.homeTeam}>{game.homeTeam}</option>
                                  </select>
                                </td>
                              )
                            }
                            
                            return (
                              <td key={game.id} className={`pick-cell ${isLocked && !pick ? 'hidden' : isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                {isLocked && !pick ? '🔒' : pick || '-'}
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

        {/* Conference Championship Tab */}
        {activeTab === 'conference' && (
          <div className="card">
            <div className="card-header">
              <h3>🏆 Conference Championships</h3>
            </div>
            {liveGames.filter(g => g.round === 'conference').length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Conference championship games will appear here when matchups are set
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      {liveGames.filter(g => g.round === 'conference').map(game => (
                        <th key={game.id}>{game.awayTeam} @ {game.homeTeam}</th>
                      ))}
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => {
                      const playerPicks = picks[player] || {}
                      const { breakdown } = calculatePoints(player)
                      const canEdit = (loggedInPlayer === player || isAdminAuth)
                      
                      return (
                        <tr key={player}>
                          <td style={{ fontWeight: '700' }}>{player}</td>
                          {liveGames.filter(g => g.round === 'conference').map(game => {
                            const pick = playerPicks[game.id]
                            const isLocked = arePicksLocked(game.id)
                            const isCorrect = game.winner && pick === game.winner
                            const isIncorrect = game.winner && pick && pick !== game.winner
                            
                            if (canEdit && !isLocked) {
                              return (
                                <td key={game.id} className={`pick-cell ${isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                  <select
                                    value={pick || ''}
                                    onChange={async (e) => {
                                      const newPick = e.target.value
                                      setPicks(prev => ({
                                        ...prev,
                                        [player]: { ...prev[player], [game.id]: newPick }
                                      }))
                                      await savePickToSupabase(player, game.id, newPick)
                                    }}
                                    style={{
                                      background: 'var(--bg-dark)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '0.25rem',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    <option value="">-</option>
                                    <option value={game.awayTeam}>{game.awayTeam}</option>
                                    <option value={game.homeTeam}>{game.homeTeam}</option>
                                  </select>
                                </td>
                              )
                            }
                            
                            return (
                              <td key={game.id} className={`pick-cell ${isLocked && !pick ? 'hidden' : isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                {isLocked && !pick ? '🔒' : pick || '-'}
                              </td>
                            )
                          })}
                          <td className="points">{breakdown.conference}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Super Bowl Tab */}
        {activeTab === 'superbowl' && (
          <div className="card">
            <div className="card-header">
              <h3>🏆 Super Bowl</h3>
            </div>
            {liveGames.filter(g => g.round === 'superbowl').length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Super Bowl matchup will appear here when set
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      {liveGames.filter(g => g.round === 'superbowl').map(game => (
                        <th key={game.id}>{game.awayTeam} vs {game.homeTeam}</th>
                      ))}
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => {
                      const playerPicks = picks[player] || {}
                      const { breakdown } = calculatePoints(player)
                      const canEdit = (loggedInPlayer === player || isAdminAuth)
                      
                      return (
                        <tr key={player}>
                          <td style={{ fontWeight: '700' }}>{player}</td>
                          {liveGames.filter(g => g.round === 'superbowl').map(game => {
                            const pick = playerPicks[game.id]
                            const isLocked = arePicksLocked(game.id)
                            const isCorrect = game.winner && pick === game.winner
                            const isIncorrect = game.winner && pick && pick !== game.winner
                            
                            if (canEdit && !isLocked) {
                              return (
                                <td key={game.id} className={`pick-cell ${isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                  <select
                                    value={pick || ''}
                                    onChange={async (e) => {
                                      const newPick = e.target.value
                                      setPicks(prev => ({
                                        ...prev,
                                        [player]: { ...prev[player], [game.id]: newPick }
                                      }))
                                      await savePickToSupabase(player, game.id, newPick)
                                    }}
                                    style={{
                                      background: 'var(--bg-dark)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '0.25rem',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    <option value="">-</option>
                                    <option value={game.awayTeam}>{game.awayTeam}</option>
                                    <option value={game.homeTeam}>{game.homeTeam}</option>
                                  </select>
                                </td>
                              )
                            }
                            
                            return (
                              <td key={game.id} className={`pick-cell ${isLocked && !pick ? 'hidden' : isCorrect ? 'correct' : isIncorrect ? 'incorrect' : 'pending'}`}>
                                {isLocked && !pick ? '🔒' : pick || '-'}
                              </td>
                            )
                          })}
                          <td className="points">{breakdown.superbowl}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Login Modal */}
        {showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal fade-in" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Player Login</h3>
                <button className="modal-close" onClick={() => setShowLoginModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={loginName}
                    onChange={e => setLoginName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                {loginError && <div className="error">{loginError}</div>}
                <button className="btn" onClick={handleLogin} style={{ width: '100%', marginTop: '1rem' }}>
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Login Modal */}
        {showAdmin && !isAdminAuth && (
          <div className="modal-overlay" onClick={() => setShowAdmin(false)}>
            <div className="modal fade-in" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Admin Login</h3>
                <button className="modal-close" onClick={() => setShowAdmin(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Admin Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAdminLogin()}
                  />
                </div>
                <button className="btn" onClick={handleAdminLogin} style={{ width: '100%', marginTop: '1rem' }}>
                  Login as Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Last Update */}
        {lastUpdate && (
          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
