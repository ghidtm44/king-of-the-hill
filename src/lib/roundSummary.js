const API_URL = '/.netlify/functions/generate-recap'
const isNetlify = () => typeof window !== 'undefined' && window.location.hostname?.includes('netlify')

async function callOpenAIDirect(prompt) {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

async function tryServerless(type, playerName, data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      playerName,
      roundData: type === 'last_round' ? data : undefined,
      gameData: type === 'full_game' ? data : undefined,
    }),
  })
  const json = await res.json()
  if (res.ok && json.recap) return json.recap
  throw new Error(json.error || 'Serverless failed')
}

export async function generateRoundRecap(playerName, roundData) {
  if (isNetlify()) {
    try {
      return await tryServerless('last_round', playerName, roundData)
    } catch {
      /* fall through to direct */
    }
  }
  const prompt = `You are a whimsical medieval bard. Write a fun 2-3 sentence recap for ${playerName} about the last round. Game: single-target attacks, Damage = Total Attack - Defense, Bounty gives +2 pts or counterattacks if blocked. Data: ${JSON.stringify(roundData)}. Under 100 words.`
  return callOpenAIDirect(prompt)
}

export async function generateGameRecap(playerName, gameData) {
  if (isNetlify()) {
    try {
      return await tryServerless('full_game', playerName, gameData)
    } catch {
      /* fall through to direct */
    }
  }
  const prompt = `You are a whimsical medieval bard. Write a 4-6 sentence epic recap of the entire game for ${playerName}. Game: hourly rounds, single-target attacks, Bounty system. Data: ${JSON.stringify(gameData)}.`
  return callOpenAIDirect(prompt)
}
