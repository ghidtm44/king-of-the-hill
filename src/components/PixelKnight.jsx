import './PixelKnight.css'

export default function PixelKnight({ color = '#c41e3a', size = 'medium' }) {
  return (
    <div className={`pixel-knight ${size}`} style={{ '--knight-color': color }}>
      <div className="knight-body">
        <div className="knight-head"></div>
        <div className="knight-torso"></div>
        <div className="knight-legs"></div>
        <div className="knight-sword"></div>
        <div className="knight-shield"></div>
      </div>
    </div>
  )
}
