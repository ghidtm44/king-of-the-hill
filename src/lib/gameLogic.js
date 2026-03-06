// Game constants
export const CLASSES = {
  attacker: { attack: 7, defense: 3, label: 'Attacker' },
  defender: { attack: 3, defense: 7, label: 'Defender' },
  balanced: { attack: 5, defense: 5, label: 'Balanced' },
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
export const MAX_HEALTH = 20
export const MAX_PLAYERS = 10
export const MAX_NAME_LENGTH = 10

// EST timezone helpers - Rounds run every 5 minutes (for faster testing)
const ROUND_MINUTES = 5

export function getCurrentHourIndex() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()

  // Game runs 12pm to 11am next day
  let hourFromStart = hours - 12
  if (hourFromStart < 0) hourFromStart += 24

  // Round index: one per 5-minute block (0 at 12:00, 1 at 12:05, etc.)
  const roundIndex = hourFromStart * (60 / ROUND_MINUTES) + Math.floor(minutes / ROUND_MINUTES)

  // Evaluate at last second of each 5-min block (e.g. 12:04:59, 12:09:59)
  const isEvaluationSecond = minutes % ROUND_MINUTES === ROUND_MINUTES - 1 && seconds === 59

  return { hourIndex: roundIndex, minutes, seconds, isEvaluationSecond }
}

export function isGameActive() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()

  if (hours === 11 && minutes >= 0) return false
  if (hours < 12) return false
  return true
}

export function getTimeUntilNextHour() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()

  // Seconds into current 5-min block
  const secondsIntoBlock = (minutes % ROUND_MINUTES) * 60 + seconds
  // Seconds until evaluation (last second of block)
  const secondsUntilEval = (ROUND_MINUTES - 1) * 60 + 59 - secondsIntoBlock

  return {
    minutes: Math.floor(secondsUntilEval / 60),
    seconds: secondsUntilEval % 60,
  }
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
