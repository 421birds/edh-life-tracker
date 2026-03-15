import { useState, useCallback, useEffect } from 'react';
import type { GameState, Player, Commander, GameRecord, PlayerHistorySummary } from '../models/types';
import { historyService } from '../services/historyService';

const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

const createPlayer = (id: string, name: string): Player => ({
  id,
  name,
  life: 40,
  poison: 0,
  commanderDamage: {},
  color: '#222', // Default color, will be overridden by theme/artwork
  deathStatus: null,
});

// Helper to generate initial players
const generateInitialPlayers = (count: number, existingPlayers: Player[] = []): Player[] => {
  return Array.from({ length: count }).map((_, i) => {
    const id = `player-${i + 1}`;
    const existing = existingPlayers.find(p => p.id === id);
    return createPlayer(id, existing?.name || `Player ${i + 1}`);
  });
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
      isAdvancedMode: false,
      gameStartTime: null,
      isTimerRunning: false,
      elapsedBeforePause: 0,
      currentSegmentStart: null,
      firstPlayerId: null,
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
      players: generateInitialPlayers(prev.playerCount, prev.players),
      turn: 1,
      gameStartTime: null,
      isTimerRunning: false,
      elapsedBeforePause: 0,
      currentSegmentStart: null,
      firstPlayerId: null,
    }));
  }, []);

  const confirmDeath = useCallback((playerId: string, cause: 'life' | 'poison' | 'commander-damage' | 'conceded' | 'mill' | 'alt-win-con') => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, deathStatus: { turn: prev.turn, cause } } : p
      ),
    }));
  }, []);

  const revivePlayer = useCallback((playerId: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, deathStatus: null } : p
      ),
    }));
  }, []);

  const endGame = useCallback(() => {
    if (!gameState.gameStartTime) return;

    const endTime = Date.now();
    const totalElapsed = (gameState.elapsedBeforePause || 0) + 
      (gameState.isTimerRunning && gameState.currentSegmentStart ? (endTime - gameState.currentSegmentStart) : 0);

    const players: PlayerHistorySummary[] = gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      commander: p.commander || null,
      finalLife: p.life,
      isWinner: !p.deathStatus,
      deathTurn: p.deathStatus?.turn,
      deathCause: p.deathStatus?.cause,
    }));

    const turnOrder = getTurnOrder(gameState.players, gameState.firstPlayerId || gameState.players[0].id, gameState.layoutVariant || 'default');

    const record: GameRecord = {
      id: crypto.randomUUID(),
      timestamp: gameState.gameStartTime,
      endTime,
      duration: totalElapsed,
      playerCount: gameState.playerCount,
      isAdvancedMode: gameState.isAdvancedMode,
      players,
      turnCount: gameState.turn,
      turnOrder,
    };

    historyService.saveGame(record);
    resetGame();
  }, [gameState, resetGame]);

  // Helper to determine clockwise order based on layout
  const getTurnOrder = (players: Player[], startId: string, layout: 'default' | 'head-to-head'): string[] => {
    const count = players.length;
    let baseOrder: number[] = [];

    if (count === 4) {
      if (layout === 'head-to-head') {
        // [0, 2, 3, 1] (Top -> Right -> Bottom -> Left)
        baseOrder = [0, 2, 3, 1];
      } else {
        // [0, 1, 3, 2] (TL -> TR -> BR -> BL)
        baseOrder = [0, 1, 3, 2];
      }
    } else if (count === 3) {
      // [0, 1, 2] (Left -> Right -> Bottom)
      baseOrder = [0, 1, 2];
    } else {
      // 2 players: [0, 1]
      baseOrder = [0, 1];
    }

    const playerIdsByVisualOrder = baseOrder.map(idx => players[idx].id);
    const startIdx = playerIdsByVisualOrder.indexOf(startId);
    
    // Shift the order to start with startId
    return [
      ...playerIdsByVisualOrder.slice(startIdx),
      ...playerIdsByVisualOrder.slice(0, startIdx)
    ];
  };

  const setFirstPlayer = useCallback((playerId: string | null) => {
    setGameState(prev => ({ ...prev, firstPlayerId: playerId }));
  }, []);

  const startGameTimer = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      gameStartTime: prev.gameStartTime || Date.now(),
      currentSegmentStart: Date.now(),
      isTimerRunning: true,
      elapsedBeforePause: prev.elapsedBeforePause || 0,
    }));
  }, []);

  const toggleTimer = useCallback(() => {
    setGameState(prev => {
      if (prev.isTimerRunning) {
        // Pause
        const addedElapsed = prev.currentSegmentStart ? (Date.now() - prev.currentSegmentStart) : 0;
        return {
          ...prev,
          isTimerRunning: false,
          elapsedBeforePause: (prev.elapsedBeforePause || 0) + addedElapsed,
          currentSegmentStart: null,
        };
      } else {
        // Resume
        if (!prev.gameStartTime) {
          // If it was never started, this is a start
          return {
            ...prev,
            gameStartTime: Date.now(),
            currentSegmentStart: Date.now(),
            isTimerRunning: true,
            elapsedBeforePause: 0,
          };
        }
        return {
          ...prev,
          isTimerRunning: true,
          currentSegmentStart: Date.now(),
        };
      }
    });
  }, []);

  const setAdvancedMode = useCallback((enabled: boolean) => {
    setGameState(prev => ({ ...prev, isAdvancedMode: enabled }));
  }, []);

  const setCommander = useCallback((playerId: string, commander: Commander | undefined) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId ? { ...p, commander } : p
      )
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
    setAdvancedMode,
    setCommander,
    startGameTimer,
    toggleTimer,
    confirmDeath,
    revivePlayer,
    endGame,
    setFirstPlayer,
  };
};
