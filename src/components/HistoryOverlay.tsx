import React, { useState } from 'react';
import { X, ChevronRight, Trash2, Trophy, Clock, Calendar, RotateCcw, History as HistoryIcon } from 'lucide-react';
import { historyService } from '../services/historyService';
import type { GameRecord } from '../models/types';
import './HistoryOverlay.css';

interface HistoryOverlayProps {
  onClose: () => void;
}

export const HistoryOverlay: React.FC<HistoryOverlayProps> = ({ onClose }) => {
  const [history, setHistory] = useState<GameRecord[]>(() => historyService.getHistory());
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this game record?')) {
      historyService.deleteGame(id);
      setHistory(historyService.getHistory());
      if (selectedGame?.id === id) setSelectedGame(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-container" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <button className="back-btn" onClick={selectedGame ? () => setSelectedGame(null) : onClose}>
            {selectedGame ? '← Back' : <X size={24} />}
          </button>
          <h2>{selectedGame ? 'Game Details' : 'Match History'}</h2>
          {!selectedGame && history.length > 0 && (
            <button className="clear-all-btn" onClick={() => {
              if (window.confirm('Clear all history?')) {
                historyService.clearAll();
                setHistory([]);
              }
            }}>
              Clear
            </button>
          )}
        </div>

        <div className="history-content">
          {selectedGame ? (
            <div className="game-detail-view">
              <div className="detail-meta">
                <div className="meta-item">
                  <Calendar size={18} />
                  <span>{formatDate(selectedGame.timestamp)}</span>
                </div>
                <div className="meta-item">
                  <Clock size={18} />
                  <span>Started: {formatTime(selectedGame.timestamp)}</span>
                </div>
                <div className="meta-item">
                  <Clock size={18} />
                  <span>Duration: {formatDuration(selectedGame.duration)}</span>
                </div>
                <div className="meta-item">
                  <RotateCcw size={18} />
                  <span>Turns: {selectedGame.turnCount}</span>
                </div>
              </div>

              <div className="detail-players">
                {[...selectedGame.players].sort((a, b) => {
                  const orderA = selectedGame.turnOrder?.indexOf(a.id) ?? 0;
                  const orderB = selectedGame.turnOrder?.indexOf(b.id) ?? 0;
                  return orderA - orderB;
                }).map(player => (
                  <div key={player.id} className={`detail-player-card ${player.isWinner ? 'winner' : 'defeated'}`}>
                    <div className="player-main">
                      {player.isWinner && <Trophy size={20} className="winner-icon" />}
                      <div className="player-info">
                        <span className="player-name">{player.name}</span>
                        <span className="player-commander">{player.commander?.name || 'No Commander'}</span>
                      </div>
                      <div className="player-stats">
                        <span className="player-life">{player.finalLife} HP</span>
                      </div>
                    </div>
                    
                    {!player.isWinner && player.deathTurn && (
                      <div className="player-death-info">
                        Defeated on Turn {player.deathTurn} by {
                          player.deathCause === 'life' ? 'loss of life' : 
                          player.deathCause === 'commander-damage' ? 'commander damage' :
                          player.deathCause === 'alt-win-con' ? 'alt win con' :
                          player.deathCause?.replace('-', ' ')
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-history">
              <HistoryIcon size={48} className="empty-icon" />
              <p>No games recorded yet.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map(game => (
                <div key={game.id} className="history-item" onClick={() => setSelectedGame(game)}>
                  <div className="item-left">
                    <span className="item-date">{formatDate(game.timestamp)}</span>
                    <span className="item-players">
                      {game.players.map((p, idx) => (
                        <React.Fragment key={idx}>
                          <span className={p.isWinner ? 'winner-name' : ''}>{p.name}</span>
                          {idx < game.players.length - 1 ? ', ' : ''}
                        </React.Fragment>
                      ))}
                    </span>
                    <div className="item-meta-row">
                      <span className="item-turns">{game.turnCount} turns</span>
                      <span className="item-dot">•</span>
                      <span className="item-duration">{formatDuration(game.duration)}</span>
                    </div>
                  </div>
                  <div className="item-right">
                    <button className="delete-btn" onClick={e => handleDelete(e, game.id)}>
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
