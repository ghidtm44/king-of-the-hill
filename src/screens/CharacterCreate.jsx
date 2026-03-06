import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CLASSES, COLORS, generateSessionId, MAX_NAME_LENGTH, ICON_ATK, ICON_DEF } from '../lib/gameLogic'
import PixelKnight from '../components/PixelKnight'
import './CharacterCreate.css'

export default function CharacterCreate() {
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [name, setName] = useState('')
  const [selectedClass, setSelectedClass] = useState('balanced')
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRulesPopup, setShowRulesPopup] = useState(false)

  useEffect(() => {
    loadRoom()
  }, [])

  useEffect(() => {
    if (!loading) {
      setShowRulesPopup(true)
    }
  }, [loading])

  function dismissRulesPopup() {
    localStorage.setItem('koth_rules_seen', 'true')
    setShowRulesPopup(false)
  }

  async function loadRoom() {
    let { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('name', 'Main Arena')
      .limit(1)
      .maybeSingle()
    
    if (error) {
      setError(`Could not load room: ${error.message}`)
      setLoading(false)
      return
    }
    if (!data) {
      const { data: newRoom, error: insertErr } = await supabase
        .from('rooms')
        .insert({ name: 'Main Arena', max_players: 25 })
        .select()
        .single()
      if (insertErr) {
        setError(`Could not create room: ${insertErr.message}`)
        setLoading(false)
        return
      }
      data = newRoom
    }
    setRoom(data)

    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', data.id)
      .eq('is_eliminated', false)
    
    setPlayerCount(count || 0)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter a name')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Name max ${MAX_NAME_LENGTH} chars`)
      return
    }
    if (playerCount >= 25) {
      setError('Room is full')
      return
    }

    let sessionId = localStorage.getItem('koth_session_id')
    if (!sessionId) {
      sessionId = generateSessionId()
      localStorage.setItem('koth_session_id', sessionId)
    }

    const classStats = CLASSES[selectedClass]
    const { error: insertError } = await supabase.from('players').insert({
      room_id: room.id,
      session_id: sessionId,
      name: trimmedName,
      color: selectedColor.value,
      class_type: selectedClass,
      attack_points: classStats.attack,
      defense_points: classStats.defense,
      total_points: 5,
      health_points: 15,
      is_eliminated: false,
    })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You already joined! Go to game.')
        setTimeout(() => navigate('/game'), 1500)
      } else {
        setError(insertError.message)
      }
      return
    }

    localStorage.setItem('koth_room_id', room.id)
    navigate('/game')
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="character-create">
      {showRulesPopup && (
        <div className="rules-popup-overlay" onClick={dismissRulesPopup}>
          <div className="rules-popup" onClick={(e) => e.stopPropagation()}>
            <h3>How to Play</h3>
            <div className="rules-popup-content">
              <p><strong>Goal:</strong> Most points wins. Stay alive (HP &gt; 0).</p>
              <p><strong>Each round:</strong> Tap a player to attack them—saves instantly. Tap another to switch, or tap same to clear. No target = random.</p>
              <p><strong>Combat:</strong> Total attack vs defense. Damage capped at 5/round.</p>
              <p><strong>Bounty</strong> (🎯): Most points. Hit them = +2 pts if damage dealt. Block = you lose 1 HP.</p>
              <p><strong>Points:</strong> +1 survive, +1 damage (+2 if Bounty).</p>
              <p><strong>Items:</strong> Sword ({ICON_ATK}), Shield ({ICON_DEF}), Armor, Potion. Last 3 rounds.</p>
              <p><strong>Scavenge:</strong> Once/round. Chance: +1 pt, +3 pts, nothing, or -1 HP.</p>
              <p><strong>Stance:</strong> Aggressive +1 {ICON_ATK} · Defensive +1 {ICON_DEF} · Greedy +1 pt if survive.</p>
            </div>
            <button className="rules-popup-btn" onClick={dismissRulesPopup}>Got it</button>
          </div>
        </div>
      )}
      <button className="back-btn" onClick={() => navigate('/')}>← BACK</button>
      
      <h1>CREATE WARRIOR</h1>
      <p className="room-info">Main Arena ({playerCount}/25)</p>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label>NAME (max {MAX_NAME_LENGTH})</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Your name"
          />
        </div>

        <div className="form-group">
          <label>CLASS</label>
          <div className="class-options">
            {Object.entries(CLASSES).map(([key, stats]) => (
              <button
                key={key}
                type="button"
                className={`class-btn ${selectedClass === key ? 'selected' : ''}`}
                onClick={() => setSelectedClass(key)}
              >
                <span>{stats.label}</span>
                <span className="stats" title="Attack / Defense">{stats.attack}{ICON_ATK}/{stats.defense}{ICON_DEF}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>COLOR</label>
          <div className="color-options">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`color-btn ${selectedColor.value === c.value ? 'selected' : ''}`}
                style={{ background: c.value }}
                onClick={() => setSelectedColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="preview">
          <PixelKnight color={selectedColor.value} size="large" />
          <p>{name || 'Warrior'}</p>
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" className="submit-btn" disabled={playerCount >= 25}>
          ENTER ARENA
        </button>
      </form>
    </div>
  )
}
