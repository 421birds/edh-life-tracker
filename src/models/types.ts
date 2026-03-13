export interface Commander {
  name: string;
  artCrop: string;
  colorIdentity: string[];
}

export interface Player {
  id: string;
  name: string;
  life: number;
  poison: number; // Changed from optional to required
  commanderDamage: Record<string, number>; // Maps opponent player.id to damage received from them
  color: string; // Changed from optional to required
  commander?: Commander; // Optional commander metadata for advanced mode
  deathStatus?: {
    turn: number;
    cause: 'life' | 'poison' | 'commander-damage' | 'conceded' | 'mill' | 'alt-win-con';
  } | null;
}

export interface GameState {
  players: Player[];
  playerCount: number;
  layoutVariant?: 'default' | 'head-to-head';
  turn: number;
  isAdvancedMode: boolean;
  gameStartTime?: number | null; // Keep for legacy/initial start ref if needed, but we'll use below
  isTimerRunning?: boolean;
  elapsedBeforePause?: number;
  currentSegmentStart?: number | null;
}

export interface PlayerHistorySummary {
  id: string;
  name: string;
  commander: Commander | null;
  finalLife: number;
  isWinner: boolean;
  deathTurn?: number;
  deathCause?: 'life' | 'poison' | 'commander-damage' | 'conceded' | 'mill' | 'alt-win-con';
}

export interface GameRecord {
  id: string;
  timestamp: number; // Start time (unix)
  endTime: number; // End time (unix)
  duration: number; // Total ms
  playerCount: number;
  isAdvancedMode: boolean;
  players: PlayerHistorySummary[];
}
