import { useGameState } from './hooks/useGameState';
import { PlayerCard } from './components/PlayerCard';
import './App.css';
import { Settings } from 'lucide-react';
import { useState } from 'react';

function App() {
  const {
    gameState,
    updateLife,
    updateCommanderDamage,
    setPlayerCount,
    updatePlayerName,
    resetGame,
  } = useGameState(4);

  const [showSettings, setShowSettings] = useState(false);

  // Helper to determine CSS grid layout class based on player count
  const getGridLayoutClass = (count: number) => {
    switch (count) {
      case 1: return 'grid-1';
      case 2: return 'grid-2';
      case 3: return 'grid-3';
      case 4: return 'grid-4';
      case 5: return 'grid-5';
      case 6: return 'grid-6';
      default: return 'grid-4';
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Grid Layout */}
      <main className={`player-grid ${getGridLayoutClass(gameState.playerCount)}`}>
        {gameState.players.map((player, index) => {
          // Get all OTHER players to track commander damage from them
          const opponents = gameState.players.filter((p) => p.id !== player.id);
          
          return (
            <div key={player.id} className="player-wrapper">
              <PlayerCard
                player={player}
                opponents={opponents}
                colorClass={`color-${index % 6}`}
                onLifeChange={(amount) => updateLife(player.id, amount)}
                onCommanderDamageChange={(oppId, amount) => updateCommanderDamage(player.id, oppId, amount)}
                onNameChange={(newName) => updatePlayerName(player.id, newName)}
              />
            </div>
          );
        })}
      </main>

      {/* Center Settings / Menu button (floating) */}
      <button 
        className="settings-toggle-btn glass-panel" 
        onClick={() => setShowSettings(!showSettings)}
      >
        <Settings size={28} />
      </button>

      {/* Settings Overlay */}
      {showSettings && (
        <div className="settings-overlay fade-in">
          <div className="settings-modal glass-panel">
            <h2>Game Settings</h2>
            
            <div className="setting-group">
              <label>Player Count: {gameState.playerCount}</label>
              <div className="player-count-controls">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button 
                    key={num}
                    className={`count-btn ${gameState.playerCount === num ? 'active' : ''}`}
                    onClick={() => setPlayerCount(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <button className="reset-btn" onClick={() => {
                if (window.confirm("Are you sure you want to reset the game? All life totals will return to 40.")) {
                  resetGame();
                  setShowSettings(false);
                }
              }}>
                Reset Game
              </button>
            </div>

            <button className="close-btn" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
