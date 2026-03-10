import { useState, useCallback, useEffect } from 'react';
import type { Player, GameState } from '../models/types';

// Helper to generate initial players
const generateInitialPlayers = (count: number): Player[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `player-${i + 1}`,
    name: `Player ${i + 1}`,
    life: 40, // Standard starting life for Commander
    poison: 0,
    commanderDamage: {},
  }));
};

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

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

  const setPlayerCount = useCallback((count: number) => {
    const newCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, count));
    setGameState((prev) => {
      let newPlayers = [...prev.players];
      if (newCount > prev.playerCount) {
        // Add new players
        const playersToAdd = newCount - prev.playerCount;
        for (let i = 0; i < playersToAdd; i++) {
          const nextIndex = prev.playerCount + i + 1;
          newPlayers.push({
            id: `player-${nextIndex}`,
            name: `Player ${nextIndex}`,
            life: 40,
            poison: 0,
            commanderDamage: {},
          });
        }
      } else if (newCount < prev.playerCount) {
        // Remove players
        newPlayers = newPlayers.slice(0, newCount);
      }
      return {
        ...prev,
        players: newPlayers,
        playerCount: newCount,
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
