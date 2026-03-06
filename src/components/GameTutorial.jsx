import { useState } from 'react'
import './GameTutorial.css'

const STEPS = [
  {
    title: 'Welcome to Wolfpack Warriors',
    body: 'You\'re in the arena. Here\'s a quick tour of your battle station.',
  },
  {
    title: 'Actions & Stance',
    body: 'Scavenge once per round for bonus pts or risk. Pick a stance: Aggressive (+1 attack), Defensive (+1 defense), or Greedy (+1 pt if you survive).',
  },
  {
    title: 'Choose Your Target',
    body: 'Tap a player in the target list to attack them—your choice saves instantly. Tap another to switch. No target = no attack. The Rankings show who you\'re targeting.',
  },
  {
    title: 'Rankings & Store',
    body: 'Tap players in Rankings to see their history. Buy items (Sword, Shield, Armor, Potion) to boost your stats. Items last 3 rounds.',
  },
  {
    title: 'Round Recap',
    body: 'Check the attack flow to see who attacked who each round. Team up on targets—combined attacks deal more damage!',
  },
]

export default function GameTutorial({ onComplete }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1

  return (
    <div className="game-tutorial-overlay">
      <div className="game-tutorial-modal">
        <div className="game-tutorial-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={`tutorial-dot ${i <= step ? 'active' : ''}`} />
          ))}
        </div>
        <h3 className="game-tutorial-title">{STEPS[step].title}</h3>
        <p className="game-tutorial-body">{STEPS[step].body}</p>
        <div className="game-tutorial-actions">
          {step > 0 ? (
            <button type="button" className="tutorial-btn secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {isLast ? (
            <button type="button" className="tutorial-btn primary" onClick={onComplete}>
              Let&apos;s Play
            </button>
          ) : (
            <button type="button" className="tutorial-btn primary" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
