import { supabase } from './supabase'

const DAMAGE_CAP_PER_ROUND = 8

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

  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, session_id, name, attack_points, defense_points, total_points, health_points, current_item_id, is_eliminated')
    .eq('room_id', roomId)
    .eq('is_eliminated', false)

  if (playersErr || !players?.length) {
    return { error: 'No players' }
  }

  const { data: itemsData } = await supabase.from('items').select('id, attack_bonus, defense_bonus, damage_reduction')
  const itemsMap = Object.fromEntries((itemsData || []).map((i) => [i.id, i]))

  const { data: attacks, error: attacksErr } = await supabase
    .from('attack_allocations')
    .select('*')
    .eq('room_id', roomId)
    .eq('hour_index', hourIndex)

  if (attacksErr) return { error: attacksErr.message }

  const playerMap = {}
  players.forEach((p) => {
    const item = p.current_item_id ? itemsMap[p.current_item_id] : null
    const defenseBonus = item?.defense_bonus || 0
    const damageReduction = item?.damage_reduction || 0
    playerMap[p.session_id] = {
      ...p,
      effectiveDefense: p.defense_points + defenseBonus,
      damageReduction,
      totalAttackAgainst: 0,
    }
  })

  attacks?.forEach((a) => {
    if (playerMap[a.target_session_id]) {
      playerMap[a.target_session_id].totalAttackAgainst += a.attack_points_used
    }
  })

  const roundLog = []
  const scoreGains = {}
  const damageTaken = {}
  players.forEach((p) => { scoreGains[p.session_id] = 0; damageTaken[p.session_id] = 0 })

  for (const sessionId of Object.keys(playerMap)) {
    const p = playerMap[sessionId]
    const incoming = p.totalAttackAgainst
    const defense = p.effectiveDefense
    let damage = Math.max(0, incoming - defense)

    if (damage > 0 && p.damageReduction > 0) {
      damage = Math.max(0, damage - p.damageReduction)
    }
    damage = Math.min(damage, DAMAGE_CAP_PER_ROUND)
    damageTaken[sessionId] = damage

    if (damage > 0) {
      roundLog.push(`${p.name} took ${damage} dmg (${incoming} atk vs ${defense} def)`)
      const targetAttacks = attacks?.filter((a) => a.target_session_id === sessionId) || []
      const totalContrib = targetAttacks.reduce((s, a) => s + a.attack_points_used, 0)
      if (totalContrib > 0) {
        const shares = targetAttacks.map((a) => ({
          sid: a.attacker_session_id,
          exact: (a.attack_points_used / totalContrib) * damage,
        }))
        const floored = shares.map((s) => Math.floor(s.exact))
        let remainder = damage - floored.reduce((a, b) => a + b, 0)
        const withFrac = shares
          .map((s, i) => ({ ...s, floor: floored[i], frac: s.exact - floored[i] }))
          .sort((a, b) => b.frac - a.frac)
        for (let i = 0; i < remainder; i++) {
          withFrac[i].floor += 1
        }
        withFrac.forEach((s) => {
          scoreGains[s.sid] = (scoreGains[s.sid] || 0) + s.floor
        })
      }
    } else if (incoming > 0) {
      roundLog.push(`${p.name} blocked (${incoming} atk vs ${defense} def)`)
    }
  }

  const updates = []
  for (const sessionId of Object.keys(playerMap)) {
    const p = playerMap[sessionId]
    const damage = damageTaken[sessionId]
    const newHealth = Math.max(0, p.health_points - damage)
    const hourlyIncome = 1
    const damageScore = scoreGains[sessionId] || 0
    const newPoints = p.total_points + hourlyIncome + damageScore
    const isEliminated = newPoints <= 0 || newHealth <= 0

    updates.push({
      id: p.id,
      total_points: Math.max(0, newPoints),
      health_points: newHealth,
      is_eliminated: isEliminated,
      last_round_item_id: p.current_item_id,
    })
  }

  const attackLog = attacks?.map((a) => {
    const attacker = players.find((x) => x.session_id === a.attacker_session_id)
    const target = players.find((x) => x.session_id === a.target_session_id)
    return `${attacker?.name || '?'} → ${target?.name || '?'}: ${a.attack_points_used} atk`
  }) || []

  const incomeLog = players.map((p) => `${p.name} +1 (income)`).join('\n')
  const resultText = [
    `--- Round ${hourIndex} ---`,
    ...attackLog,
    ...roundLog,
    incomeLog,
  ].join('\n')

  await supabase.from('round_results').insert({
    room_id: roomId,
    hour_index: hourIndex,
    result_text: resultText,
  })

  for (const u of updates) {
    const { id, ...rest } = u
    await supabase.from('players').update(rest).eq('id', id)
  }

  return { success: true, roundLog }
}
