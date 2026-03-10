import React from 'react';
import './CommanderDamage.css';

interface CommanderDamageProps {
  opponentId: string;
  opponentName: string;
  damageAmount: number;
  onAdd: () => void;
  onSub: () => void;
}

export const CommanderDamage: React.FC<CommanderDamageProps> = ({
  opponentName,
  damageAmount,
  onAdd,
  onSub,
}) => {
  return (
    <div className="cmd-damage-row glass-panel">
      <div className="cmd-name">{opponentName}</div>
      <div className="cmd-controls">
        <button className="cmd-btn sub" onClick={onSub} disabled={damageAmount === 0}>
           -
        </button>
        <div className={`cmd-value ${damageAmount >= 21 ? 'lethal' : ''}`}>
          {damageAmount}
        </div>
        <button className="cmd-btn add" onClick={onAdd}>
          +
        </button>
      </div>
    </div>
  );
};
