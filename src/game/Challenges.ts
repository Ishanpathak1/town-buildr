import type { Tile } from '../types/game';

export type Challenge = {
  id: string;
  title: string;
  description: string;
  requiredTiles: Record<string, number>;
  reward: number;
  completed: boolean;
};

// Generate random challenges
export const generateChallenges = (): Challenge[] => {
  return [
    {
      id: 'challenge-1',
      title: 'Green City',
      description: 'Build a city with at least 5 forest tiles',
      requiredTiles: { forest: 5 },
      reward: 50,
      completed: false
    },
    {
      id: 'challenge-2',
      title: 'Waterfront Property',
      description: 'Place 3 houses adjacent to water',
      requiredTiles: { house: 3, water: 3 },
      reward: 75,
      completed: false
    },
    {
      id: 'challenge-3',
      title: 'Commercial District',
      description: 'Build 4 markets connected by roads',
      requiredTiles: { market: 4, road: 4 },
      reward: 100,
      completed: false
    },
    {
      id: 'challenge-4',
      title: 'Urban Planning',
      description: 'Create a balanced neighborhood with houses, markets, and greenery',
      requiredTiles: { house: 5, market: 2, grass: 8, road: 6 },
      reward: 150,
      completed: false
    }
  ];
};

// Check if a challenge is completed
export const checkChallengeCompletion = (challenge: Challenge, tiles: Record<string, Tile>): boolean => {
  const tileCounts: Record<string, number> = {
    empty: 0,
    grass: 0,
    forest: 0,
    water: 0,
    house: 0,
    market: 0,
    road: 0
  };
  
  // Count all tiles
  Object.values(tiles).forEach(tile => {
    if (tile && tile.type) {
      tileCounts[tile.type]++;
    }
  });
  
  // Check if we have enough of each required tile type
  for (const [tileType, requiredCount] of Object.entries(challenge.requiredTiles)) {
    if ((tileCounts[tileType] || 0) < requiredCount) {
      return false;
    }
  }
  
  return true;
}; 