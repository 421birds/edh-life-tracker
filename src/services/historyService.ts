import type { GameRecord } from '../models/types';

const HISTORY_KEY = 'edh_game_history';

/**
 * Service to manage game history in localStorage.
 */
export const historyService = {
  /**
   * Retrieves all saved game records from localStorage.
   */
  getHistory(): GameRecord[] {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (err) {
      console.error('Failed to load history:', err);
      return [];
    }
  },

  /**
   * Adds a new game record to history.
   */
  saveGame(record: GameRecord): void {
    const history = this.getHistory();
    // Prepend to show newest first
    const updated = [record, ...history].slice(0, 100); // Limit to last 100 games
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  /**
   * Deletes a specific game by ID.
   */
  deleteGame(id: string): void {
    const history = this.getHistory();
    const updated = history.filter(game => game.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  /**
   * Clears all history.
   */
  clearAll(): void {
    localStorage.removeItem(HISTORY_KEY);
  }
};
