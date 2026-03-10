import React, { useState } from 'react';
import { Player } from '../models/types';
import { CommanderDamage } from './CommanderDamage';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  opponents: Player[]; // All other players to track commander damage from
  onLifeChange: (amount: number) => void;
  onCommanderDamageChange: (opponentId: string, amount: number) => void;
  onNameChange: (newName: string) => void;
  colorClass: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  opponents,
  onLifeChange,
  onCommanderDamageChange,
  onNameChange,
  colorClass,
}) => {
  const [showCommanderDamage, setShowCommanderDamage] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(player.name);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    } else {
      setTempName(player.name);
    }
    setIsEditingName(false);
  };

  return (
    <div className={`player-card-container glass-panel ${colorClass}`}>
      <div className="player-header">
        {isEditingName ? (
          <form className="name-form" onSubmit={handleNameSubmit}>
            <input
              autoFocus
              className="name-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSubmit}
            />
          </form>
        ) : (
          <div className="player-name" onClick={() => setIsEditingName(true)}>
            {player.name}
          </div>
        )}
        <button 
          className={`toggle-cmd-btn ${showCommanderDamage ? 'active' : ''}`}
          onClick={() => setShowCommanderDamage(!showCommanderDamage)}
          title="Toggle Commander Damage"
        >
          ⚔️
        </button>
      </div>

      <div className="life-tracker-arena">
        <button className="life-btn giant-sub" onClick={() => onLifeChange(-1)}>
          -
        </button>
        <div className={`life-total ${player.life <= 0 ? 'dead' : ''}`}>
          {player.life}
        </div>
        <button className="life-btn giant-add" onClick={() => onLifeChange(1)}>
          +
        </button>
      </div>
      
      {/* Optional +5/-5 buttons for quick changes */}
      <div className="quick-life-controls">
        <button className="quick-btn sub" onClick={() => onLifeChange(-5)}>-5</button>
        <button className="quick-btn add" onClick={() => onLifeChange(5)}>+5</button>
      </div>

      {showCommanderDamage && opponents.length > 0 && (
        <div className="commander-damage-section fade-in">
          <div className="cmd-header">Commander Damage Received</div>
          <div className="cmd-list">
            {opponents.map((opp) => (
              <CommanderDamage
                key={opp.id}
                opponentId={opp.id}
                opponentName={opp.name}
                damageAmount={player.commanderDamage[opp.id] || 0}
                onAdd={() => onCommanderDamageChange(opp.id, 1)}
                onSub={() => onCommanderDamageChange(opp.id, -1)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
