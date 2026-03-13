import { useGameState } from './hooks/useGameState';
import { PlayerCard } from './components/PlayerCard';
import { CommanderSearch } from './components/CommanderSearch';
import type { Commander } from './models/types';
import './App.css';
import './App.css';
import { Settings, Sparkles, Users, Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useWakeLock } from './hooks/useWakeLock';

const DicePips = ({ count }: { count: number }) => {
  return (
    <div className={`dice dice-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pip" />
      ))}
    </div>
  );
};

const GameTimer = ({ 
  startTime, 
  isRunning, 
  elapsedBeforePause = 0, 
  currentSegmentStart = null,
  onToggle 
}: { 
  startTime: number | null, 
  isRunning: boolean,
  elapsedBeforePause?: number,
  currentSegmentStart?: number | null,
  onToggle: () => void
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !currentSegmentStart) {
      setElapsed(elapsedBeforePause);
      return;
    }
    
    const update = () => {
      const now = Date.now();
      const segmentElapsed = now - (currentSegmentStart || now);
      setElapsed(elapsedBeforePause + segmentElapsed);
    };
    
    update();
    const interval = setInterval(update, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, currentSegmentStart, elapsedBeforePause]);

  if (!startTime) return null;

  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className={`game-timer ${!isRunning ? 'paused' : ''}`}>
      <div className="timer-val">
        {hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <button 
        className="timer-toggle-btn" 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
      >
        {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
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
    updateTurn,
    setAdvancedMode,
    setCommander,
    startGameTimer,
    toggleTimer
  } = useGameState(4);

  useWakeLock(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerCountMenu, setShowPlayerCountMenu] = useState(false);
  const [searchingPlayerId, setSearchingPlayerId] = useState<string | null>(null);
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
                layoutVariant={gameState.layoutVariant}
                isAdvancedMode={gameState.isAdvancedMode}
                onSearchCommander={() => setSearchingPlayerId(player.id)}
                {...getCardOrientationProps(index, gameState.playerCount)}
              />
            </div>
          );
        })}
      </main>

      {gameState.isAdvancedMode && !gameState.gameStartTime && gameState.players.every(p => p.commander) && (
        <div className="start-game-overlay">
          <button className="start-game-btn" onClick={startGameTimer}>
            START GAME
          </button>
        </div>
      )}

      <div 
        className="center-widget"
        style={{ transform: gameState.playerCount === 4 ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%) rotate(0deg)' }}
      >
        <button className="widget-half widget-top" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={32} />
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
        <div className="settings-overlay" onClick={() => { setShowSettings(false); setShowPlayerCountMenu(false); }}>
          <div className="radial-menu-center" onClick={(e) => e.stopPropagation()}>
            <button className="radial-center-btn" onClick={() => { setShowSettings(false); setShowPlayerCountMenu(false); }}>
              <Settings size={28} />
            </button>
            
            {showPlayerCountMenu ? (
              <>
                <button className="radial-btn radial-left" onClick={() => { setPlayerCount(2); resetGame(); setShowSettings(false); setShowPlayerCountMenu(false); }}>
                  <DicePips count={2} />
                </button>
                <button className="radial-btn radial-top" onClick={() => { setPlayerCount(3); resetGame(); setShowSettings(false); setShowPlayerCountMenu(false); }}>
                  <DicePips count={3} />
                </button>
                <button className="radial-btn radial-right" onClick={() => { setPlayerCount(4, 'default'); resetGame(); setShowSettings(false); setShowPlayerCountMenu(false); }}>
                  <DicePips count={4} />
                </button>
                <button className="radial-btn radial-bottom" onClick={() => { setPlayerCount(4, 'head-to-head'); resetGame(); setShowSettings(false); setShowPlayerCountMenu(false); }}>
                  <div style={{ transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DicePips count={4} />
                  </div>
                </button>
              </>
            ) : (
              <>
                <button className="radial-btn radial-top-left" onClick={() => { setShowPlayerCountMenu(true); }}>
                  <Users size={24} color="#fff" />
                </button>
                <button className={`radial-btn radial-top-right ${gameState.isAdvancedMode ? 'active' : ''}`} onClick={() => { setAdvancedMode(!gameState.isAdvancedMode); setShowSettings(false); }}>
                  <Sparkles size={24} color={gameState.isAdvancedMode ? '#d69e2e' : '#fff'} />
                </button>
                <button className="radial-btn radial-bottom" onClick={() => { resetGame(); setShowSettings(false); }}>
                  <RotateCcw size={24} />
                </button>
              </>
            )}
          </div>

          <div className="menu-timer-container">
            <GameTimer 
              startTime={gameState.gameStartTime ?? null} 
              isRunning={gameState.isTimerRunning ?? false}
              elapsedBeforePause={gameState.elapsedBeforePause}
              currentSegmentStart={gameState.currentSegmentStart}
              onToggle={toggleTimer}
            />
          </div>
        </div>
      )}

      {searchingPlayerId && (
        <CommanderSearch
          playerName={gameState.players.find(p => p.id === searchingPlayerId)?.name || 'Player'}
          onSelect={(commander: Commander) => setCommander(searchingPlayerId, commander)}
          onClose={() => setSearchingPlayerId(null)}
        />
      )}
    </div>
  );
}

export default App;
