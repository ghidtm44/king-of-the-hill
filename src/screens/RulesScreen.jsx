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
          <h2>PREMISE</h2>
          <p>A daily game of point accumulation. The goal is to have the most points at the end of the 24-hour period.</p>
        </section>

        <section>
          <h2>PHASES</h2>
          <ul>
            <li><strong>12pm EST:</strong> Game begins, all characters reset</li>
            <li><strong>First 59:59 of each hour:</strong> Make your choices (attacks, items)</li>
            <li><strong>Last second of each hour:</strong> Results are evaluated</li>
            <li><strong>11am EST:</strong> Winner is crowned!</li>
          </ul>
        </section>

        <section>
          <h2>CHARACTERS</h2>
          <ul>
            <li><strong>Attacker (7/3):</strong> 7 attack, 3 defense</li>
            <li><strong>Defender (3/7):</strong> 3 attack, 7 defense</li>
            <li><strong>Balanced (5/5):</strong> 5 attack, 5 defense</li>
          </ul>
          <p>Choose a name (max 10 chars) and color. Start anytime—but the later you join, the harder to win!</p>
        </section>

        <section>
          <h2>COMBAT</h2>
          <p>Each hour, allocate your attack points against other players. You can split attacks across multiple targets.</p>
          <ul>
            <li><strong>If total attack against you &gt; your defense:</strong> You take (attack - defense) as damage to your 50 health points</li>
            <li><strong>If total attack against you &lt; your defense:</strong> You gain (defense - attack) points!</li>
            <li>No selection? You attack a random player.</li>
          </ul>
        </section>

        <section>
          <h2>ITEMS</h2>
          <ul>
            <li>One item at a time. Items cost points.</li>
            <li>No refunds when switching items.</li>
            <li>Can't buy if it would eliminate you (points go to zero).</li>
          </ul>
        </section>

        <section>
          <h2>ELIMINATION</h2>
          <p>When your points reach zero, you're out. Good luck, warrior!</p>
        </section>
      </div>
    </div>
  )
}
