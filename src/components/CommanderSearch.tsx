import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchCommanders } from '../services/scryfall';
import type { Commander } from '../models/types';

interface CommanderSearchProps {
  onSelect: (name: string, commander: Commander) => void;
  onClose: () => void;
  initialName?: string;
}

const STORAGE_KEY = 'edh_player_names';

const getSuggestions = (): string[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveName = (name: string) => {
  if (!name.trim()) return;
  const names = getSuggestions();
  if (!names.includes(name)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([name, ...names].slice(0, 20)));
  }
};

export const CommanderSearch: React.FC<CommanderSearchProps> = ({ onSelect, onClose, initialName = '' }) => {
  const [step, setStep] = useState<'name' | 'commander'>(initialName ? 'commander' : 'name');
  const [name, setName] = useState(initialName);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Commander[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(getSuggestions());
  }, []);

  const handleSearch = async (commanderName: string) => {
    if (commanderName.length < 3) return;
    setLoading(true);
    const data = await searchCommanders(commanderName);
    setResults(data);
    setLoading(false);
  };

  useEffect(() => {
    if (step === 'commander' && query.length >= 3) {
      const timer = setTimeout(() => {
        handleSearch(query);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [query, step]);

  const handleNameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (name.trim()) {
      saveName(name);
      setStep('commander');
    }
  };


  return (
    <div className="commander-search-overlay" onClick={onClose}>
      <div className="commander-search-modal" onClick={e => e.stopPropagation()} ref={searchRef}>
        <div className="search-header">
          <h3>{step === 'name' ? 'Enter Player Name' : `Search Commander for ${name}`}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {step === 'name' ? (
          <div className="name-input-section">
            <form onSubmit={handleNameSubmit} className="search-input-wrapper">
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Player name..."
                  value={name}
                  onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  autoFocus
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="suggestions-list">
                    {suggestions
                      .filter(s => s.toLowerCase().includes(name.toLowerCase()))
                      .map(s => (
                        <div 
                          key={s} 
                          className="suggestion-item" 
                          onClick={() => { setName(s); setShowSuggestions(false); }}
                        >
                          {s}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <button className="search-action-btn" onClick={() => handleNameSubmit()}>NEXT</button>
            </form>
          </div>
        ) : (
          <>
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Type name (e.g. 'Atraxa')..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
                autoFocus
              />
              <button className="search-action-btn" onClick={() => handleSearch(query)}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              </button>
            </div>

            <div className="search-results">
              {results.map(card => (
                <div key={`${card.name}-${card.artCrop}`} className="result-card" onClick={() => { onSelect(name, card); onClose(); }}>
                  {card.artCrop && (
                    <div className="result-art" style={{ backgroundImage: `url(${card.artCrop})` }} />
                  )}
                  <div className="result-info">
                    <span className="result-name">{card.name}</span>
                  </div>
                </div>
              ))}
              {!loading && results.length === 0 && query.length >= 3 && (
                <div className="no-results">No commanders found matching "{query}"</div>
              )}
            </div>
            <button className="back-to-name-btn" onClick={() => setStep('name')}>Change Name</button>
          </>
        )}
      </div>

      <style>{`
        .commander-search-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: auto !important; /* Allow interaction */
        }
        .commander-search-modal {
          width: 90%;
          max-width: 500px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          max-height: 80vh;
          overflow: visible; /* Allow suggestions list to overflow modal */
        }
        .search-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #333;
        }
        .search-header h3 { margin: 0; font-size: 1.1rem; color: #fff; }
        .close-btn { background: none; border: none; color: #888; cursor: pointer; }
        
        .search-input-wrapper {
          padding: 16px;
          position: relative;
          display: flex;
          gap: 8px;
        }
        .search-input-wrapper input {
          flex: 1;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 6px;
          padding: 10px 12px;
          color: #fff;
          font-size: 1rem;
        }
        .search-action-btn {
          background: #3182ce;
          border: none;
          border-radius: 6px;
          padding: 0 12px;
          color: #fff;
        }

        .suggestions-list {
          position: absolute;
          top: 100%;
          left: 16px;
          right: 56px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-top: none;
          z-index: 10;
          max-height: 250px;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border-radius: 0 0 8px 8px;
        }
        .suggestion-item {
          padding: 10px 12px;
          border-bottom: 1px solid #333;
          cursor: pointer;
          color: #ddd;
        }
        .suggestion-item:hover { background: #333; }

        .search-results {
          flex: 1;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 16px;
        }
        .result-card {
          background: #222;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid #333;
          transition: border-color 0.2s;
        }
        .result-card:hover { border-color: #3182ce; }
        .result-art {
          height: 100px;
          background-size: cover;
          background-position: center;
        }
        .result-info { padding: 8px; text-align: center; }
        .result-name { font-size: 0.9rem; font-weight: bold; color: #fff; }
        
        .no-results {
          grid-column: span 2;
          text-align: center;
          color: #888;
          padding: 20px;
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .back-to-name-btn {
          margin: 0 16px 16px;
          background: none;
          border: 1px solid #444;
          color: #888;
          padding: 8px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};
