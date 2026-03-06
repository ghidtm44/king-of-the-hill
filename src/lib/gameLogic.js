// Game constants
export const CLASSES = {
  attacker: { attack: 3, defense: 1, label: 'Attacker' },
  defender: { attack: 1, defense: 3, label: 'Defender' },
  balanced: { attack: 2, defense: 2, label: 'Balanced' },
}

export const COLORS = [
  { name: 'Red', value: '#c41e3a' },
  { name: 'Blue', value: '#1e3a8a' },
  { name: 'Green', value: '#2d6a4f' },
  { name: 'Gold', value: '#e6b800' },
  { name: 'Purple', value: '#6a0dad' },
  { name: 'Orange', value: '#e85d04' },
]

export const STARTING_POINTS = 5
export const MAX_HEALTH = 15
export const DAMAGE_CAP_PER_ROUND = 5
export const MAX_PLAYERS = 10
export const MAX_NAME_LENGTH = 10

// Round interval: 2 minutes for testing (change to 3600 for production hourly)
export const ROUND_INTERVAL_SECONDS = 120

export function getCurrentHourIndex() {
  const now = new Date()
  const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const roundIndex = Math.floor(totalSeconds / ROUND_INTERVAL_SECONDS) + 1
  const secondsIntoRound = totalSeconds % ROUND_INTERVAL_SECONDS
  const isEvaluationSecond = secondsIntoRound === ROUND_INTERVAL_SECONDS - 1

  return { hourIndex: roundIndex, isEvaluationSecond }
}

export function isGameActive() {
  return true // Always active for testing
}

export function getTimeUntilNextHour() {
  const now = new Date()
  const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const secondsIntoRound = totalSeconds % ROUND_INTERVAL_SECONDS
  const secondsUntilEval = Math.max(0, ROUND_INTERVAL_SECONDS - 1 - secondsIntoRound)

  return {
    minutes: Math.floor(secondsUntilEval / 60),
    seconds: secondsUntilEval % 60,
  }
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
