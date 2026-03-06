import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PixelKnight from '../components/PixelKnight'
import './MainScreen.css'

export default function MainScreen() {
  const navigate = useNavigate()
  const [hasActiveGame, setHasActiveGame] = useState(false)
  const [loadCode, setLoadCode] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [loadingCode, setLoadingCode] = useState(false)
  const crowdColors = ['#c41e3a', '#1e3a8a', '#2d6a4f', '#e6b800']

  async function handleLoadByCode(e) {
    e?.preventDefault()
    const code = loadCode.trim().toUpperCase()
    if (!code || code.length !== 5) {
      setLoadError('Enter a 5-character code')
      return
    }
    setLoadingCode(true)
    setLoadError(null)
    const { data, error } = await supabase
      .from('players')
      .select('room_id, session_id, is_eliminated')
      .eq('recovery_code', code)
      .maybeSingle()
    setLoadingCode(false)
    if (error) {
      setLoadError('Could not look up code. Try again.')
      return
    }
    if (!data) {
      setLoadError('Invalid or expired code. The code may be wrong, or the game may have reset.')
      return
    }
    if (data.is_eliminated) {
      setLoadError('This character was eliminated. The code is no longer valid.')
      return
    }
    localStorage.setItem('koth_room_id', data.room_id)
    localStorage.setItem('koth_session_id', data.session_id)
    window.location.href = '/game'
  }

  useEffect(() => {
    const sessionId = localStorage.getItem('koth_session_id')
    const roomId = localStorage.getItem('koth_room_id')
    if (!sessionId || !roomId) {
      setHasActiveGame(false)
      return
    }
    // Verify character still exists (game may have reset)
    supabase
      .from('players')
      .select('id')
      .eq('room_id', roomId)
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          localStorage.removeItem('koth_room_id')
          localStorage.removeItem('koth_session_id')
          setHasActiveGame(false)
        } else {
          setHasActiveGame(true)
        }
      })
  }, [])

  return (
    <div className="main-screen">
      <div className="castle-bg">
        <div className="hill"></div>
        <div className="castle"></div>
      </div>
      
      <div className="crowd">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="crowd-character" style={{ left: `${10 + i * 12}%`, animationDelay: `${i * 0.2}s` }}>
            <PixelKnight color={crowdColors[i % 4]} size="small" />
          </div>
        ))}
      </div>

      <p className="footer-credit footer-credit-desktop">A game created by Todd G</p>

      <div className="main-content">
        <h1 className="title">WOLFPACK WARRIORS</h1>
        <p className="footer-credit footer-credit-mobile">A game created by Todd G</p>
        <p className="subtitle">Battle Arena</p>

        <div className="menu-buttons">
          {hasActiveGame && (
            <button className="menu-btn back-to-game" onClick={() => navigate('/game')}>
              BACK TO MY CHARACTER
            </button>
          )}
          <button className="menu-btn primary" onClick={() => navigate('/create')}>
            START GAME
          </button>
          <button className="menu-btn" onClick={() => navigate('/rules')}>
            RULES
          </button>
          <button className="menu-btn" onClick={() => navigate('/hall-of-fame')}>
            HALL OF FAME
          </button>
        </div>

        <div className="load-code-section">
          <p className="load-code-label">Load character on this device</p>
          <form onSubmit={handleLoadByCode} className="load-code-form">
            <input
              type="text"
              value={loadCode}
              onChange={(e) => setLoadCode(e.target.value.slice(0, 5).toUpperCase())}
              placeholder="Enter 5-char code"
              maxLength={5}
              className="load-code-input"
              disabled={loadingCode}
              autoComplete="off"
            />
            <button type="submit" className="menu-btn load-code-btn" disabled={loadingCode}>
              {loadingCode ? '...' : 'LOAD'}
            </button>
          </form>
          {loadError && (
            <div className="load-code-error" role="alert">
              {loadError}
              <button type="button" className="load-code-dismiss" onClick={() => setLoadError(null)} aria-label="Dismiss">×</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
