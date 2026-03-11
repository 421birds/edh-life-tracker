import React, { useState, useEffect } from 'react';
import { useContinuousHold } from '../hooks/useContinuousHold';

interface CommanderDamageProps {
  opponentId: string;
  opponentName: string;
  damageAmount: number;
  onAdd: () => void;
  onSub: () => void;
  colorClass: string;
  onDeltaChange?: (delta: number) => void;
  lethalThreshold?: number;
}

export const CommanderDamage: React.FC<CommanderDamageProps> = ({
  damageAmount,
  onAdd,
  onSub,
  colorClass,
  onDeltaChange,
  lethalThreshold = 21,
}) => {
  const [cmdDelta, setCmdDelta] = useState(0);
  const [showDelta, setShowDelta] = useState(false);

  const handleAdd = () => {
    onAdd();
    setCmdDelta(prev => prev + 1);
    setShowDelta(true);
  };

  const handleSub = () => {
    if (damageAmount <= 0) return;
    onSub();
    setCmdDelta(prev => prev - 1);
    setShowDelta(true);
  };

  const addHold = useContinuousHold(handleAdd, 400, 100);
  const subHold = useContinuousHold(handleSub, 400, 100);

  // Clear delta when pressing stops
  useEffect(() => {
    if (!addHold.isPressing && !subHold.isPressing && showDelta) {
      const timer = setTimeout(() => {
        setShowDelta(false);
        setCmdDelta(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [addHold.isPressing, subHold.isPressing, showDelta]);

  useEffect(() => {
    if (onDeltaChange) {
      onDeltaChange(showDelta ? cmdDelta : 0);
    }
  }, [cmdDelta, showDelta, onDeltaChange]);

  return (
    <div className={`cmd-damage-item ${colorClass}`}>
      <div className="cmd-damage-controls">
        <button 
          className="cmd-btn cmd-sub" 
          {...subHold.handlers}
          disabled={damageAmount === 0 && !subHold.isPressing}
        >
          -
        </button>
        <div className="cmd-val-container">
          <div className={`cmd-value ${damageAmount >= lethalThreshold ? 'lethal' : ''}`}>
            {damageAmount}
          </div>
        </div>
        <button 
          className="cmd-btn cmd-add" 
          {...addHold.handlers}
        >
          +
        </button>
      </div>
    </div>
  );
};
