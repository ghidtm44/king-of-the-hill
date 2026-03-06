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
          <p>Wolfpack Warriors is a daily strategy game. Compete over 24 hours to finish with the most Points while staying alive. The game resets at 12:00 PM EST.</p>
          <p>Every hour is one round. Pick a target to attack. When the round ends, attacks are resolved and points are awarded. Highest points at the end of the 24 hours wins.</p>
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
          <p>Tap a player to attack them—your choice saves immediately. Tap another to switch, or tap the same one to clear. No target = no attack that round.</p>
        </section>

        <section>
          <h2>COMBAT</h2>
          <p>When the round ends, attacks are resolved:</p>
          <ol>
            <li>For each target, add up all attackers' Attack values.</li>
            <li>Damage = Total Attack − Defense (capped at 5 per round).</li>
            <li>If damage &gt; 0: target loses HP. If damage = 0: target blocks.</li>
          </ol>
        </section>

        <section>
          <h2>POINTS (End of Round)</h2>
          <p>Everyone gets these:</p>
          <ul>
            <li><strong>+1</strong> for surviving the round</li>
          </ul>
          <p>If you attacked:</p>
          <ul>
            <li><strong>+1</strong> if you dealt damage (+2 if target was the Bounty)</li>
            <li><strong>−1</strong> if you dealt 0 damage (target blocked)</li>
          </ul>
          <p>If you were attacked:</p>
          <ul>
            <li><strong>+1</strong> if you blocked (took 0 damage)</li>
            <li><strong>−1</strong> if you took any HP damage</li>
          </ul>
          <p>Points can be spent on items.</p>
        </section>

        <section>
          <h2>BOUNTY</h2>
          <p>The player with the most Points is the Bounty (🎯). Hitting them gives +2 pts if they take damage. But if they block, each attacker loses 1 HP.</p>
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
          <p>Hold 1 item at a time. Buying a new one replaces the old. Items last 3 rounds and are not refundable.</p>
          <ul>
            <li><strong>Sword:</strong> +1 {ICON_ATK} (4 pts)</li>
            <li><strong>Shield:</strong> +1 {ICON_DEF} (4 pts)</li>
            <li><strong>Armor:</strong> Reduce incoming damage by 1 (6 pts)</li>
            <li><strong>Potion:</strong> Restore 5 HP (5 pts)</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
