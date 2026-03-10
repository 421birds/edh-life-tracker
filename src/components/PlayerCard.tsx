import React, { useState } from 'react';
import type { Player } from '../models/types';
import { CommanderDamage } from './CommanderDamage';
import { useContinuousHold } from '../hooks/useContinuousHold';
import { useCardOrientation } from '../hooks/useCardOrientation';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  opponents: Player[];
  onLifeChange: (amount: number) => void;
  onLifeExact: (amount: number) => void;
  onPoisonChange: (amount: number) => void;
  onCommanderDamageChange: (opponentId: string, amount: number) => void;
  colorClass: string;
  flipVertical: boolean;
  flipHorizontal: boolean;
  forceRotation?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  opponents,
  onLifeChange,
  onLifeExact,
  onPoisonChange,
  onCommanderDamageChange,
  colorClass,
  flipVertical,
  flipHorizontal,
  forceRotation,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { width, height, isLandscape } = useCardOrientation(containerRef);
  // Delta tracking for long press visual feedback
  const [lifeDelta, setLifeDelta] = useState(0);
  const [showDelta, setShowDelta] = useState(false);
  const [trackerDelta, setTrackerDelta] = useState(0);
  const [isEditingLife, setIsEditingLife] = useState(false);
  const [exactLifeInput, setExactLifeInput] = useState(player.life.toString());

  // Wrap the exact setter handle
  const handleLifeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(exactLifeInput, 10);
    if (!isNaN(val)) {
      onLifeExact(val);
    }
    setIsEditingLife(false);
  };

  // Create handlers that also update the visual delta
  const handleAddLife = () => {
    onLifeChange(1);
    setLifeDelta(prev => prev + 1);
    setShowDelta(true);
  };

  const handleSubLife = () => {
    onLifeChange(-1);
    setLifeDelta(prev => prev - 1);
    setShowDelta(true);
  };

  const addHold = useContinuousHold(handleAddLife, 400, 100);
  const subHold = useContinuousHold(handleSubLife, 400, 100);

  // Clear delta when we stop pressing
  React.useEffect(() => {
    if (!addHold.isPressing && !subHold.isPressing && showDelta) {
      const timer = setTimeout(() => {
        setShowDelta(false);
        setLifeDelta(0);
      }, 1000); // Hide delta 1s after letting go
      return () => clearTimeout(timer);
    }
  }, [addHold.isPressing, subHold.isPressing, showDelta]);

  // Hook specifically for long pressing the life total to open numpad
  // We use a custom hook instance for this specific action
  const lifeTotalHold = useContinuousHold(() => {
    setExactLifeInput(player.life.toString());
    setIsEditingLife(true);
  }, 600, 999999); // Huge interval so it only fires once

  // Calculate rotation and absolute structural styling
  let rotation = 0;
  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s ease',
  };

  if (forceRotation !== undefined) {
    rotation = forceRotation;
    if (rotation === 90 || rotation === -90) {
      contentStyle.width = `${height}px`;
      contentStyle.height = `${width}px`;
    } else {
      contentStyle.width = '100%';
      contentStyle.height = '100%';
    }
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  } else if (isLandscape) {
    rotation = flipVertical ? 180 : 0;
    contentStyle.width = '100%';
    contentStyle.height = '100%';
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  } else if (width > 0 && height > 0) {
    rotation = flipHorizontal ? -90 : 90;
    contentStyle.width = `${height}px`;
    contentStyle.height = `${width}px`;
    contentStyle.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  }

  return (
    <div className={`player-card-container ${colorClass}`} ref={containerRef}>
      {/* Rotated Internal Frame */}
      <div style={contentStyle}>
        <div className="life-tracker-arena">
        <button 
          className="life-btn giant-sub" 
          {...subHold.handlers}
        >
        </button>
        
        <div className="center-info-container">
          {showDelta && lifeDelta !== 0 && (
            <div className={`life-delta ${lifeDelta > 0 ? 'positive' : 'negative'}`}>
              {lifeDelta > 0 ? '+' : ''}{lifeDelta}
            </div>
          )}
          {trackerDelta !== 0 && (
            <div className={`life-delta tracker-delta ${trackerDelta > 0 ? 'positive' : 'negative'}`}>
              {trackerDelta > 0 ? '+' : ''}{trackerDelta}
            </div>
          )}

          {isEditingLife ? (
            <form className="life-form" onSubmit={handleLifeSubmit}>
              <input
                type="number"
                pattern="\d*" /* Force numeric keypad on iOS */
                inputMode="numeric"
                autoFocus
                className="life-input"
                value={exactLifeInput}
                onChange={(e) => setExactLifeInput(e.target.value)}
                onBlur={handleLifeSubmit}
              />
            </form>
          ) : (
            <div 
              className={`life-total ${player.life <= 0 ? 'dead' : ''}`}
              {...lifeTotalHold.handlers}
            >
              {player.life}
            </div>
          )}
        </div>

        <button 
          className="life-btn giant-add" 
          {...addHold.handlers}
        >
        </button>
      </div>

      {opponents.length > 0 && (
        <div className="commander-damage-row">
          <div className="cmd-list-horizontal">
            {/* Poison Tracker First */}
            <CommanderDamage
              opponentId="poison"
              opponentName="P"
              damageAmount={player.poison || 0}
              onAdd={() => onPoisonChange(1)}
              onSub={() => onPoisonChange(-1)}
              colorClass="color-fill-poison"
              onDeltaChange={setTrackerDelta}
              lethalThreshold={10}
            />
            {opponents.map((opp) => {
              return (
                <CommanderDamage
                  key={opp.id}
                  opponentId={opp.id}
                  opponentName={opp.name}
                  damageAmount={player.commanderDamage[opp.id] || 0}
                  onAdd={() => onCommanderDamageChange(opp.id, 1)}
                  onSub={() => onCommanderDamageChange(opp.id, -1)}
                  colorClass={`color-fill-${opp.id.split('-')[1]}`} 
                  onDeltaChange={setTrackerDelta}
                />
              )
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
