import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchCommanders } from '../services/scryfall';
import type { Commander } from '../models/types';

interface CommanderSearchProps {
  onSelect: (commander: Commander) => void;
  onClose: () => void;
  playerName: string;
}

export const CommanderSearch: React.FC<CommanderSearchProps> = ({ onSelect, onClose, playerName }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Commander[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        // Modal level click-outside logic if needed
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (commanderName: string) => {
    if (commanderName.length < 3) return;
    setQuery(commanderName);
    setLoading(true);
    const data = await searchCommanders(commanderName);
    setResults(data);
    setLoading(false);
  };

  // Use a debounced search effect instead of plain autocomplete to provide pre-filtered results
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        handleSearch(query);
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [query]);

  const onInputChange = (val: string) => {
    setQuery(val);
  };

  return (
    <div className="commander-search-overlay" onClick={onClose}>
      <div className="commander-search-modal" onClick={e => e.stopPropagation()} ref={searchRef}>
        <div className="search-header">
          <h3>Set Commander for {playerName}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Type name (e.g. 'Atraxa')..."
            value={query}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
          />
          <button className="search-action-btn" onClick={() => handleSearch(query)}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </div>

        <div className="search-results">
          {results.map(card => (
            <div key={`${card.name}-${card.artCrop}`} className="result-card" onClick={() => { onSelect(card); onClose(); }}>
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
          overflow: hidden;
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
          max-height: 200px;
          overflow-y: auto;
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
      `}</style>
    </div>
  );
};
