import { useNavigate, useLocation } from 'react-router-dom'
import { ICON_ATK, ICON_DEF } from '../lib/gameLogic'
import './RulesScreen.css'

export default function RulesScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromGame = location.state?.from === 'game'

  return (
    <div className="rules-screen">
      <button className="back-btn" onClick={() => navigate(fromGame ? '/game' : '/')}>← BACK</button>
      
      <h1>RULES</h1>
      
      <div className="rules-content">
        <section>
          <h2>GOAL</h2>
          <p>Wolfpack Warriors is a simple daily strategy game where players compete over a 24-hour period to finish with the most Points while staying alive.</p>
          <p>Every hour, players choose one opponent to attack. If enough players attack the same target, that player takes damage. If their Health reaches zero, they're eliminated from the game. Survive longer, make smart attacks, and you'll climb the leaderboard.</p>
          <p>Points come from successful attacks and surviving each round, and can also be spent on items that help you fight or stay alive. The player with the most points becomes the Bounty, making them a more valuable — and more dangerous — target.</p>
          <p>The game resets every day at 12:00 PM EST, so each round is a fresh chance to claim the hill.</p>
        </section>

        <section>
          <h2>YOUR STATS</h2>
          <p><strong>Points</strong> — Start at 5. Used for ranking and buying items.</p>
          <p><strong>Health (HP)</strong> — Start at 15. If HP hits 0, you're eliminated.</p>
          <p><strong>Class</strong></p>
          <ul>
            <li>Attacker: 3 {ICON_ATK}, 1 {ICON_DEF}</li>
            <li>Balanced: 2 {ICON_ATK}, 2 {ICON_DEF}</li>
            <li>Defender: 1 {ICON_ATK}, 3 {ICON_DEF}</li>
          </ul>
        </section>

        <section>
          <h2>EACH ROUND</h2>
          <p>Tap a player to attack them—your choice saves immediately. Tap another to switch, or tap the same one to clear. No target? You attack randomly.</p>
        </section>

        <section>
          <h2>COMBAT</h2>
          <p>For each target: add up all attackers' Attack values. Damage = Total Attack − Defense (capped at 5 per round).</p>
          <p>If damage &gt; 0: target loses HP. Each attacker gets +1 Point (+2 if it was the Bounty).</p>
        </section>

        <section>
          <h2>BOUNTY</h2>
          <p>The player with the most Points is the Bounty (🎯). Hitting them gives +2 pts if they take damage. But if they block (take 0 damage), each attacker loses 1 HP.</p>
        </section>

        <section>
          <h2>POINTS</h2>
          <ul>
            <li>+1 for surviving each round</li>
            <li>+1 for dealing damage (+2 if Bounty)</li>
            <li>Spend points on items</li>
          </ul>
        </section>

        <section>
          <h2>SCAVENGE</h2>
          <p>Once per round. Tap for a random result: 40% +1 pt, 5% +3 pts, 40% nothing, 15% -1 HP.</p>
        </section>

        <section>
          <h2>STANCE</h2>
          <p>Pick one each round:</p>
          <ul>
            <li><strong>Aggressive:</strong> +1 {ICON_ATK}</li>
            <li><strong>Defensive:</strong> +1 {ICON_DEF}</li>
            <li><strong>Greedy:</strong> +1 pt if you survive</li>
          </ul>
        </section>

        <section>
          <h2>ITEMS</h2>
          <p>Hold 1 item at a time. Buying a new one replaces the old.</p>
          <ul>
            <li><strong>Sword:</strong> +1 {ICON_ATK} (4 pts)</li>
            <li><strong>Shield:</strong> +1 {ICON_DEF} (4 pts)</li>
            <li><strong>Armor:</strong> Reduce incoming damage by 1 (6 pts)</li>
            <li><strong>Potion:</strong> Restore 5 HP (5 pts)</li>
          </ul>
          <p>Items last 3 rounds, then are removed. No refunds.</p>
        </section>
      </div>
    </div>
  )
}
