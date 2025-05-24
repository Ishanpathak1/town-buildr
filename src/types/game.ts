export type TileType = 'grass' | 'forest' | 'house' | 'market' | 'water' | 'road' | 'empty';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  placed_by: string | null;
  id?: string;
}

export interface Player {
  id: string;
  cursor: {
    x: number;
    y: number;
  };
  lastPlaced?: number; // timestamp for cooldown
  score?: number;
  streakCount?: number;
  achievementsCompleted?: string[];
}

export interface GameState {
  tiles: Record<string, Tile>;
  players: Record<string, Player>;
  selectedTile: TileType;
  boardSize: {
    width: number;
    height: number;
  };
  mysteryTiles?: Record<string, MysteryTile>;
  townScore?: number;
  achievements?: MicroAchievement[];
  dailyChallenges?: MicroAchievement[];
}

export interface VoteEvent {
  id: string;
  name: string;
  votes: number;
  active: boolean;
}

export interface MysteryTile {
  name: string;
  description: string;
  bonusMultiplier: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  color: string;
}

export interface MicroAchievement {
  id: string;
  name: string;
  description: string;
  rewardAmount: number;
  isComplete: boolean;
  progress?: number; // Optional progress percentage
  target?: number;   // Optional target number
  icon: string;
  claimed?: boolean; // Whether the reward has been claimed
}

export interface TownLevel {
  name: string;
  minScore: number;
  maxScore: number;
  description: string;
  color: string;
}

export interface Streak {
  count: number;
  multiplier: number;
  timeRemaining: number; // in ms
} 