import { supabase } from './supabase'
import { DAMAGE_CAP_PER_ROUND, canNewPlayerAttackInFirstRound } from './gameLogic'

export async function evaluateRound(roomId, hourIndex) {
  const { error: insertErr } = await supabase
    .from('round_evaluations')
    .insert({ room_id: roomId, hour_index: hourIndex })

  if (insertErr?.code === '23505') {
    return { alreadyEvaluated: true }
  }
  if (insertErr) {
    return { error: insertErr.message }
  }

  // Load ALL players (including eliminated) for leaderboard, but survivors for combat
  const { data: allPlayers, error: playersErr } = await supabase
    .from('players')
    .select('id, session_id, name, attack_points, defense_points, total_points, health_points, current_item_id, item_acquired_round, is_eliminated, joined_at')
    .eq('room_id', roomId)

  if (playersErr || !allPlayers?.length) {
    return { error: 'No players' }
  }

  const survivors = allPlayers.filter((p) => !p.is_eliminated)
  const { data: itemsData } = await supabase.from('items').select('id, attack_bonus, defense_bonus, damage_reduction')
  const itemsMap = Object.fromEntries((itemsData || []).map((i) => [i.id, i]))

  // Bounty = highest points among survivors at round start
  const bountySessionId = survivors.length
    ? survivors.sort((a, b) => b.total_points - a.total_points)[0].session_id
    : null

  // Load existing attack allocations
  const { data: attacks, error: attacksErr } = await supabase
    .from('attack_allocations')
    .select('*')
    .eq('room_id', roomId)
    .eq('hour_index', hourIndex)

  if (attacksErr) return { error: attacksErr.message }

  // Load stances for this round
  const { data: stancesData } = await supabase
    .from('player_stances')
    .select('session_id, stance')
    .eq('room_id', roomId)
    .eq('hour_index', hourIndex)
  const stanceBySession = Object.fromEntries((stancesData || []).map((s) => [s.session_id, s.stance]))

  // Build effective stats for each survivor (including stance bonuses)
  const survivorMap = {}
  survivors.forEach((p) => {
    const item = p.current_item_id ? itemsMap[p.current_item_id] : null
    const stance = stanceBySession[p.session_id]
    survivorMap[p.session_id] = {
      ...p,
      effectiveAttack: p.attack_points + (item?.attack_bonus || 0) + (stance === 'aggressive' ? 1 : 0),
      effectiveDefense: p.defense_points + (item?.defense_bonus || 0) + (stance === 'defensive' ? 1 : 0),
      damageReduction: item?.damage_reduction || 0,
      stance,
    }
  })

  // Only process attacks from players who chose a target—no random assignment
  const attacksToProcess = [...(attacks || [])]

  const attackerJoinedAt = Object.fromEntries(allPlayers.map((p) => [p.session_id, p.joined_at]))

  // Group attacks by target (add stance bonus to attack value). Exclude attacks from new players who joined in last 15 min of first round.
  const targetToAttackers = {}
  attacksToProcess.forEach((a) => {
    if (!survivorMap[a.attacker_session_id]) return
    if (!canNewPlayerAttackInFirstRound(attackerJoinedAt[a.attacker_session_id], hourIndex)) return
    if (!targetToAttackers[a.target_session_id]) targetToAttackers[a.target_session_id] = []
    const stanceBonus = stanceBySession[a.attacker_session_id] === 'aggressive' ? 1 : 0
    targetToAttackers[a.target_session_id].push({
      sessionId: a.attacker_session_id,
      attackValue: a.attack_points_used + stanceBonus,
    })
  })

  const roundLog = []
  const scoreGains = {}
  const damageTaken = {}
  const bountyCounterattackVictims = [] // attackers who hit bounty but did 0 damage

  survivors.forEach((p) => {
    scoreGains[p.session_id] = 0
    damageTaken[p.session_id] = 0
  })

  // Process each target
  for (const [targetSessionId, attackerList] of Object.entries(targetToAttackers)) {
    const target = survivorMap[targetSessionId]
    if (!target) continue

    const totalAttack = attackerList.reduce((s, a) => s + a.attackValue, 0)
    let damage = Math.max(0, totalAttack - target.effectiveDefense)
    if (damage > 0 && target.damageReduction > 0) {
      damage = Math.max(0, damage - target.damageReduction)
    }
    damage = Math.min(damage, DAMAGE_CAP_PER_ROUND)
    damageTaken[targetSessionId] = damage

    const isBounty = targetSessionId === bountySessionId

    if (damage > 0) {
      roundLog.push(`${target.name} loses ${damage} HP (Total Attack: ${totalAttack}, Defense: ${target.effectiveDefense})`)
      scoreGains[targetSessionId] = (scoreGains[targetSessionId] || 0) - 1
      const rewardPerAttacker = isBounty ? 2 : 1
      attackerList.forEach((a) => {
        scoreGains[a.sessionId] = (scoreGains[a.sessionId] || 0) + rewardPerAttacker
      })
      if (isBounty) {
        roundLog.push(`Attackers gain +${rewardPerAttacker} Points (bounty reward)`)
      }
    } else if (totalAttack > 0) {
      roundLog.push(`${target.name} blocked (Total Attack: ${totalAttack}, Defense: ${target.effectiveDefense})`)
      scoreGains[targetSessionId] = (scoreGains[targetSessionId] || 0) + 1
      attackerList.forEach((a) => {
        scoreGains[a.sessionId] = (scoreGains[a.sessionId] || 0) - 1
      })
      if (isBounty) {
        attackerList.forEach((a) => bountyCounterattackVictims.push(a.sessionId))
      }
    }
  }

  // Bounty counterattack: attackers who hit bounty but did 0 damage lose 1 HP (min 1)
  const counterattackDamage = {}
  bountyCounterattackVictims.forEach((sid) => {
    counterattackDamage[sid] = (counterattackDamage[sid] || 0) + 1
  })

  // Build attack log lines
  const attackLogLines = []
  for (const [targetSessionId, attackerList] of Object.entries(targetToAttackers)) {
    const target = allPlayers.find((p) => p.session_id === targetSessionId)
    const targetName = target?.name || '?'
    attackerList.forEach((a) => {
      const attacker = allPlayers.find((p) => p.session_id === a.sessionId)
      attackLogLines.push(`${attacker?.name || '?'} attacked ${targetName}`)
    })
  }

  const counterattackLog = []
  Object.keys(counterattackDamage).forEach((sid) => {
    const p = survivorMap[sid]
    if (p) counterattackLog.push(`${p.name} loses 1 HP (bounty counterattack)`)
  })

  // Survival income: +1 for all survivors, +1 extra for greedy stance
  survivors.forEach((p) => {
    const base = 1
    const greedyBonus = stanceBySession[p.session_id] === 'greedy' ? 1 : 0
    scoreGains[p.session_id] = (scoreGains[p.session_id] || 0) + base + greedyBonus
  })

  // Build result text (spec format)
  const resultBlocks = []
  for (const [targetSessionId, attackerList] of Object.entries(targetToAttackers)) {
    const target = survivorMap[targetSessionId]
    if (!target) continue
    const totalAttack = attackerList.reduce((s, a) => s + a.attackValue, 0)
    let dmg = Math.max(0, totalAttack - target.effectiveDefense)
    if (dmg > 0 && target.damageReduction > 0) dmg = Math.max(0, dmg - target.damageReduction)
    dmg = Math.min(dmg, DAMAGE_CAP_PER_ROUND)
    const isBounty = targetSessionId === bountySessionId

    resultBlocks.push(`Total Attack: ${totalAttack}`)
    resultBlocks.push(`${target.name} Defense: ${target.effectiveDefense}`)
    resultBlocks.push(`Damage: ${dmg}`)
    if (dmg > 0) {
      resultBlocks.push(`${target.name} loses ${dmg} HP`)
      resultBlocks.push(`${target.name} loses 1 Point (took damage)`)
      resultBlocks.push(`Attackers gain +${isBounty ? 2 : 1} Points${isBounty ? ' (bounty reward)' : ''}`)
    } else if (totalAttack > 0) {
      resultBlocks.push(`${target.name} gains +1 Point (blocked)`)
      resultBlocks.push('Attackers lose 1 Point each (dealt 0 damage)')
      if (isBounty) resultBlocks.push('Bounty counterattack: attackers lose 1 HP each')
    }
    resultBlocks.push('')
  }

  const resultText = [
    `--- Round ${hourIndex} ---`,
    ...attackLogLines,
    '',
    ...resultBlocks,
    ...counterattackLog,
    '',
    'All surviving players gain +1 Point',
  ].join('\n')

  await supabase.from('round_results').insert({
    room_id: roomId,
    hour_index: hourIndex,
    result_text: resultText,
  })

  // Current ranking (before this round) = end of previous round
  const sortedByPoints = [...allPlayers].sort((a, b) => b.total_points - a.total_points)
  const previousRankBySession = {}
  sortedByPoints.forEach((p, idx) => {
    previousRankBySession[p.session_id] = idx + 1
  })

  // Apply updates to players
  const updates = []
  for (const p of allPlayers) {
    const isSurvivor = !p.is_eliminated
    const damage = damageTaken[p.session_id] || 0
    const counterDmg = counterattackDamage[p.session_id] || 0
    const totalDamage = damage + counterDmg
    const newHealth = Math.max(0, p.health_points - totalDamage)
    const scoreGain = isSurvivor ? (scoreGains[p.session_id] || 0) : 0
    const newPoints = isSurvivor ? p.total_points + scoreGain : p.total_points
    const isEliminated = newHealth <= 0

    // Items expire after 3 rounds
    const itemExpired = p.current_item_id && p.item_acquired_round != null && (hourIndex - p.item_acquired_round >= 3)
    const finalItemId = itemExpired ? null : p.current_item_id
    const finalItemRound = itemExpired ? null : p.item_acquired_round

    updates.push({
      id: p.id,
      total_points: newPoints,
      health_points: newHealth,
      is_eliminated: isEliminated,
      last_round_item_id: p.current_item_id,
      current_item_id: finalItemId,
      item_acquired_round: finalItemRound,
      previous_round_rank: previousRankBySession[p.session_id],
    })
  }

  for (const u of updates) {
    const { id, ...rest } = u
    await supabase.from('players').update(rest).eq('id', id)
  }

  return { success: true, roundLog }
}
