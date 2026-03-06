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

export const STARTING_POINTS = 10
export const MAX_HEALTH = 50
export const MAX_PLAYERS = 10
export const MAX_NAME_LENGTH = 10

// EST timezone helpers
export function getCurrentHourIndex() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const seconds = est.getSeconds()
  
  // Game runs 12pm to 11am next day (23 hours)
  let hourIndex = hours - 12
  if (hourIndex < 0) hourIndex += 24
  
  return { hourIndex, minutes, seconds, isEvaluationSecond: minutes === 59 && seconds === 59 }
}

export function isGameActive() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = est.getHours()
  const minutes = est.getMinutes()
  
  // 12pm = hour 12, 11am = hour 11
  if (hours === 11 && minutes >= 0) return false // Game ended at 11am
  if (hours < 12) return false // Before noon
  return true
}

export function getTimeUntilNextHour() {
  const now = new Date()
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const secondsLeft = 59 - est.getSeconds()
  const minutesLeft = 59 - est.getMinutes()
  return { minutes: minutesLeft, seconds: secondsLeft }
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}
