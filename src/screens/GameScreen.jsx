import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { evaluateRound } from '../lib/evaluateRound'
import { checkAndEndGame } from '../lib/endGame'
import { getCurrentHourIndex, getTimeUntilNextHour, shouldEndPreviousGame, MAX_HEALTH, ICON_ATK, ICON_DEF, canNewPlayerAttackInFirstRound } from '../lib/gameLogic'
import PixelKnight from '../components/PixelKnight'
import HealthBar from '../components/HealthBar'
import RecapFlowVisual from '../components/RecapFlowVisual'
import GameTutorial from '../components/GameTutorial'
import './GameScreen.css'

export default function GameScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const sessionId = localStorage.getItem('koth_session_id')
  const roomId = localStorage.getItem('koth_room_id')

  const [me, setMe] = useState(null)
  const [players, setPlayers] = useState([])
  const [items, setItems] = useState([])
  const [roundResults, setRoundResults] = useState([])
  const [roundLogAttacks, setRoundLogAttacks] = useState({})
  const [recapDrawerOpen, setRecapDrawerOpen] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const [timeLeft, setTimeLeft] = useState({ minutes: 59, seconds: 59 })
  const [hourIndex, setHourIndex] = useState(0)
  const [purchaseError, setPurchaseError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attacksAgainstMe, setAttacksAgainstMe] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerRoundHistory, setPlayerRoundHistory] = useState(null)
  const [recapModal, setRecapModal] = useState(null)
  const [recapData, setRecapData] = useState(null)
  const [bountyTooltipOpen, setBountyTooltipOpen] = useState(false)
  const [storeDrawerOpen, setStoreDrawerOpen] = useState(false)
  const [lastRoundAttackersOnMe, setLastRoundAttackersOnMe] = useState(new Set())
  const [lastRoundSameTargetAttackers, setLastRoundSameTargetAttackers] = useState(new Set())
  const [scavengeUsedThisRound, setScavengeUsedThisRound] = useState(false)
  const [currentStance, setCurrentStance] = useState(null)
  const [scavengeResult, setScavengeResult] = useState(null)
  const [lastScavengeResultThisRound, setLastScavengeResultThisRound] = useState(null)
  const [pendingPurchase, setPendingPurchase] = useState(null)
  const [bountyTooltipRect, setBountyTooltipRect] = useState(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const bountyBadgeRef = useRef(null)
  const bountyTooltipRef = useRef(null)
  const gameEndCheckRanThisHourRef = useRef(false)

  const loadData = useCallback(async () => {
    // Read fresh from localStorage - closure values can be stale right after navigation
    const rid = localStorage.getItem('koth_room_id')
    const sid = localStorage.getItem('koth_session_id')
    if (!rid || !sid) {
      navigate('/')
      return
    }

    const { hourIndex: hi } = getCurrentHourIndex()
    setHourIndex(hi)

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', rid)
      .order('total_points', { ascending: false })

    setPlayers(playersData || [])
    setMe((playersData || []).find((p) => p.session_id === sid))

    const { data: itemsData } = await supabase.from('items').select('*').order('cost')
    setItems(itemsData || [])

    const { data: resultsData } = await supabase
      .from('round_results')
      .select('*')
      .eq('room_id', rid)
      .order('hour_index', { ascending: false })
      .limit(5)

    setRoundResults(resultsData || [])

    const { data: allRoomAttacks } = await supabase
      .from('attack_allocations')
      .select('*')
      .eq('room_id', rid)
    const byHour = {}
    ;(allRoomAttacks || []).forEach((a) => {
      if (!byHour[a.hour_index]) byHour[a.hour_index] = []
      byHour[a.hour_index].push(a)
    })
    setRoundLogAttacks(byHour)

    const lastRoundHour = (resultsData || [])[0]?.hour_index
    if (lastRoundHour != null) {
      const { data: attacksOnMeLast } = await supabase
        .from('attack_allocations')
        .select('attacker_session_id')
        .eq('room_id', rid)
        .eq('target_session_id', sid)
        .eq('hour_index', lastRoundHour)
      setLastRoundAttackersOnMe(new Set((attacksOnMeLast || []).map((a) => a.attacker_session_id)))

      const { data: myLastAttack } = await supabase
        .from('attack_allocations')
        .select('target_session_id')
        .eq('room_id', rid)
        .eq('attacker_session_id', sid)
        .eq('hour_index', lastRoundHour)
        .maybeSingle()
      const myLastTarget = myLastAttack?.target_session_id
      if (myLastTarget) {
        const { data: sameTargetAttacks } = await supabase
          .from('attack_allocations')
          .select('attacker_session_id')
          .eq('room_id', rid)
          .eq('target_session_id', myLastTarget)
          .eq('hour_index', lastRoundHour)
        setLastRoundSameTargetAttackers(
          new Set((sameTargetAttacks || []).map((a) => a.attacker_session_id).filter((s) => s !== sid))
        )
      } else {
        setLastRoundSameTargetAttackers(new Set())
      }
    } else {
      setLastRoundAttackersOnMe(new Set())
      setLastRoundSameTargetAttackers(new Set())
    }

    const { data: myAttacks } = await supabase
      .from('attack_allocations')
      .select('*')
      .eq('room_id', rid)
      .eq('attacker_session_id', sid)
      .eq('hour_index', hi)

    const mePlayer = (playersData || []).find((p) => p.session_id === sid)
    const canAttackThisRound = !mePlayer?.joined_at || canNewPlayerAttackInFirstRound(mePlayer.joined_at, hi)

    if (!canAttackThisRound) {
      await supabase.from('attack_allocations').delete().eq('room_id', rid).eq('attacker_session_id', sid).eq('hour_index', hi)
    }

    const myTarget = canAttackThisRound ? ((myAttacks || [])[0]?.target_session_id || null) : null
    setSelectedTargetId(myTarget)

    const { data: scavengeData } = await supabase
      .from('scavenge_uses')
      .select('id, result')
      .eq('room_id', rid)
      .eq('session_id', sid)
      .eq('hour_index', hi)
      .maybeSingle()
    setScavengeUsedThisRound(!!scavengeData)
    if (scavengeData?.result) {
      const r = scavengeData.result
      const msg = r === 'coins' ? '+1 Point!' : r === 'treasure' ? '+3 Points!' : r === 'ambushed' ? '-1 HP' : 'Nothing found'
      const pointsGain = r === 'coins' ? 1 : r === 'treasure' ? 3 : 0
      const hpChange = r === 'ambushed' ? -1 : 0
      setLastScavengeResultThisRound({ result: r, pointsGain, hpChange, msg })
    } else {
      setLastScavengeResultThisRound(null)
    }

    const { data: stanceData } = await supabase
      .from('player_stances')
      .select('stance')
      .eq('room_id', rid)
      .eq('session_id', sid)
      .eq('hour_index', hi)
      .maybeSingle()
    setCurrentStance(stanceData?.stance || null)

    if (mePlayer?.is_eliminated) {
      const { data: attacksOnMe } = await supabase
        .from('attack_allocations')
        .select('*')
        .eq('room_id', rid)
        .eq('target_session_id', sid)
        .order('hour_index', { ascending: false })
        .limit(20)
      const attacks = attacksOnMe || []
      const lastHour = attacks[0]?.hour_index
      const lastRoundAttacks = lastHour != null ? attacks.filter((a) => a.hour_index === lastHour) : attacks
      setAttacksAgainstMe(lastRoundAttacks)
    } else {
      setAttacksAgainstMe([])
    }

    // Game reset / character no longer exists: clear persisted data and redirect to create
    if (!mePlayer && rid && sid) {
      // Retry once after short delay - newly created character may not be visible yet (race condition)
      const retryKey = `koth_retry_${rid}_${sid}`
      const hasRetried = sessionStorage.getItem(retryKey)
      if (!hasRetried) {
        sessionStorage.setItem(retryKey, '1')
        setTimeout(() => loadData(), 800)
        return
      }
      sessionStorage.removeItem(retryKey)
      localStorage.removeItem('koth_room_id')
      localStorage.removeItem('koth_session_id')
      navigate('/create', { replace: true })
      return
    }
    sessionStorage.removeItem(`koth_retry_${rid}_${sid}`)
    setLoading(false)
  }, [roomId, sessionId, navigate])

  function updateBountyTooltipPosition() {
    if (bountyBadgeRef.current) {
      setBountyTooltipRect(bountyBadgeRef.current.getBoundingClientRect())
    }
  }

  function handleBountyBadgeEnter() {
    updateBountyTooltipPosition()
    setBountyTooltipOpen(true)
  }

  function handleBountyBadgeLeave() {
    setBountyTooltipOpen(false)
  }

  function handleBountyBadgeClick(e) {
    e.stopPropagation()
    if (bountyTooltipOpen) {
      setBountyTooltipOpen(false)
    } else {
      updateBountyTooltipPosition()
      setBountyTooltipOpen(true)
    }
  }

  useEffect(() => {
    if (!bountyTooltipOpen) return
    function handleClickOutside(e) {
      if (
        bountyBadgeRef.current && !bountyBadgeRef.current.contains(e.target) &&
        bountyTooltipRef.current && !bountyTooltipRef.current.contains(e.target)
      ) {
        setBountyTooltipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [bountyTooltipOpen])

  useEffect(() => {
    if (location.state?.showTutorial && !localStorage.getItem('koth_tutorial_seen')) {
      setShowTutorial(true)
      navigate('/game', { replace: true, state: {} })
    }
  }, [location.state?.showTutorial, navigate])

  useEffect(() => {
    // Brief delay so localStorage is available after navigation from CharacterCreate
    const t = setTimeout(() => loadData(), 50)
    const interval = setInterval(loadData, 5000)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [loadData])



  useEffect(() => {
    if (!me || !roundResults.length || me.is_eliminated) return
    const lastRound = roundResults[0]
    const lastSeen = parseInt(localStorage.getItem('koth_last_recap_round') || '0', 10)
    if (lastRound.hour_index > lastSeen) {
      localStorage.setItem('koth_last_recap_round', String(lastRound.hour_index))
      setRecapModal('last_round')
      setRecapData(null)
      ;(async () => {
        const { data: allRoundAttacks } = await supabase
          .from('attack_allocations')
          .select('*')
          .eq('room_id', roomId)
          .eq('hour_index', lastRound.hour_index)
        setRecapData({ rounds: [{ hourIndex: lastRound.hour_index, attacks: allRoundAttacks || [] }] })
      })()
    }
  }, [me?.id, roundResults, players, roomId, sessionId])

  async function showLastRoundRecap() {
    if (!me || !roundResults.length) return
    setRecapModal('last_round')
    setRecapData(null)
    const lastRound = roundResults[0]
    const { data: allRoundAttacks } = await supabase
      .from('attack_allocations')
      .select('*')
      .eq('room_id', roomId)
      .eq('hour_index', lastRound.hour_index)
    setRecapData({ rounds: [{ hourIndex: lastRound.hour_index, attacks: allRoundAttacks || [] }] })
  }

  async function showFullGameRecap() {
    if (!me || !roundResults.length) return
    setRecapModal('full_game')
    setRecapData(null)
    const { data: allAttacks } = await supabase
      .from('attack_allocations')
      .select('*')
      .eq('room_id', roomId)
    const byRound = {}
    ;(allAttacks || []).forEach((a) => {
      if (!byRound[a.hour_index]) byRound[a.hour_index] = []
      byRound[a.hour_index].push(a)
    })
    const rounds = Object.entries(byRound)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .slice(0, 10)
      .map(([hi, attacks]) => ({ hourIndex: Number(hi), attacks }))
    setRecapData({ rounds })
  }

  useEffect(() => {
    if (!selectedPlayer || !roomId) {
      setPlayerRoundHistory(null)
      return
    }
    setPlayerRoundHistory(null)
    async function loadPlayerHistory() {
      const { data: resultsData } = await supabase
        .from('round_results')
        .select('hour_index')
        .eq('room_id', roomId)
      const evaluatedRounds = new Set((resultsData || []).map((r) => r.hour_index))

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

      const made = (attacksMade || []).filter((a) => evaluatedRounds.has(a.hour_index))
      const received = (attacksReceived || []).filter((a) => evaluatedRounds.has(a.hour_index))
      setPlayerRoundHistory({ attacksMade: made, attacksReceived: received })
    }
    loadPlayerHistory()
  }, [selectedPlayer, roomId])

  const [gameEnded, setGameEnded] = useState(null)

  useEffect(() => {
    const tick = () => {
      const { minutes, seconds } = getTimeUntilNextHour()
      setTimeLeft({ minutes, seconds })
      const { hourIndex: hi, isEvaluationSecond } = getCurrentHourIndex()
      setHourIndex(hi)
      if (isEvaluationSecond) {
        evaluateRound(roomId, hi).then(() => loadData())
      }
      // Reset ref when not in noon hour so we can run again next day
      if (!shouldEndPreviousGame()) gameEndCheckRanThisHourRef.current = false
      // Game reset at noon EST: check every second so we detect the transition from 11:59 to 12:00
      if (shouldEndPreviousGame() && roomId && !gameEndCheckRanThisHourRef.current) {
        gameEndCheckRanThisHourRef.current = true
        checkAndEndGame(roomId).then((r) => {
          if (r.winner) {
            setGameEnded(r.winner)
            localStorage.removeItem('koth_room_id')
            localStorage.removeItem('koth_session_id')
          } else if (r.alreadyRecorded) {
            // Another client already ended the game; clear and redirect to create
            localStorage.removeItem('koth_room_id')
            localStorage.removeItem('koth_session_id')
            navigate('/create', { replace: true })
          }
        })
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [roomId, loadData])

  async function persistAttackTarget(targetSessionId) {
    if (!me || me.is_eliminated || !roomId || !sessionId) return

    const myItem = items.find((i) => i.id === me.current_item_id)
    const stanceBonus = currentStance === 'aggressive' ? 1 : 0
    const effAttack = me.attack_points + (myItem?.attack_bonus || 0) + stanceBonus
    const others = players.filter((p) => !p.is_eliminated && p.session_id !== sessionId)

    const validTarget = targetSessionId && others.some((p) => p.session_id === targetSessionId)
      ? targetSessionId
      : null

    await supabase.from('attack_allocations').delete().eq('room_id', roomId).eq('attacker_session_id', sessionId).eq('hour_index', hourIndex)

    if (validTarget) {
      await supabase.from('attack_allocations').insert({
        room_id: roomId,
        attacker_session_id: sessionId,
        target_session_id: validTarget,
        attack_points_used: effAttack,
        hour_index: hourIndex,
      })
    }
    setSelectedTargetId(validTarget)
    loadData()
  }

  async function handleScavenge() {
    if (!me || me.is_eliminated || scavengeUsedThisRound || !roomId || !sessionId) return
    setScavengeResult(null)
    const roll = Math.random()
    let result, pointsGain, hpChange
    if (roll < 0.4) {
      result = 'coins'
      pointsGain = 1
      hpChange = 0
    } else if (roll < 0.45) {
      result = 'treasure'
      pointsGain = 3
      hpChange = 0
    } else if (roll < 0.85) {
      result = 'nothing'
      pointsGain = 0
      hpChange = 0
    } else {
      result = 'ambushed'
      pointsGain = 0
      hpChange = -1
    }
    const { error: insertErr } = await supabase.from('scavenge_uses').insert({
      room_id: roomId,
      session_id: sessionId,
      hour_index: hourIndex,
      result,
    })
    if (insertErr?.code === '23505') {
      setScavengeUsedThisRound(true)
      return
    }
    if (insertErr) return
    const newPoints = Math.max(0, me.total_points + pointsGain)
    const newHp = Math.max(0, Math.min(MAX_HEALTH, me.health_points + hpChange))
    await supabase.from('players').update({ total_points: newPoints, health_points: newHp }).eq('id', me.id)
    setScavengeUsedThisRound(true)
    const msg = result === 'coins' ? '+1 Point!' : result === 'treasure' ? '+3 Points!' : result === 'ambushed' ? '-1 HP' : 'Nothing found'
    const resultData = { result, pointsGain, hpChange, msg }
    setLastScavengeResultThisRound(resultData)
    setScavengeResult(resultData)
    setTimeout(() => setScavengeResult(null), 3500)
    loadData()
  }

  async function setStance(stance) {
    if (!me || me.is_eliminated || !roomId || !sessionId) return
    await supabase.from('player_stances').delete().eq('room_id', roomId).eq('session_id', sessionId).eq('hour_index', hourIndex)
    const { error } = await supabase.from('player_stances').insert({
      room_id: roomId,
      session_id: sessionId,
      hour_index: hourIndex,
      stance,
    })
    if (!error) {
      setCurrentStance(stance)
      loadData()
    }
  }

  function requestPurchase(item) {
    if (!me || me.is_eliminated || item.cost > me.total_points) return
    setPendingPurchase(item)
  }

  function cancelPurchase() {
    setPendingPurchase(null)
    setPurchaseError('')
  }

  async function confirmPurchase() {
    if (!pendingPurchase || !me || me.is_eliminated) return
    const item = pendingPurchase
    setPurchaseError('')
    if (item.cost > me.total_points) {
      setPurchaseError('Not enough points!')
      setPendingPurchase(null)
      return
    }

    const isPotion = item.hp_on_purchase > 0
    const updates = {
      total_points: me.total_points - item.cost,
      ...(isPotion
        ? { health_points: Math.min(MAX_HEALTH, me.health_points + (item.hp_on_purchase || 0)) }
        : { current_item_id: item.id, item_acquired_round: hourIndex }),
    }

    const { error } = await supabase.from('players').update(updates).eq('id', me.id)

    if (error) {
      setPurchaseError(error.message)
    } else {
      setPendingPurchase(null)
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

  function dismissTutorial() {
    localStorage.setItem('koth_tutorial_seen', 'true')
    setShowTutorial(false)
  }

  function selectTarget(targetSessionId) {
    if (!canAttackThisRound) return
    const newTarget = selectedTargetId === targetSessionId ? null : targetSessionId
    setSelectedTargetId(newTarget)
    persistAttackTarget(newTarget)
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
                <strong>{attackerNames(a.attacker_session_id)}</strong> attacked you ({a.attack_points_used} {ICON_ATK})
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

  const canAttackThisRound = !me?.joined_at || canNewPlayerAttackInFirstRound(me.joined_at, hourIndex)
  const myItem = items.find((i) => i.id === me.current_item_id)
  const attackMod = (myItem?.attack_bonus || 0) + (currentStance === 'aggressive' ? 1 : 0)
  const defenseMod = (myItem?.defense_bonus || 0) + (currentStance === 'defensive' ? 1 : 0)
  const effectiveAttack = me.attack_points + attackMod
  const effectiveDefense = me.defense_points + defenseMod
  const myRank = players.findIndex((p) => p.session_id === sessionId) + 1
  const otherPlayers = players.filter((p) => !p.is_eliminated && p.session_id !== sessionId)
  const survivors = players.filter((p) => !p.is_eliminated)
  const bountySessionId = survivors.length
    ? [...survivors].sort((a, b) => b.total_points - a.total_points)[0].session_id
    : null

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="back-btn" onClick={() => navigate('/')}>← EXIT</button>
        <Link to="/rules" state={{ from: 'game' }} className="rules-link" title="View rules">📖 Rules</Link>
        {me?.recovery_code && (
          <div className="recovery-code-badge" title="Use this code on another device to load your character">
            <span className="recovery-code-label">Device code:</span>
            <span className="recovery-code-value">{me.recovery_code}</span>
          </div>
        )}
        <div className="timer">
          Next round: {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
        <div className="header-actions">
          <div className="actions-card">
            <h3 className="actions-card-title">Actions</h3>
            <div className="scavenge-block">
              <div className="action-row">
                <button
                  type="button"
                  className={`scavenge-btn ${scavengeUsedThisRound ? 'used' : ''}`}
                  onClick={() => {
                    if (scavengeUsedThisRound && lastScavengeResultThisRound) {
                      setScavengeResult(lastScavengeResultThisRound)
                    } else {
                      handleScavenge()
                    }
                  }}
                  disabled={me?.is_eliminated}
                  title={scavengeUsedThisRound && lastScavengeResultThisRound
                    ? `Already scavenged this round: ${lastScavengeResultThisRound.msg}`
                    : 'Once per round: 40% +1 pt, 5% +3 pts, 40% nothing, 15% -1 HP'}
                >
                  🔍 Scavenge
                </button>
                <span className="action-hint">Once per round. Chance for +pts or -HP</span>
              </div>
            </div>
            <div className="stance-section">
              <span className="stance-title" title="Your combat stance for this round">Stance</span>
              <div className="stance-wrap">
                <button
                  type="button"
                  className={`stance-btn ${currentStance === 'aggressive' ? 'selected' : ''}`}
                  onClick={() => setStance('aggressive')}
                  disabled={me?.is_eliminated}
                  title="Aggressive: +1 Attack this round. Deal more damage when you attack."
                >
                  <span className="stance-label">⚔ Aggressive</span>
                  <span className="stance-effect">+1 ATK</span>
                </button>
                <button
                  type="button"
                  className={`stance-btn ${currentStance === 'defensive' ? 'selected' : ''}`}
                  onClick={() => setStance('defensive')}
                  disabled={me?.is_eliminated}
                  title="Defensive: +1 Defense this round. Block more incoming damage."
                >
                  <span className="stance-label">🛡 Defensive</span>
                  <span className="stance-effect">+1 DEF</span>
                </button>
                <button
                  type="button"
                  className={`stance-btn ${currentStance === 'greedy' ? 'selected' : ''}`}
                  onClick={() => setStance('greedy')}
                  disabled={me?.is_eliminated}
                  title="Greedy: +1 extra point if you survive the round. No attack/defense bonus."
                >
                  <span className="stance-label">💰 Greedy</span>
                  <span className="stance-effect">+1 pt</span>
                </button>
              </div>
            </div>
            <div className="recap-block">
              <button
                className="recap-btn"
                onClick={showFullGameRecap}
                disabled={me.is_eliminated}
                title="View round recap"
              >
                📜 ROUND RECAP
              </button>
              <span className="action-hint">View past round results</span>
            </div>
          </div>
        </div>
        <div className="my-stats">
          <span className="my-rank">#{myRank}</span>
          <PixelKnight color={me.color} size="small" />
          <span>{me.name}</span>
          <span>{me.total_points} pts</span>
          <HealthBar current={Math.min(me.health_points, MAX_HEALTH)} max={MAX_HEALTH} showLabel={true} compact />
          <span className="my-stats-atkdef" title={`Attack / Defense${attackMod || defenseMod ? ` (includes stance & item bonuses)` : ''}`}>
            {effectiveAttack}{ICON_ATK}{attackMod > 0 ? <span className="stat-mod">(+{attackMod})</span> : ''}
            {' / '}
            {effectiveDefense}{ICON_DEF}{defenseMod > 0 ? <span className="stat-mod">(+{defenseMod})</span> : ''}
          </span>
        </div>
      </div>

      <div className="game-layout">
        <aside className="player-list">
          <h3>RANKINGS <span className="player-count">({players.length})</span></h3>
          <div className="rankings-legend">
            <span className="legend-item legend-red" title="Attacked you last round">Red: Attacked you last round</span>
            <span className="legend-item legend-green" title="Attacked same player as you last round">Green: Same target last round</span>
          </div>
          <div className="player-list-scroll">
          {players.map((p, i) => {
            const isMe = p.session_id === sessionId
            const pAttack = isMe ? effectiveAttack : p.attack_points
            const pDefense = isMe ? effectiveDefense : p.defense_points
            const isBounty = p.session_id === bountySessionId
            const isTarget = selectedTargetId === p.session_id && p.session_id !== sessionId
            const attackedMeLastRound = lastRoundAttackersOnMe.has(p.session_id)
            const hadSameEnemyLastRound = lastRoundSameTargetAttackers.has(p.session_id)
            const currentRank = i + 1
            const prevRank = p.previous_round_rank
            const rankChange = prevRank == null ? 'same' : currentRank < prevRank ? 'up' : currentRank > prevRank ? 'down' : 'same'
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className={`player-row ${p.is_eliminated ? 'eliminated' : ''} ${p.session_id === sessionId ? 'me' : ''} ${selectedPlayer?.id === p.id ? 'selected' : ''} ${isBounty ? 'bounty' : ''} ${attackedMeLastRound ? 'attacked-you' : ''} ${hadSameEnemyLastRound ? 'same-target' : ''}`}
                onClick={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
              >
                <span className="rank-cell">
                  <span className="rank">#{currentRank}</span>
                  <span className={`rank-change rank-change-${rankChange}`} title={rankChange === 'up' ? 'Moved up' : rankChange === 'down' ? 'Moved down' : 'No change'}>
                    {rankChange === 'up' ? '\u2191' : rankChange === 'down' ? '\u2193' : '\u2013'}
                  </span>
                </span>
                {isBounty && (
                  <span
                    className="bounty-label-wrap"
                    ref={bountyBadgeRef}
                    onMouseEnter={handleBountyBadgeEnter}
                    onMouseLeave={handleBountyBadgeLeave}
                    onClick={handleBountyBadgeClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBountyBadgeClick(e)}
                    aria-label="Bounty target - tap for info"
                  >
                    <span className="bounty-badge">🎯 BOUNTY</span>
                  </span>
                )}
                <PixelKnight color={p.color} size="small" />
                <div className="player-info">
                  {isTarget && (
                    <span className="target-label-wrap" title="Your attack target">
                      <span className="target-badge">{ICON_ATK} CURRENT TARGET</span>
                    </span>
                  )}
                  <span className="name">{p.name}</span>
                  <span className="class-label player-detail-mobile">{p.class_type}</span>
                  <span className="points">{p.total_points} pts</span>
                  <span className="player-detail-mobile player-detail-health">
                    <HealthBar current={Math.min(p.health_points, MAX_HEALTH)} max={MAX_HEALTH} showLabel={true} compact />
                  </span>
                  <span className="stats-row" title={isMe ? 'Your attack/defense (with modifiers)' : 'Base attack / defense'}>
                    {ICON_ATK}{pAttack}{isMe && attackMod > 0 ? <span className="stat-mod">(+{attackMod})</span> : ''}{' '}
                    {ICON_DEF}{pDefense}{isMe && defenseMod > 0 ? <span className="stat-mod">(+{defenseMod})</span> : ''}
                  </span>
                  {p.last_round_item_id && (
                    <span className="last-item player-detail-mobile" title={items.find((it) => it.id === p.last_round_item_id)?.name || 'Item'}>
                      ⚔
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          </div>
          {players.length > 3 && (
            <div className="player-list-scroll-hint" aria-hidden="true">
              ← Swipe for more ({players.length} players)
            </div>
          )}
        </aside>

        <main className="game-main">
          <section className="attack-section">
            <h3>CHOOSE TARGET</h3>
            {canAttackThisRound ? (
              <p className="attack-hint">Pick a target below. Your choice is highlighted in Rankings. No target = no attack.</p>
            ) : (
              <p className="attack-hint attack-blocked">New players can't attack in the last 15 min of their first round. You can attack next round.</p>
            )}
            {otherPlayers.length === 0 ? (
              <p>No other players</p>
            ) : (
              <div className="attack-targets">
                {otherPlayers.map((p) => {
                  const isSelected = selectedTargetId === p.session_id
                  const isBounty = p.session_id === bountySessionId
                  const attackedMeLastRound = lastRoundAttackersOnMe.has(p.session_id)
                  const hadSameEnemyLastRound = lastRoundSameTargetAttackers.has(p.session_id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`attack-target ${isSelected ? 'selected' : ''} ${isBounty ? 'bounty' : ''}`}
                      onClick={() => selectTarget(p.session_id)}
                      disabled={me.is_eliminated || !canAttackThisRound}
                      aria-label={`Attack ${p.name}`}
                      title={!canAttackThisRound ? 'New players cannot attack in the last 15 min of their first round' : undefined}
                    >
                      {isSelected && <span className="target-label-badge">{ICON_ATK} Your target</span>}
                      {isBounty && <span className="bounty-badge">🎯</span>}
                      <PixelKnight color={p.color} size="small" />
                      <span className="target-info">
                        <span className="target-name">{p.name}</span>
                        {attackedMeLastRound && <span className="target-hint attacked-you">Attacked you last round</span>}
                        {hadSameEnemyLastRound && !attackedMeLastRound && <span className="target-hint same-enemy">Had the same enemy last round</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {pendingPurchase && (
            <div className="purchase-confirm-overlay" onClick={cancelPurchase}>
              <div className="purchase-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm Purchase</h3>
                <p className="purchase-item-name">{pendingPurchase.name} — {pendingPurchase.cost} pts</p>
                <p className="purchase-warning">
                  This will deduct {pendingPurchase.cost} points from your total. Items last 3 rounds and are not refundable.
                </p>
                <div className="purchase-confirm-buttons">
                  <button type="button" onClick={cancelPurchase}>Cancel</button>
                  <button type="button" onClick={confirmPurchase}>Accept</button>
                </div>
              </div>
            </div>
          )}
        </main>

        <div className="bottom-drawers">
          <div className={`app-drawer recap-drawer ${recapDrawerOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="drawer-header"
              onClick={() => setRecapDrawerOpen((o) => !o)}
              aria-expanded={recapDrawerOpen}
              aria-label={recapDrawerOpen ? 'Collapse round recap' : 'Expand round recap'}
            >
              <h3>ROUND RECAP</h3>
              <span className="drawer-arrow" aria-hidden="true">{recapDrawerOpen ? '▼' : '▲'}</span>
            </button>
            <div className="drawer-content">
              {roundResults.length === 0 ? (
                <p>No rounds yet. Results appear here every round.</p>
              ) : (
                roundResults.map((r) => (
                  <div key={r.id} className="round-block">
                    <div className="round-header">Round {r.hour_index}</div>
                    {roundLogAttacks[r.hour_index]?.length > 0 ? (
                      <RecapFlowVisual
                        attacks={roundLogAttacks[r.hour_index]}
                        players={players}
                        sessionId={sessionId}
                        roundIndex={r.hour_index}
                        compact
                      />
                    ) : (
                      <p className="round-detail round-detail-empty">No attacks this round.</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className={`app-drawer store-drawer ${storeDrawerOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="drawer-header"
              onClick={() => setStoreDrawerOpen((o) => !o)}
              aria-expanded={storeDrawerOpen}
              aria-label={storeDrawerOpen ? 'Collapse item store' : 'Expand item store'}
            >
              <h3>ITEM STORE</h3>
              <span className="drawer-arrow" aria-hidden="true">{storeDrawerOpen ? '▼' : '▲'}</span>
            </button>
            <div className="drawer-content">
              <section className="my-items-section">
                <h4>MY ITEMS</h4>
                {myItem ? (
                  <div className="equipped-item">
                    <span className="item-name">{myItem.name}</span>
                    <span className="item-bonus">
                      {myItem.hp_on_purchase
                        ? `+${myItem.hp_on_purchase} HP`
                        : myItem.damage_reduction
                          ? `-${myItem.damage_reduction} dmg`
                          : `+${myItem.attack_bonus || 0} ${ICON_ATK}, +${myItem.defense_bonus || 0} ${ICON_DEF}`}
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
              <div className="items-grid">
                {items.map((item) => (
                  <div key={item.id} className="item-card">
                    <p className="item-name">{item.name}</p>
                    <p className="item-desc">
                      {item.hp_on_purchase
                        ? `+${item.hp_on_purchase} HP (consumable)`
                        : item.damage_reduction
                          ? `-${item.damage_reduction} dmg taken`
                          : `+${item.attack_bonus || 0} ${ICON_ATK}, +${item.defense_bonus || 0} ${ICON_DEF}`}
                    </p>
                    <p className="item-cost">{item.cost} pts</p>
                    <button
                      onClick={() => requestPurchase(item)}
                      disabled={item.cost > me.total_points || me.is_eliminated}
                      title={myItem ? 'Swap item (no refund for current item)' : undefined}
                    >
                      {myItem ? 'SWAP' : 'BUY'}
                    </button>
                  </div>
                ))}
              </div>
              {purchaseError && <p className="error">{purchaseError}</p>}
            </div>
          </div>
        </div>
      </div>

      {bountyTooltipOpen && bountyTooltipRect && (() => {
        const tooltipWidth = 200
        const gap = 8
        const spaceRight = window.innerWidth - bountyTooltipRect.right
        const left = spaceRight >= tooltipWidth + gap
          ? bountyTooltipRect.right + gap
          : bountyTooltipRect.left - tooltipWidth - gap
        const leftClamped = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8))
        const top = bountyTooltipRect.top + bountyTooltipRect.height / 2
        const topClamped = Math.max(12, Math.min(top, window.innerHeight - 90))
        return createPortal(
          <div
            ref={bountyTooltipRef}
            className="bounty-tooltip-portal"
            style={{
              left: leftClamped,
              top: topClamped,
              transform: 'translateY(-50%)',
            }}
          >
            The Bounty is the player with the most points. Attack them and deal damage to earn +2 pts. If they block (take 0 damage), you lose 1 HP.
          </div>,
          document.body
        )
      })()}

      {showTutorial && (
        <GameTutorial onComplete={dismissTutorial} />
      )}

      {scavengeResult && (
        <div className="scavenge-result-overlay" onClick={() => setScavengeResult(null)}>
          <div className="scavenge-result-popup" onClick={(e) => e.stopPropagation()}>
            <h3>🔍 Scavenge Result</h3>
            <div className={`scavenge-result-content scavenge-${scavengeResult.result}`}>
              {scavengeResult.result === 'coins' && <span className="scavenge-icon">🪙</span>}
              {scavengeResult.result === 'treasure' && <span className="scavenge-icon">💎</span>}
              {scavengeResult.result === 'nothing' && <span className="scavenge-icon">🔍</span>}
              {scavengeResult.result === 'ambushed' && <span className="scavenge-icon">⚔️</span>}
              <p className="scavenge-result-msg">{scavengeResult.msg}</p>
              {scavengeResult.pointsGain > 0 && <p className="scavenge-result-detail">+{scavengeResult.pointsGain} point{scavengeResult.pointsGain > 1 ? 's' : ''}</p>}
              {scavengeResult.hpChange < 0 && <p className="scavenge-result-detail scavenge-negative">{scavengeResult.hpChange} HP</p>}
            </div>
            <button className="scavenge-result-btn" onClick={() => setScavengeResult(null)}>Got it</button>
          </div>
        </div>
      )}

      {recapModal && (
        <div className="recap-modal" onClick={() => { setRecapModal(null); setRecapData(null) }}>
          <div className="recap-panel" onClick={(e) => e.stopPropagation()}>
            <div className="recap-header">
              <h3>📜 {recapModal === 'last_round' ? 'Last Round' : 'Full Game'} — Attack flow</h3>
              <button className="close-btn" onClick={() => { setRecapModal(null); setRecapData(null) }} aria-label="Close">×</button>
            </div>
            <div className="recap-body">
              {!recapData ? (
                <p className="recap-loading">Loading...</p>
              ) : (
                <div className="recap-flow-list">
                  {recapData.rounds.map((r) => (
                    <RecapFlowVisual
                      key={r.hourIndex}
                      attacks={r.attacks}
                      players={players}
                      sessionId={sessionId}
                      roundIndex={r.hourIndex}
                    />
                  ))}
                </div>
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
                              Attacked: {made.map((a) => `${getName(a.target_session_id)} (${a.attack_points_used} ${ICON_ATK})`).join(', ')}
                            </div>
                          )}
                          {received.length > 0 && (
                            <div className="history-detail received">
                              Received: {received.map((a) => `${getName(a.attacker_session_id)} (${a.attack_points_used} ${ICON_ATK})`).join(', ')} = {received.reduce((s, a) => s + a.attack_points_used, 0)} total {ICON_ATK}
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
