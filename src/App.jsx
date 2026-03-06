import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainScreen from './screens/MainScreen'
import CharacterCreate from './screens/CharacterCreate'
import GameScreen from './screens/GameScreen'
import RulesScreen from './screens/RulesScreen'
import HallOfFameScreen from './screens/HallOfFameScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/create" element={<CharacterCreate />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/rules" element={<RulesScreen />} />
        <Route path="/hall-of-fame" element={<HallOfFameScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
