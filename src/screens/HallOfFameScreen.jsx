import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './HallOfFameScreen.css'

export default function HallOfFameScreen() {
  const navigate = useNavigate()
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWinners()
  }, [])

  async function loadWinners() {
    const { data, error } = await supabase
      .from('hall_of_fame')
      .select('*')
      .order('game_date', { ascending: false })
      .limit(50)

    if (!error) setWinners(data || [])
    setLoading(false)
  }

  return (
    <div className="hall-of-fame">
      <button className="back-btn" onClick={() => navigate('/')}>← BACK</button>
      
      <h1>HALL OF FAME</h1>
      <p className="subtitle">Champions of Past Battles</p>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : winners.length === 0 ? (
        <p className="empty">No champions yet. Be the first!</p>
      ) : (
        <div className="winners-list">
          {winners.map((w, i) => (
            <div key={w.id} className="winner-card">
              <span className="rank">#{i + 1}</span>
              <div 
                className="winner-color" 
                style={{ background: w.player_color }}
                title={w.player_name}
              />
              <div className="winner-info">
                <span className="winner-name">{w.player_name}</span>
                <span className="winner-points">{w.final_points} pts</span>
                <span className="winner-date">
                  {new Date(w.game_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
