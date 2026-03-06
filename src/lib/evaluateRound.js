import { supabase } from './supabase'

export async function evaluateRound(roomId, hourIndex) {
  // Try to insert - if duplicate, evaluation already ran
  const { error: insertErr } = await supabase
    .from('round_evaluations')
    .insert({ room_id: roomId, hour_index: hourIndex })

  if (insertErr?.code === '23505') {
    return { alreadyEvaluated: true }
  }
  if (insertErr) {
    return { error: insertErr.message }
  }

  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, session_id, name, attack_points, defense_points, total_points, health_points, current_item_id, is_eliminated')
    .eq('room_id', roomId)
    .eq('is_eliminated', false)

  if (playersErr || !players?.length) {
    return { error: 'No players' }
  }

  const { data: itemsData } = await supabase.from('items').select('id, attack_bonus, defense_bonus')
  const itemsMap = Object.fromEntries((itemsData || []).map((i) => [i.id, i]))

  // Fetch attack allocations for this hour
  const { data: attacks, error: attacksErr } = await supabase
    .from('attack_allocations')
    .select('*')
    .eq('room_id', roomId)
    .eq('hour_index', hourIndex)

  if (attacksErr) return { error: attacksErr.message }

  // Build effective defense per player (base + item bonus)
  const playerMap = {}
  players.forEach((p) => {
    const item = p.current_item_id ? itemsMap[p.current_item_id] : null
    const attackBonus = item?.attack_bonus || 0
    const defenseBonus = item?.defense_bonus || 0
    playerMap[p.session_id] = {
      ...p,
      effectiveAttack: p.attack_points + attackBonus,
      effectiveDefense: p.defense_points + defenseBonus,
      totalAttackAgainst: 0,
    }
  })

  // Sum attack against each target
  attacks?.forEach((a) => {
    if (playerMap[a.target_session_id]) {
      playerMap[a.target_session_id].totalAttackAgainst += a.attack_points_used
    }
  })

  const roundLog = []
  const updates = []

  for (const sessionId of Object.keys(playerMap)) {
    const p = playerMap[sessionId]
    const totalAttack = p.totalAttackAgainst
    const defense = p.effectiveDefense
    let newPoints = p.total_points
    let newHealth = p.health_points

    if (totalAttack > defense) {
      const damage = totalAttack - defense
      newHealth = Math.max(0, p.health_points - damage)
      roundLog.push(`${p.name} took ${damage} dmg to health (${totalAttack} atk vs ${defense} def)`)
    } else if (totalAttack < defense) {
      const bonus = defense - totalAttack
      newPoints = p.total_points + bonus
      roundLog.push(`${p.name} gained ${bonus} points (${defense} def > ${totalAttack} atk)`)
    }

    // Eliminated when points OR health reaches zero
    const isEliminated = newPoints <= 0 || newHealth <= 0

    updates.push({
      id: p.id,
      total_points: Math.max(0, newPoints),
      health_points: Math.max(0, newHealth),
      is_eliminated: isEliminated,
      last_round_item_id: p.current_item_id,
    })
  }

  // Log attacks
  const attackLog = attacks?.map((a) => {
    const attacker = players.find((x) => x.session_id === a.attacker_session_id)
    const target = players.find((x) => x.session_id === a.target_session_id)
    return `${attacker?.name || '?'} → ${target?.name || '?'}: ${a.attack_points_used} atk`
  }) || []

  // Save round result text
  const resultText = [
    `--- Hour ${hourIndex} ---`,
    ...attackLog,
    ...roundLog,
  ].join('\n')

  await supabase.from('round_results').insert({
    room_id: roomId,
    hour_index: hourIndex,
    result_text: resultText,
  })

  // Update players
  for (const u of updates) {
    const { id, ...rest } = u
    await supabase.from('players').update(rest).eq('id', id)
  }

  return { success: true, roundLog }
}
