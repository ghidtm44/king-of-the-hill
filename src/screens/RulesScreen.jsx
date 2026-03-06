import { useNavigate } from 'react-router-dom'
import './RulesScreen.css'

export default function RulesScreen() {
  const navigate = useNavigate()

  return (
    <div className="rules-screen">
      <button className="back-btn" onClick={() => navigate('/')}>← BACK</button>
      
      <h1>RULES</h1>
      
      <div className="rules-content">
        <section>
          <h2>WHAT YOU'RE TRYING TO DO</h2>
          <p>Have the most Score at 11:00am EST. Score goes up and down based on fights and items.</p>
        </section>

        <section>
          <h2>YOUR STATS</h2>
          <p><strong>Score</strong></p>
          <ul>
            <li>Starts at 5 at 12:00pm EST (reset daily)</li>
            <li>If your Score hits 0, you're eliminated</li>
          </ul>
          <p><strong>Health (HP)</strong></p>
          <ul>
            <li>Starts at 20 HP</li>
            <li>If your HP hits 0, you're eliminated</li>
            <li>HP exists so combat has stakes without instantly nuking someone's Score.</li>
          </ul>
          <p><strong>Attack / Defense (based on class)</strong></p>
          <ul>
            <li>Attacker: A=7, D=3</li>
            <li>Defender: A=3, D=7</li>
            <li>Balanced: A=5, D=5</li>
          </ul>
          <p>These numbers only change via items.</p>
        </section>

        <section>
          <h2>EACH HOUR = ONE ROUND</h2>
          <p>From HH:00:00 to HH:59:59 you do your actions. At HH:59:59 the game resolves.</p>
        </section>

        <section>
          <h2>WHAT YOU CAN DO DURING THE HOUR</h2>
          <p>Two optional choices:</p>
          <ul>
            <li>Buy or swap 1 item (optional)</li>
            <li>Choose your attacks (optional)</li>
          </ul>
          <p>If you do nothing, the app auto-picks for you.</p>
        </section>

        <section>
          <h2>ATTACKING</h2>
          <p><strong>Step 1 — Attack Tokens</strong></p>
          <p>Each round you have Attack Tokens = your Attack stat (A). You can split them across multiple players.</p>
          <p>Example: If A=5, you can do 2 to Alex, 3 to Sam.</p>
          <p><strong>Step 2 — End of hour: compare total attacks vs defense</strong></p>
          <p>For each defender, add up how many tokens hit them from all attackers:</p>
          <ul>
            <li>Incoming = sum of all tokens aimed at that player</li>
            <li>Damage = max(0, Incoming - Defense)</li>
            <li>If Damage &gt; 0: they lose that much HP</li>
            <li>If Damage = 0: nothing happens to their HP</li>
          </ul>
        </section>

        <section>
          <h2>SCORE CHANGES</h2>
          <p>Score changes in only 3 ways:</p>
          <ol>
            <li><strong>Hourly income:</strong> At the end of every hour, every alive player gets +1 Score.</li>
            <li><strong>Deal damage:</strong> If you deal damage to someone this round, you gain +Damage Score (split proportionally if multiple attackers hit the same target).</li>
            <li><strong>Items cost Score:</strong> When you buy an item, Score decreases by item cost. If you can't afford it, purchase is blocked.</li>
          </ol>
        </section>

        <section>
          <h2>DAMAGE CAP (anti-bullying)</h2>
          <p>A player can lose at most 8 HP per round (even if Damage would be higher). Excess damage is ignored.</p>
        </section>

        <section>
          <h2>AUTO ACTIONS</h2>
          <ul>
            <li><strong>No attacks submitted:</strong> The system automatically spends all your Attack Tokens on a random alive opponent.</li>
            <li><strong>No item chosen:</strong> You keep your current item (or have none).</li>
          </ul>
        </section>

        <section>
          <h2>ITEMS</h2>
          <p>You may hold 1 item at a time. Buying a new one replaces the old one (no refunds).</p>
          <ul>
            <li><strong>Weapon:</strong> +2 Attack (cost 4)</li>
            <li><strong>Shield:</strong> +2 Defense (cost 4)</li>
            <li><strong>Potion:</strong> +5 HP instantly when bought (cost 5)</li>
            <li><strong>Trap:</strong> Reduce damage taken by 2 (cost 6)</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
