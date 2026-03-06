import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PixelKnight from '../components/PixelKnight'
import './MainScreen.css'

export default function MainScreen() {
  const navigate = useNavigate()
  const [hasActiveGame, setHasActiveGame] = useState(false)
  const crowdColors = ['#c41e3a', '#1e3a8a', '#2d6a4f', '#e6b800']

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

      <div className="main-content">
        <h1 className="title">WOLFPACK WARRIORS</h1>
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
        <p className="footer-credit">A game created by Todd G</p>
      </div>
    </div>
  )
}
