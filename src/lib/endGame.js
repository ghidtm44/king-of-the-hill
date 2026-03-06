import { supabase } from './supabase'

export async function checkAndEndGame(roomId) {
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('hall_of_fame')
    .select('id')
    .eq('game_date', today)
    .limit(1)

  if (existing?.length > 0) return { alreadyRecorded: true }

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_eliminated', false)
    .order('total_points', { ascending: false })

  if (!players?.length) return { noWinner: true }

  const winner = players[0]

  await supabase.from('hall_of_fame').insert({
    player_name: winner.name,
    player_color: winner.color,
    final_points: winner.total_points,
    game_date: today,
  })

  await supabase.from('players').delete().eq('room_id', roomId)
  await supabase.from('attack_allocations').delete().eq('room_id', roomId)
  await supabase.from('round_results').delete().eq('room_id', roomId)
  await supabase.from('round_evaluations').delete().eq('room_id', roomId)

  return { winner }
}
