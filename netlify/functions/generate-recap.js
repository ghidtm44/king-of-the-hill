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
      prompt = `You are a whimsical medieval bard narrating a battle arena recap. Write a fun, personalized 2-3 sentence recap for ${playerName} about what happened in the last round. Use a playful medieval tone with words like "valiant," "foe," "strike," "fortune," etc. Be specific to their experience.

Round data: ${JSON.stringify(roundData)}

Keep it light, engaging, and under 100 words.`
    } else {
      prompt = `You are a whimsical medieval bard narrating an epic battle arena saga. Write a fun, engaging recap of the entire game so far for ${playerName}. Use a playful medieval tone. Summarize the key moments, battles, and fortunes. Be dramatic but lighthearted.

Game data: ${JSON.stringify(gameData)}

Keep it to 4-6 sentences. Make it feel like an epic tale.`
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
