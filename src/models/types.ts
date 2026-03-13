export interface Commander {
  name: string;
  artCrop: string;
  colorIdentity: string[];
}

export interface Player {
  id: string;
  name: string;
  life: number;
  poison?: number;
  commanderDamage: Record<string, number>; // Maps opponent player.id to damage received from them
  color?: string; // Optional theme color for the player
  commander?: Commander; // Optional commander metadata for advanced mode
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
