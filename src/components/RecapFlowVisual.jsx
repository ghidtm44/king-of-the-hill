import PixelKnight from './PixelKnight'
import './RecapFlowVisual.css'

export default function RecapFlowVisual({ attacks, players, sessionId, roundIndex, compact, pointChanges }) {
  const getName = (sid) => players.find((p) => p.session_id === sid)?.name || '?'
  const getPlayer = (sid) => players.find((p) => p.session_id === sid)

  const byTarget = {}
  ;(attacks || []).forEach((a) => {
    if (!byTarget[a.target_session_id]) byTarget[a.target_session_id] = []
    byTarget[a.target_session_id].push(a)
  })

  const targetOrder = Object.entries(byTarget)
    .map(([tid, arr]) => ({ sessionId: tid, totalAttack: arr.reduce((s, a) => s + a.attack_points_used, 0), count: arr.length }))
    .sort((a, b) => b.totalAttack - a.totalAttack)

  return (
    <div className={`recap-flow ${compact ? 'compact' : ''}`}>
      {!compact && <h4 className="recap-flow-title">Round {roundIndex} — Attack flow</h4>}
      {targetOrder.length === 0 ? (
        <p className="recap-flow-empty">No attacks this round.</p>
      ) : (
        <div className="recap-flow-targets">
          {targetOrder.map(({ sessionId: targetSid, totalAttack, count }) => {
            const targetAttacks = byTarget[targetSid]
            const targetPlayer = getPlayer(targetSid)
            const isMe = targetSid === sessionId

            return (
              <div key={targetSid} className={`recap-flow-target ${isMe ? 'you' : ''}`}>
                <div className="recap-flow-attackers">
                  {targetAttacks.map((a) => {
                    const attacker = getPlayer(a.attacker_session_id)
                    const atkIsMe = a.attacker_session_id === sessionId
                    return (
                      <div key={`${a.attacker_session_id}-${targetSid}`} className="recap-flow-attacker">
                        <div className="recap-flow-attacker-info">
                          <PixelKnight color={attacker?.color || '#888'} size="small" />
                          <span className={atkIsMe ? 'you-label' : ''}>{getName(a.attacker_session_id)}{atkIsMe ? ' (you)' : ''}</span>
                        </div>
                        <span className="recap-flow-value-badge" title="Attack value">{a.attack_points_used}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="recap-flow-arrow">→</div>
                <div className="recap-flow-target-info">
                  <PixelKnight color={targetPlayer?.color || '#888'} size="small" />
                  <span className={isMe ? 'you-label' : ''}>{getName(targetSid)}{isMe ? ' (you)' : ''}</span>
                  <span className="recap-flow-target-stats">{count} attacker{count > 1 ? 's' : ''} · {totalAttack} total</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!compact && (
        <div className="recap-flow-summary">
          <p><strong>You attacked:</strong> {attacks?.filter((a) => a.attacker_session_id === sessionId).length === 0
            ? 'No one'
            : attacks?.filter((a) => a.attacker_session_id === sessionId).map((a) => getName(a.target_session_id)).join(', ')}</p>
          <p><strong>You were attacked by:</strong> {attacks?.filter((a) => a.target_session_id === sessionId).length === 0
            ? 'No one'
            : [...new Set(attacks?.filter((a) => a.target_session_id === sessionId).map((a) => getName(a.attacker_session_id)))].join(', ')}</p>
        </div>
      )}
      {pointChanges && Object.keys(pointChanges).length > 0 && (
        <div className="recap-flow-points">
          <strong>Points:</strong>{' '}
          {Object.entries(pointChanges)
            .sort((a, b) => (b[1] - a[1]))
            .flatMap(([sid, delta], i) => {
              const name = getName(sid)
              const isMe = sid === sessionId
              const label = delta > 0 ? `+${delta}` : String(delta)
              const pts = Math.abs(delta) === 1 ? 'pt' : 'pts'
              const span = (
                <span key={sid} className={isMe ? 'you-label' : ''}>
                  {name}{isMe ? ' (you)' : ''}: {label} {pts}
                </span>
              )
              return i === 0 ? [span] : [', ', span]
            })}
        </div>
      )}
    </div>
  )
}
