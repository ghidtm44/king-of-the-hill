import './HealthBar.css'

export default function HealthBar({ current, max = 20, showLabel = true, compact = false }) {
  const displayCurrent = Math.min(Math.max(0, current), max)
  const pct = max > 0 ? (displayCurrent / max) * 100 : 0
  const isLow = displayCurrent <= max * 0.3

  return (
    <div className={`health-bar-wrap ${compact ? 'compact' : ''}`}>
      <div className={`health-bar ${isLow ? 'low' : ''}`} title={`${displayCurrent}/${max} HP`}>
        <div className="health-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="health-bar-label">{displayCurrent}/{max}</span>}
    </div>
  )
}
