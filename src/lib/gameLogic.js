// Game constants
export const ICON_ATK = '🗡'
export const ICON_DEF = '🛡'

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
export const MAX_PLAYERS = 25
export const MAX_NAME_LENGTH = 10

// Round interval: 3600 = hourly (production). Use 120 for testing.
export const ROUND_INTERVAL_SECONDS = 3600

const EST_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
})

/** Get hours, minutes, seconds in EST for a given date. */
function getESTParts(date = new Date()) {
  const parts = EST_FORMATTER.formatToParts(date)
  return {
    hours: parseInt(parts.find((p) => p.type === 'hour').value, 10),
    minutes: parseInt(parts.find((p) => p.type === 'minute').value, 10),
    seconds: parseInt(parts.find((p) => p.type === 'second').value, 10),
  }
}

export function getCurrentHourIndex() {
  const { hours, minutes, seconds } = getESTParts()
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
  const { hours } = getESTParts()
  return hours === 12
}

/** Get hour_index and minutes remaining in round for a given timestamp (EST). */
export function getRoundInfoForTimestamp(timestamp) {
  const d = new Date(timestamp)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts = formatter.formatToParts(d)
  const hours = parseInt(parts.find((p) => p.type === 'hour').value, 10)
  const minutes = parseInt(parts.find((p) => p.type === 'minute').value, 10)
  const seconds = parseInt(parts.find((p) => p.type === 'second').value, 10)
  const hourFromStart = hours >= 12 ? hours - 12 : hours + 12
  const hourIndex = hourFromStart + 1
  const secondsIntoRound = minutes * 60 + seconds
  const minutesRemainingInRound = Math.max(0, (ROUND_INTERVAL_SECONDS - secondsIntoRound) / 60)
  return { hourIndex, minutesRemainingInRound }
}

/** True if a new player can attack in their first round. False if they joined in the last 15 minutes. */
export function canNewPlayerAttackInFirstRound(joinedAt, currentHourIndex) {
  if (!joinedAt) return true
  const { hourIndex: joinedRound, minutesRemainingInRound } = getRoundInfoForTimestamp(joinedAt)
  if (joinedRound !== currentHourIndex) return true
  return minutesRemainingInRound > 15
}

export function getTimeUntilNextHour() {
  const { minutes, seconds } = getESTParts()
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

/** Generate a 5-char recovery code (A-Z excluding I,O,L + 2-9) for device swap */
export function generateRecoveryCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
