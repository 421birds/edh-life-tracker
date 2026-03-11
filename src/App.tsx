import { useGameState } from './hooks/useGameState';
import { PlayerCard } from './components/PlayerCard';
import './App.css';
import './App.css';
import { Settings } from 'lucide-react';
import { useState, useRef } from 'react';

const DicePips = ({ count }: { count: number }) => {
  return (
    <div className={`dice dice-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pip" />
      ))}
    </div>
  );
};

function App() {
  const {
    gameState,
    updateLife,
    updateCommanderDamage,
    setPlayerCount,
    resetGame,
    setLifeExact,
    updatePoison,
    updateTurn
  } = useGameState(4);

  const [showSettings, setShowSettings] = useState(false);
  const [showFourPlayerOptions, setShowFourPlayerOptions] = useState(false);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Turn tracking handlers via double-tap / single-tap detection
  const handleTurnClick = () => {
    if (clickTimeoutRef.current !== null) {
      // Double tap detected
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      updateTurn(-1);
    } else {
      // Single tap pending
      clickTimeoutRef.current = setTimeout(() => {
        updateTurn(1);
        clickTimeoutRef.current = null;
      }, 300); // 300ms buffer for double-tap
    }
  };

  const getGridLayoutClass = (count: number) => {
    switch (count) {
      case 2: return 'grid-2';
      case 3: return 'grid-3';
      case 4: return gameState.layoutVariant === 'head-to-head' ? 'grid-4-h2h' : 'grid-4';
      default: return 'grid-4';
    }
  };

  // Determine base orientation rules by position within the grid layout
  const getCardOrientationProps = (index: number, total: number) => {
    let flipVertical = false;
    let flipHorizontal = false;
    let forceRotation: number | undefined = undefined;

    if (total === 2) {
      forceRotation = index === 0 ? 180 : 0;
    } else if (total === 3) {
      if (index === 0) forceRotation = 90;
      if (index === 1) forceRotation = -90;
      if (index === 2) forceRotation = 0;   // Down
    } else if (total === 4) {
      if (gameState.layoutVariant === 'head-to-head') {
        if (index === 0) forceRotation = 180; // Top faces Up
        if (index === 1) forceRotation = 90;  // Mid-Left faces Left (Outwards)
        if (index === 2) forceRotation = -90; // Mid-Right faces Right (Outwards)
        if (index === 3) forceRotation = 0;   // Bottom faces Down
      } else {
        if (index < 2) flipVertical = true; 
        if (index % 2 !== 0) flipHorizontal = true;
      }
    }

    return { flipVertical, flipHorizontal, forceRotation };
  };

  return (
    <div className="app-container">
      <main className={`player-grid ${getGridLayoutClass(gameState.playerCount)}`}>
        {gameState.players.map((player, index) => {
          const opponents = gameState.players.filter((p) => p.id !== player.id);
          
          return (
            <div key={player.id} className="player-wrapper">
              <PlayerCard
                player={player}
                opponents={opponents}
                colorClass={`color-${index}`}
                onLifeChange={(amount) => updateLife(player.id, amount)}
                onLifeExact={(amount) => setLifeExact(player.id, amount)}
                onPoisonChange={(amount) => updatePoison(player.id, amount)}
                onCommanderDamageChange={(oppId, amount) => updateCommanderDamage(player.id, oppId, amount)}
                {...getCardOrientationProps(index, gameState.playerCount)}
              />
            </div>
          );
        })}
      </main>

      <div 
        className="center-widget"
        style={{ transform: gameState.playerCount === 4 ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%) rotate(0deg)' }}
      >
        <button className="widget-half widget-top" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={38} />
        </button>
        <div className="widget-divider" />
        <button 
          className="widget-half widget-bottom" 
          onClick={handleTurnClick}
        >
          <span className="turn-label">T{gameState.turn}</span>
        </button>
      </div>

      {showSettings && (
        <div className="settings-overlay" onClick={() => { setShowSettings(false); setShowFourPlayerOptions(false); }}>
          <div className="radial-menu-center" onClick={(e) => e.stopPropagation()}>
            <button className="radial-center-btn" onClick={() => { setShowSettings(false); setShowFourPlayerOptions(false); }}>
              <Settings size={28} />
            </button>
            
            {showFourPlayerOptions ? (
              <>
                <button className="radial-btn radial-top" onClick={() => { setPlayerCount(4, 'default'); resetGame(); setShowSettings(false); setShowFourPlayerOptions(false); }}>
                  <DicePips count={4} />
                </button>
                <button className="radial-btn radial-bottom" onClick={() => { setPlayerCount(4, 'head-to-head'); resetGame(); setShowSettings(false); setShowFourPlayerOptions(false); }}>
                  <div style={{ transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DicePips count={4} />
                  </div>
                </button>
              </>
            ) : (
              <>
                <button className="radial-btn radial-top" onClick={() => { setPlayerCount(3); resetGame(); setShowSettings(false); }}>
                  <DicePips count={3} />
                </button>
                <button className="radial-btn radial-right" onClick={() => { setShowFourPlayerOptions(true); }}>
                  <DicePips count={4} />
                </button>
                <button className="radial-btn radial-left" onClick={() => { setPlayerCount(2); resetGame(); setShowSettings(false); }}>
                  <DicePips count={2} />
                </button>
                <button className="radial-btn radial-bottom" onClick={() => { resetGame(); setShowSettings(false); }}>
                  ⟲
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
