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

// EST timezone helpers - Rounds run every hour (12pm to 11am next day)
export function getCurrentHourIndex() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()

  // Game runs 12pm to 11am next day (24 rounds)
  let hourFromStart = hours - 12
  if (hourFromStart < 0) hourFromStart += 24

  // Round index: 1-based, Round 1 at 12:00:00, Round 2 at 1:00:00, etc.
  const roundIndex = hourFromStart + 1

  // Evaluate at last second of each hour (XX:59:59)
  const isEvaluationSecond = minutes === 59 && seconds === 59

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

  // Seconds until XX:59:59 (evaluation moment)
  const secondsIntoHour = minutes * 60 + seconds
  const secondsUntilEval = 59 * 60 + 59 - secondsIntoHour

  return {
    minutes: Math.floor(secondsUntilEval / 60),
    seconds: secondsUntilEval % 60,
  }
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
