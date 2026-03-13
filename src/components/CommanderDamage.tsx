import React, { useState, useEffect } from 'react';
import { useContinuousHold } from '../hooks/useContinuousHold';
import type { Commander } from '../models/types';

interface CommanderDamageProps {
  opponentId: string;
  opponentName: string;
  damageAmount: number;
  onAdd: () => void;
  onSub: () => void;
  colorClass: string;
  onDeltaChange?: (delta: number, label: string) => void;
  lethalThreshold?: number;
  wrapperClass?: string;
  commander?: Commander;
  isAdvancedMode?: boolean;
}

export const CommanderDamage: React.FC<CommanderDamageProps> = ({
  damageAmount,
  onAdd,
  onSub,
  colorClass,
  onDeltaChange,
  lethalThreshold = 21,
  wrapperClass = '',
  commander,
  isAdvancedMode = false,
  opponentId,
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
      const label = opponentId === 'poison' ? 'poison' : 'commander\ndamage';
      onDeltaChange(showDelta ? cmdDelta : 0, label);
    }
  }, [cmdDelta, showDelta, onDeltaChange, opponentId]);

  const getColorStyles = () => {
    if (!isAdvancedMode || opponentId === 'poison') {
      return {};
    }
    
    // In Advanced Mode, all commander damage buttons should have a consistent light gray background.
    return { 
      backgroundColor: '#8c8c8c', 
    };
  };

  return (
    <div 
      className={`cmd-damage-item ${!commander ? colorClass : ''} ${isAdvancedMode ? 'advanced-item' : ''} ${wrapperClass}`}
      style={getColorStyles()}
    >
      <div className="cmd-damage-controls" style={{ position: 'relative', zIndex: 2 }}>
        <button 
          className="cmd-btn cmd-sub" 
          {...subHold.handlers}
          disabled={damageAmount === 0 && !subHold.isPressing}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          -
        </button>
        <div className="cmd-val-container">
          <div className={`cmd-value ${damageAmount >= lethalThreshold ? 'lethal' : ''}`} style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}>
            {damageAmount}
          </div>
        </div>
        <button 
          className="cmd-btn cmd-add" 
          {...addHold.handlers}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          +
        </button>
      </div>
    </div>
  );
};

