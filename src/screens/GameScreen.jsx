import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { evaluateRound } from '../lib/evaluateRound'
import { checkAndEndGame } from '../lib/endGame'
import { getCurrentHourIndex, getTimeUntilNextHour, isGameActive, MAX_HEALTH } from '../lib/gameLogic'
import { generateRoundRecap, generateGameRecap } from '../lib/roundSummary'
import PixelKnight from '../components/PixelKnight'
import HealthBar from '../components/HealthBar'
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
  const [attacksAgainstMe, setAttacksAgainstMe] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerRoundHistory, setPlayerRoundHistory] = useState(null)
  const [recapModal, setRecapModal] = useState(null)
  const [recapText, setRecapText] = useState('')
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState('')
  const hasUnsavedAttackChanges = useRef(false)

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
    if (!hasUnsavedAttackChanges.current) {
      setAttackAllocations(alloc)
    }

    const mePlayer = (playersData || []).find((p) => p.session_id === sessionId)
    if (mePlayer?.is_eliminated) {
      const { data: attacksOnMe } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('target_session_id', sessionId)
        .order('hour_index', { ascending: false })
        .limit(20)
      const attacks = attacksOnMe || []
      const lastHour = attacks[0]?.hour_index
      const lastRoundAttacks = lastHour != null ? attacks.filter((a) => a.hour_index === lastHour) : attacks
      setAttacksAgainstMe(lastRoundAttacks)
    } else {
      setAttacksAgainstMe([])
    }

    setLoading(false)
  }, [roomId, sessionId, navigate])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    hasUnsavedAttackChanges.current = false
  }, [hourIndex])

  useEffect(() => {
    if (!me || !roundResults.length || me.is_eliminated) return
    const lastRound = roundResults[0]
    const lastSeen = parseInt(localStorage.getItem('koth_last_recap_round') || '0', 10)
    if (lastRound.hour_index > lastSeen) {
      localStorage.setItem('koth_last_recap_round', String(lastRound.hour_index))
      setRecapModal('last_round')
      setRecapLoading(true)
      setRecapError('')
      ;(async () => {
        try {
          const { data: myAttacks } = await supabase
            .from('attack_allocations')
            .select('*')
            .eq('room_id', roomId)
            .eq('attacker_session_id', sessionId)
            .eq('hour_index', lastRound.hour_index)
          const { data: attacksOnMe } = await supabase
            .from('attack_allocations')
            .select('*')
            .eq('room_id', roomId)
            .eq('target_session_id', sessionId)
            .eq('hour_index', lastRound.hour_index)
          const getName = (sid) => players.find((p) => p.session_id === sid)?.name || '?'
          const roundData = {
            round: lastRound.hour_index,
            roundLog: lastRound.result_text,
            attacksMade: (myAttacks || []).map((a) => ({ target: getName(a.target_session_id), pts: a.attack_points_used })),
            attacksReceived: (attacksOnMe || []).map((a) => ({ attacker: getName(a.attacker_session_id), pts: a.attack_points_used })),
          }
          const recap = await generateRoundRecap(me.name, roundData)
          setRecapText(recap)
        } catch (err) {
          setRecapError(err.message || 'Failed to generate recap')
        } finally {
          setRecapLoading(false)
        }
      })()
    }
  }, [me?.id, roundResults, players, roomId, sessionId])

  async function showLastRoundRecap() {
    if (!me || !roundResults.length) return
    setRecapModal('last_round')
    setRecapLoading(true)
    setRecapError('')
    try {
      const lastRound = roundResults[0]
      const { data: myAttacks } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('attacker_session_id', sessionId)
        .eq('hour_index', lastRound.hour_index)
      const { data: attacksOnMe } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('target_session_id', sessionId)
        .eq('hour_index', lastRound.hour_index)
      const getName = (sid) => players.find((p) => p.session_id === sid)?.name || '?'
      const roundData = {
        round: lastRound.hour_index,
        roundLog: lastRound.result_text,
        attacksMade: (myAttacks || []).map((a) => ({ target: getName(a.target_session_id), pts: a.attack_points_used })),
        attacksReceived: (attacksOnMe || []).map((a) => ({ attacker: getName(a.attacker_session_id), pts: a.attack_points_used })),
      }
      const recap = await generateRoundRecap(me.name, roundData)
      setRecapText(recap)
    } catch (err) {
      setRecapError(err.message || 'Failed to generate recap')
    } finally {
      setRecapLoading(false)
    }
  }

  async function showFullGameRecap() {
    if (!me || !players.length) return
    setRecapModal('full_game')
    setRecapLoading(true)
    setRecapError('')
    try {
      const { data: allResults } = await supabase
        .from('round_results')
        .select('*')
        .eq('room_id', roomId)
        .order('hour_index', { ascending: true })
      const { data: myAttacks } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('attacker_session_id', sessionId)
        .order('hour_index', { ascending: true })
      const { data: attacksOnMe } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('target_session_id', sessionId)
        .order('hour_index', { ascending: true })
      const getName = (sid) => players.find((p) => p.session_id === sid)?.name || '?'
      const gameData = {
        rounds: (allResults || []).map((r) => ({ round: r.hour_index, log: r.result_text })),
        myAttacks: (myAttacks || []).map((a) => ({ round: a.hour_index, target: getName(a.target_session_id), pts: a.attack_points_used })),
        attacksReceived: (attacksOnMe || []).map((a) => ({ round: a.hour_index, attacker: getName(a.attacker_session_id), pts: a.attack_points_used })),
        currentScore: me.total_points,
        currentHP: me.health_points,
      }
      const recap = await generateGameRecap(me.name, gameData)
      setRecapText(recap)
    } catch (err) {
      setRecapError(err.message || 'Failed to generate recap')
    } finally {
      setRecapLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPlayer || !roomId) {
      setPlayerRoundHistory(null)
      return
    }
    setPlayerRoundHistory(null)
    async function loadPlayerHistory() {
      const { data: attacksMade } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('attacker_session_id', selectedPlayer.session_id)
        .order('hour_index', { ascending: true })
      const { data: attacksReceived } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', roomId)
        .eq('target_session_id', selectedPlayer.session_id)
        .order('hour_index', { ascending: true })
      setPlayerRoundHistory({ attacksMade: attacksMade || [], attacksReceived: attacksReceived || [] })
    }
    loadPlayerHistory()
  }, [selectedPlayer, roomId])

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
    hasUnsavedAttackChanges.current = false
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

    const isPotion = item.hp_on_purchase > 0
    const updates = {
      total_points: me.total_points - item.cost,
      ...(isPotion
        ? { health_points: Math.min(MAX_HEALTH, me.health_points + (item.hp_on_purchase || 0)) }
        : { current_item_id: item.id }),
    }

    const { error } = await supabase.from('players').update(updates).eq('id', me.id)

    if (error) {
      setPurchaseError(error.message)
      return
    }
    loadData()
  }

  async function handleRemoveItem() {
    if (!me || me.is_eliminated || !me.current_item_id) return
    setPurchaseError('')
    const { error } = await supabase
      .from('players')
      .update({ current_item_id: null })
      .eq('id', me.id)
    if (error) setPurchaseError(error.message)
    else loadData()
  }

  function addAttackPoint(targetSessionId) {
    hasUnsavedAttackChanges.current = true
    const currentTotal = Object.values(attackAllocations).reduce((a, b) => a + b, 0)
    if (currentTotal < effectiveAttack) {
      setAttackAllocations((prev) => ({
        ...prev,
        [targetSessionId]: (prev[targetSessionId] || 0) + 1,
      }))
    }
  }

  function removeAttackPoint(targetSessionId) {
    hasUnsavedAttackChanges.current = true
    const current = attackAllocations[targetSessionId] || 0
    if (current > 0) {
      setAttackAllocations((prev) => ({
        ...prev,
        [targetSessionId]: current - 1,
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

  if (me.is_eliminated) {
    const attackerNames = (sid) => players.find((p) => p.session_id === sid)?.name || '?'
    const lastRoundResult = roundResults[0]
    return (
      <div className="elimination-screen">
        <h1>💀 ELIMINATED 💀</h1>
        <p className="elim-msg">You have been defeated!</p>
        <section className="elim-attackers">
          <h3>WHO ATTACKED YOU (last round)</h3>
          {attacksAgainstMe.length === 0 ? (
            <p>No recorded attacks</p>
          ) : (
            <ul>
              {attacksAgainstMe.map((a) => (
                <li key={a.id}>
                  <strong>{attackerNames(a.attacker_session_id)}</strong> hit you for <strong>{a.attack_points_used}</strong> attack points
                </li>
              ))}
            </ul>
          )}
        </section>
        {lastRoundResult && (
          <section className="elim-recap">
            <h3>ROUND RECAP</h3>
            <pre>{lastRoundResult.result_text}</pre>
          </section>
        )}
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
          Next eval: {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <button
          className="recap-btn"
          onClick={showFullGameRecap}
          disabled={recapLoading || me.is_eliminated}
          title="Generate whimsical recap of entire game"
        >
          📜 ROUND RECAP
        </button>
        <div className="my-stats">
          <PixelKnight color={me.color} size="small" />
          <span>{me.name}</span>
          <span>{me.total_points} pts</span>
          <HealthBar current={Math.min(me.health_points, MAX_HEALTH)} max={MAX_HEALTH} showLabel={true} compact />
          <span>{effectiveAttack}A/{effectiveDefense}D</span>
        </div>
      </div>

      <div className="game-layout">
        <aside className="player-list">
          <h3>RANKINGS</h3>
          {players.map((p, i) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`player-row ${p.is_eliminated ? 'eliminated' : ''} ${p.session_id === sessionId ? 'me' : ''} ${selectedPlayer?.id === p.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
            >
              <span className="rank">#{i + 1}</span>
              <PixelKnight color={p.color} size="small" />
              <div className="player-info">
                <span className="name">{p.name}</span>
                <span className="stats">
                  {p.attack_points + (items.find((i) => i.id === p.current_item_id)?.attack_bonus || 0)}A / 
                  {p.defense_points + (items.find((i) => i.id === p.current_item_id)?.defense_bonus || 0)}D
                </span>
                <span className="points">{p.total_points} pts</span>
                <HealthBar current={Math.min(p.health_points, MAX_HEALTH)} max={MAX_HEALTH} showLabel={true} />
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
          <section className="my-items-section">
            <h3>MY ITEMS</h3>
            {myItem ? (
              <div className="equipped-item">
                <span className="item-name">{myItem.name}</span>
                <span className="item-bonus">
                  {myItem.hp_on_purchase
                    ? `+${myItem.hp_on_purchase} HP`
                    : myItem.damage_reduction
                      ? `-${myItem.damage_reduction} dmg`
                      : `+${myItem.attack_bonus || 0} atk, +${myItem.defense_bonus || 0} def`}
                </span>
                <button
                  type="button"
                  className="remove-item-btn"
                  onClick={handleRemoveItem}
                  disabled={me.is_eliminated}
                  title="Remove item (no refund)"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <p className="no-item">No item equipped</p>
            )}
          </section>

          <section className="pending-attacks-section">
            <h3>PENDING ATTACKS (this round)</h3>
            {totalAllocated === 0 ? (
              <p className="no-pending">No attacks selected. You'll attack randomly if you don't choose.</p>
            ) : (
              <ul className="pending-list">
                {Object.entries(attackAllocations)
                  .filter(([, pts]) => pts > 0)
                  .map(([targetSid, pts]) => {
                    const target = players.find((p) => p.session_id === targetSid)
                    return target ? (
                      <li key={targetSid}>
                        <PixelKnight color={target.color} size="small" />
                        <strong>{target.name}</strong>: {pts} attack pts
                      </li>
                    ) : null
                  })}
              </ul>
            )}
          </section>

          <section className="attack-section">
            <h3>ATTACK ({totalAllocated}/{effectiveAttack})</h3>
            <p className="attack-hint">Tap +/− to allocate. Change anytime before confirming.</p>
            {otherPlayers.length === 0 ? (
              <p>No other players</p>
            ) : (
              <div className="attack-targets">
                {otherPlayers.map((p) => {
                  const pts = attackAllocations[p.session_id] || 0
                  return (
                    <div key={p.id} className="attack-target">
                      <button
                        type="button"
                        className="attack-btn minus"
                        onClick={() => removeAttackPoint(p.session_id)}
                        disabled={pts === 0 || me.is_eliminated}
                        aria-label={`Remove from ${p.name}`}
                      >
                        −
                      </button>
                      <PixelKnight color={p.color} size="small" />
                      <span className="target-name">{p.name}</span>
                      <span className="target-pts">{pts}</span>
                      <button
                        type="button"
                        className="attack-btn plus"
                        onClick={() => addAttackPoint(p.session_id)}
                        disabled={totalAllocated >= effectiveAttack || me.is_eliminated}
                        aria-label={`Add to ${p.name}`}
                      >
                        +
                      </button>
                    </div>
                  )
                })}
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
                  <p className="item-desc">
                    {item.hp_on_purchase
                      ? `+${item.hp_on_purchase} HP (consumable)`
                      : item.damage_reduction
                        ? `-${item.damage_reduction} dmg taken`
                        : `+${item.attack_bonus || 0} atk, +${item.defense_bonus || 0} def`}
                  </p>
                  <p className="item-cost">{item.cost} pts</p>
                  <button
                    onClick={() => handlePurchase(item)}
                    disabled={item.cost > me.total_points || me.is_eliminated}
                    title={myItem ? 'Swap item (no refund for current item)' : undefined}
                  >
                    {myItem ? 'SWAP' : 'BUY'}
                  </button>
                </div>
              ))}
            </div>
            {purchaseError && <p className="error">{purchaseError}</p>}
          </section>
        </main>
      </div>

      <div className="round-log">
        <h3>HOURLY RECAP — Who attacked who</h3>
        <div className="log-content">
          {roundResults.length === 0 ? (
            <p>No rounds yet. Results appear here every hour.</p>
          ) : (
            roundResults.map((r) => (
              <div key={r.id} className="round-block">
                <div className="round-header">Round {r.hour_index}</div>
                <pre className="round-detail">{r.result_text}</pre>
              </div>
            ))
          )}
        </div>
      </div>

      {recapModal && (
        <div className="recap-modal" onClick={() => setRecapModal(null)}>
          <div className="recap-panel" onClick={(e) => e.stopPropagation()}>
            <div className="recap-header">
              <h3>📜 {recapModal === 'last_round' ? 'Last Round' : 'Full Game'} Recap</h3>
              <button className="close-btn" onClick={() => setRecapModal(null)} aria-label="Close">×</button>
            </div>
            <div className="recap-body">
              {recapLoading ? (
                <p>Summoning the bard...</p>
              ) : recapError ? (
                <p className="recap-error">{recapError}</p>
              ) : (
                <p className="recap-text">{recapText}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPlayer && (
        <div className="player-history-modal" onClick={() => setSelectedPlayer(null)}>
          <div className="player-history-panel" onClick={(e) => e.stopPropagation()}>
            <div className="player-history-header">
              <PixelKnight color={selectedPlayer.color} size="medium" />
              <h3>{selectedPlayer.name} — Round History</h3>
              <button className="close-btn" onClick={() => setSelectedPlayer(null)} aria-label="Close">×</button>
            </div>
            <div className="player-history-content">
              {!playerRoundHistory ? (
                <p>Loading...</p>
              ) : (
                (() => {
                  const rounds = new Set([
                    ...playerRoundHistory.attacksMade.map((a) => a.hour_index),
                    ...playerRoundHistory.attacksReceived.map((a) => a.hour_index),
                  ])
                  const sortedRounds = [...rounds].sort((a, b) => a - b)
                  const getName = (sid) => players.find((x) => x.session_id === sid)?.name || '?'
                  return sortedRounds.length === 0 ? (
                    <p>No round activity yet.</p>
                  ) : (
                    sortedRounds.map((round) => {
                      const made = playerRoundHistory.attacksMade.filter((a) => a.hour_index === round)
                      const received = playerRoundHistory.attacksReceived.filter((a) => a.hour_index === round)
                      return (
                        <div key={round} className="history-round">
                          <div className="history-round-header">Round {round}</div>
                          {made.length > 0 && (
                            <div className="history-detail">
                              Attacked: {made.map((a) => `${getName(a.target_session_id)} (${a.attack_points_used})`).join(', ')}
                            </div>
                          )}
                          {received.length > 0 && (
                            <div className="history-detail received">
                              Received: {received.map((a) => `${getName(a.attacker_session_id)} (${a.attack_points_used})`).join(', ')} = {received.reduce((s, a) => s + a.attack_points_used, 0)} total
                            </div>
                          )}
                          {made.length === 0 && received.length === 0 && (
                            <div className="history-detail">No activity</div>
                          )}
                        </div>
                      )
                    })
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
