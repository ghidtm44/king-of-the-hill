import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { evaluateRound } from '../lib/evaluateRound'
import { checkAndEndGame } from '../lib/endGame'
import { getCurrentHourIndex, getTimeUntilNextHour, isGameActive } from '../lib/gameLogic'
import PixelKnight from '../components/PixelKnight'
import './GameScreen.css'

export default function GameScreen() {
  const navigate = useNavigate()
  const sessionId = localStorage.getItem('koth_session_id')
  const roomId = localStorage.getItem('koth_room_id')

  const [me, setMe] = useState(null)
  const [players, setPlayers] = useState([])
  const [items, setItems] = useState([])
  const [roundResults, setRoundResults] = useState([])
  const [attackAllocations, setAttackAllocations] = useState({})
  const [timeLeft, setTimeLeft] = useState({ minutes: 59, seconds: 59 })
  const [hourIndex, setHourIndex] = useState(0)
  const [purchaseError, setPurchaseError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!roomId || !sessionId) {
      navigate('/')
      return
    }

    const { hourIndex: hi } = getCurrentHourIndex()
    setHourIndex(hi)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('total_points', { ascending: false })

    setPlayers(playersData || [])
    setMe((playersData || []).find((p) => p.session_id === sessionId))

    const { data: itemsData } = await supabase.from('items').select('*').order('cost')
    setItems(itemsData || [])

    const { data: resultsData } = await supabase
      .from('round_results')
      .select('*')
      .eq('room_id', roomId)
      .order('hour_index', { ascending: false })
      .limit(5)

    setRoundResults(resultsData || [])

    const { data: myAttacks } = await supabase
      .from('attack_allocations')
      .select('*')
      .eq('room_id', roomId)
      .eq('attacker_session_id', sessionId)
      .eq('hour_index', hi)

    const alloc = {}
    ;(myAttacks || []).forEach((a) => {
      alloc[a.target_session_id] = (alloc[a.target_session_id] || 0) + a.attack_points_used
    })
    setAttackAllocations(alloc)

    setLoading(false)
  }, [roomId, sessionId, navigate])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    const tick = () => {
      const { minutes, seconds } = getTimeUntilNextHour()
      setTimeLeft({ minutes, seconds })
      const { hourIndex: hi, isEvaluationSecond } = getCurrentHourIndex()
      setHourIndex(hi)
      if (isEvaluationSecond) {
        evaluateRound(roomId, hi).then(() => loadData())
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [roomId, loadData])

  const [gameEnded, setGameEnded] = useState(null)

  useEffect(() => {
    if (!isGameActive() && roomId) {
      checkAndEndGame(roomId).then((r) => {
        if (r.winner) {
          setGameEnded(r.winner)
          localStorage.removeItem('koth_room_id')
        }
      })
    }
  }, [roomId])

  async function submitAttacks() {
    if (!me || me.is_eliminated) return

    const myItem = items.find((i) => i.id === me.current_item_id)
    const effAttack = me.attack_points + (myItem?.attack_bonus || 0)
    let alloc = { ...attackAllocations }
    const totalUsed = Object.values(alloc).reduce((a, b) => a + b, 0)

    const others = players.filter((p) => !p.is_eliminated && p.session_id !== sessionId)
    if (totalUsed === 0 && others.length > 0) {
      const randomTarget = others[Math.floor(Math.random() * others.length)]
      alloc = { [randomTarget.session_id]: effAttack }
    } else if (totalUsed > effAttack) return

    await supabase.from('attack_allocations').delete().eq('room_id', roomId).eq('attacker_session_id', sessionId).eq('hour_index', hourIndex)

    for (const [targetId, points] of Object.entries(alloc)) {
      if (points > 0) {
        await supabase.from('attack_allocations').insert({
          room_id: roomId,
          attacker_session_id: sessionId,
          target_session_id: targetId,
          attack_points_used: points,
          hour_index: hourIndex,
        })
      }
    }
    setAttackAllocations(alloc)
    loadData()
  }

  async function handlePurchase(item) {
    setPurchaseError('')
    if (!me || me.is_eliminated) return
    if (item.cost > me.total_points) {
      setPurchaseError('Not enough points!')
      return
    }

    const { error } = await supabase
      .from('players')
      .update({ current_item_id: item.id, total_points: me.total_points - item.cost })
      .eq('id', me.id)

    if (error) {
      setPurchaseError(error.message)
      return
    }
    loadData()
  }

  function setAttackForTarget(targetSessionId, value) {
    const num = Math.max(0, parseInt(value, 10) || 0)
    const currentTotal = Object.values(attackAllocations).reduce((a, b) => a + b, 0)
    const currentForTarget = attackAllocations[targetSessionId] || 0
    const othersTotal = currentTotal - currentForTarget
    const newTotal = othersTotal + num
    if (newTotal <= effectiveAttack) {
      setAttackAllocations((prev) => ({
        ...prev,
        [targetSessionId]: num,
      }))
    }
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!me) return <div className="loading">Join a game first! <button onClick={() => navigate('/')}>Go Back</button></div>

  if (gameEnded) {
    return (
      <div className="winner-screen">
        <h1>🏆 GAME OVER 🏆</h1>
        <p className="winner-name">{gameEnded.name} WINS!</p>
        <p className="winner-points">{gameEnded.final_points} points</p>
        <PixelKnight color={gameEnded.color} size="large" />
        <button onClick={() => navigate('/')}>BACK TO MENU</button>
      </div>
    )
  }

  const myItem = items.find((i) => i.id === me.current_item_id)
  const effectiveAttack = me.attack_points + (myItem?.attack_bonus || 0)
  const effectiveDefense = me.defense_points + (myItem?.defense_bonus || 0)
  const totalAllocated = Object.values(attackAllocations).reduce((a, b) => a + b, 0)
  const otherPlayers = players.filter((p) => !p.is_eliminated && p.session_id !== sessionId)

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="back-btn" onClick={() => navigate('/')}>← EXIT</button>
        <div className="timer">
          Next round: {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className="my-stats">
          <PixelKnight color={me.color} size="small" />
          <span>{me.name}</span>
          <span>{me.total_points} pts</span>
          <span>{effectiveAttack}A/{effectiveDefense}D</span>
        </div>
      </div>

      <div className="game-layout">
        <aside className="player-list">
          <h3>RANKINGS</h3>
          {players.map((p, i) => (
            <div key={p.id} className={`player-row ${p.is_eliminated ? 'eliminated' : ''} ${p.session_id === sessionId ? 'me' : ''}`}>
              <span className="rank">#{i + 1}</span>
              <PixelKnight color={p.color} size="small" />
              <div className="player-info">
                <span className="name">{p.name}</span>
                <span className="stats">
                  {p.attack_points + (items.find((i) => i.id === p.current_item_id)?.attack_bonus || 0)}A / 
                  {p.defense_points + (items.find((i) => i.id === p.current_item_id)?.defense_bonus || 0)}D
                </span>
                <span className="points">{p.total_points} pts</span>
                {p.last_round_item_id && (
                  <span className="last-item" title={items.find((i) => i.id === p.last_round_item_id)?.name || 'Item'}>
                    ⚔
                  </span>
                )}
              </div>
            </div>
          ))}
        </aside>

        <main className="game-main">
          <section className="attack-section">
            <h3>ATTACK ({totalAllocated}/{effectiveAttack})</h3>
            {otherPlayers.length === 0 ? (
              <p>No other players</p>
            ) : (
              <div className="attack-targets">
                {otherPlayers.map((p) => (
                  <div key={p.id} className="attack-target">
                    <PixelKnight color={p.color} size="small" />
                    <span>{p.name}</span>
                    <input
                      type="number"
                      min={0}
                      max={effectiveAttack}
                      value={attackAllocations[p.session_id] || ''}
                      onChange={(e) => setAttackForTarget(p.session_id, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
            <button className="submit-attacks" onClick={submitAttacks} disabled={me.is_eliminated}>
              CONFIRM ATTACKS
            </button>
          </section>

          <section className="store-section">
            <h3>ITEM STORE</h3>
            <div className="items-grid">
              {items.map((item) => (
                <div key={item.id} className="item-card">
                  <p className="item-name">{item.name}</p>
                  <p className="item-desc">+{item.attack_bonus} atk, +{item.defense_bonus} def</p>
                  <p className="item-cost">{item.cost} pts</p>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={item.cost > me.total_points || me.is_eliminated}
                  >
                    BUY
                  </button>
                </div>
              ))}
            </div>
            {purchaseError && <p className="error">{purchaseError}</p>}
          </section>
        </main>
      </div>

      <div className="round-log">
        <h3>ROUND RESULTS</h3>
        <div className="log-content">
          {roundResults.length === 0 ? (
            <p>No rounds yet</p>
          ) : (
            roundResults.map((r) => (
              <pre key={r.id}>{r.result_text}</pre>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
