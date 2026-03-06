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

// Round interval: 3600 = hourly (production). Use 120 for testing.
export const ROUND_INTERVAL_SECONDS = 3600

export function getCurrentHourIndex() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()
  // Round 1 at 12pm, Round 24 at 11am. Game runs 12pm–11:59am EST.
  const hourFromStart = hours >= 12 ? hours - 12 : hours + 12
  const roundIndex = hourFromStart + 1
  const secondsIntoRound = minutes * 60 + seconds
  const isEvaluationSecond = secondsIntoRound === ROUND_INTERVAL_SECONDS - 1

  return { hourIndex: roundIndex, isEvaluationSecond }
}

// Game runs 12:00 PM–11:59 AM EST (24 rounds). Ends at 11:59 AM, resets at 12:00 PM.
export function isGameActive() {
  // Game is active for full cycle: 12pm through 11:59am (rounds 1–24)
  return true
}

// Only true at noon EST—when we need to clean up the previous game before the new one starts.
export function shouldEndPreviousGame() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  return hours === 12
}

export function getTimeUntilNextHour() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()
  const secondsIntoRound = minutes * 60 + seconds
  const secondsUntilEval = Math.max(0, ROUND_INTERVAL_SECONDS - 1 - secondsIntoRound)

  return {
    minutes: Math.floor(secondsUntilEval / 60),
    seconds: secondsUntilEval % 60,
  }
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
