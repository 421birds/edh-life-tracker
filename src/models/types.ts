export interface Player {
  id: string;
  name: string;
  life: number;
  poison?: number;
  commanderDamage: Record<string, number>; // Maps opponent player.id to damage received from them
  color?: string; // Optional theme color for the player
}

export interface GameState {
  players: Player[];
  playerCount: number;
  turn: number;
}
