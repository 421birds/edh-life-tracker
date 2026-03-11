import { useState, useCallback, useEffect } from 'react';
import type { GameState, Player } from '../models/types';

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  life: 40, // Standard starting life for Commander
  poison: 0,
  commanderDamage: {},
});

// Helper to generate initial players
const generateInitialPlayers = (count: number): Player[] => {
  return Array.from({ length: count }).map((_, i) =>
    createPlayer(`player-${i + 1}`, `Player ${i + 1}`)
  );
};

export const useGameState = (initialPlayerCount: number = 4) => {
  const [gameState, setGameState] = useState<GameState>(() => {
    // Try to load from session storage if available
    const saved = sessionStorage.getItem('edh-life-tracker-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
         console.error("Failed to parse saved game state");
      }
    }
    return {
      players: generateInitialPlayers(initialPlayerCount),
      playerCount: initialPlayerCount,
      turn: 1,
    };
  });

  // Save to session storage on change
  useEffect(() => {
    sessionStorage.setItem('edh-life-tracker-state', JSON.stringify(gameState));
  }, [gameState]);

  const updateLife = useCallback((playerId: string, amount: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, life: p.life + amount } : p
      ),
    }));
  }, []);

  const setLifeExact = useCallback((playerId: string, exactLife: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, life: exactLife } : p
      ),
    }));
  }, []);

  const updatePoison = useCallback((playerId: string, amount: number) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id === playerId) {
          const currentPoison = p.poison || 0;
          return { ...p, poison: Math.max(0, currentPoison + amount) };
        }
        return p;
      }),
    }));
  }, []);

  const updateTurn = useCallback((amount: number) => {
    setGameState((prev) => ({
      ...prev,
      turn: Math.max(1, prev.turn + amount)
    }));
  }, []);

  const updateCommanderDamage = useCallback(
    (targetPlayerId: string, opponentId: string, amount: number) => {
      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.id === targetPlayerId) {
            const currentDamage = p.commanderDamage[opponentId] || 0;
            const newDamage = Math.max(0, currentDamage + amount); // Should not go below 0
            
            // Note: In MTG, commander damage is also loss of life.
            // If we want to strictly follow rules, adding commander damage should also subtract life.
            return {
              ...p,
              life: p.life - amount, // Taking damage decreases life. Subtracting damage increases life? Usually we just track damage, but let's assume it automatically hits life.
              commanderDamage: {
                ...p.commanderDamage,
                [opponentId]: newDamage,
              },
            };
          }
          return p;
        }),
      }));
    },
    []
  );

  const setPlayerCount = useCallback((count: number, variant: 'default' | 'head-to-head' = 'default') => {
    // Only 2, 3, or 4 are allowed
    const validCount = Math.max(MIN_PLAYERS, Math.min(count, MAX_PLAYERS));
    setGameState(prev => {
      let newPlayers = [...prev.players];
      if (validCount > prev.players.length) {
        // Add players
        for (let i = prev.players.length; i < validCount; i++) {
          newPlayers.push(createPlayer(`player-${i + 1}`, `Player ${i + 1}`));
        }
      } else if (validCount < prev.players.length) {
        // Remove players
        newPlayers = newPlayers.slice(0, validCount);
      }
      return {
        ...prev,
        players: newPlayers,
        playerCount: validCount,
        layoutVariant: variant,
      };
    });
  }, []);

  const updatePlayerName = useCallback((playerId: string, newName: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, name: newName } : p
      ),
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      players: generateInitialPlayers(prev.playerCount),
      turn: 1,
    }));
  }, []);

  return {
    gameState,
    updateLife,
    setLifeExact,
    updatePoison,
    updateCommanderDamage,
    setPlayerCount,
    updatePlayerName,
    resetGame,
    updateTurn,
  };
};
