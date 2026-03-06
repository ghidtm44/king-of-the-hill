export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY not configured' }) }
  }

  try {
    const { type, playerName, roundData, gameData } = JSON.parse(event.body || '{}')

    let prompt
    if (type === 'last_round') {
      prompt = `You are a whimsical medieval bard narrating a battle arena recap. Write a fun, personalized 2-3 sentence recap for ${playerName} about what happened in the last round.

Game mechanics: Players choose one target per round. Damage = Total Attack - Defense (capped at 5). The highest-points player is the Bounty; attacking the bounty gives +2 pts if they take damage, but if they block (take 0 damage) each attacker loses 1 HP. All survivors get +1 pt per round.

Round data: ${JSON.stringify(roundData)}

Use a playful medieval tone. Be specific to their experience. Keep it under 100 words.`
    } else {
      prompt = `You are a whimsical medieval bard narrating an epic battle arena saga. Write a fun, engaging recap of the entire game so far for ${playerName}.

Game mechanics: Hourly rounds, single-target attacks, Damage = Total Attack - Defense (cap 5). Bounty (highest pts) gives +2 pts for successful hits but counterattacks (1 HP) if blocked. Survivors get +1 pt/round.

Game data: ${JSON.stringify(gameData)}

Use a playful medieval tone. Summarize key moments, battles, fortunes. Keep it to 4-6 sentences.`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return { statusCode: response.status, body: JSON.stringify({ error: err }) }
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim() || 'No recap generated.'

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recap: text }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
