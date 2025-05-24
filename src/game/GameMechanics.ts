import type { Tile, TileType } from '../types/game';

// Base scoring values for each tile type
export const TILE_BASE_SCORES: Record<TileType, number> = {
  empty: 0,
  grass: 1,
  forest: 3,
  house: 5,
  market: 8,
  water: 4,
  road: 2,
};

// Define scoring values for different tile types
export const TILE_SCORES: Record<string, number> = {
  empty: 0,
  grass: 1,
  forest: 2,
  water: 3,
  house: 5,
  market: 7,
  road: 2
};

// Define which tiles work well together (adjacency bonuses)
export const TILE_SYNERGIES: Record<string, string[]> = {
  empty: [],
  grass: ['house', 'market'],
  forest: ['house', 'water'],
  water: ['forest', 'house'],
  house: ['market', 'road', 'grass', 'forest', 'water'],
  market: ['house', 'road'],
  road: ['house', 'market']
};

// Town levels based on score
export const TOWN_LEVELS = [
  { name: "Tiny Settlement", threshold: 0, color: "#6c757d" },
  { name: "Small Village", threshold: 50, color: "#28a745" },
  { name: "Growing Town", threshold: 150, color: "#17a2b8" },
  { name: "Bustling City", threshold: 300, color: "#007bff" },
  { name: "Metropolis", threshold: 500, color: "#dc3545" },
  { name: "Mega City", threshold: 1000, color: "#ffc107" }
];

// Adjacency bonus rules
type AdjacencyRule = {
  primary: TileType;
  adjacent: TileType;
  bonus: number;
  description: string;
};

export const ADJACENCY_RULES: AdjacencyRule[] = [
  { primary: 'house', adjacent: 'market', bonus: 3, description: "Houses near markets get more value" },
  { primary: 'house', adjacent: 'forest', bonus: 2, description: "Houses with forest views are desirable" },
  { primary: 'house', adjacent: 'water', bonus: 4, description: "Waterfront properties are valuable" },
  { primary: 'market', adjacent: 'road', bonus: 3, description: "Markets need good road access" },
  { primary: 'forest', adjacent: 'forest', bonus: 1, description: "Connected forests form healthier ecosystems" },
  { primary: 'water', adjacent: 'water', bonus: 1, description: "Connected water forms larger lakes" },
  { primary: 'road', adjacent: 'road', bonus: 1, description: "Connected roads form transportation networks" },
];

// Mystery tile chances (percentage)
export const MYSTERY_TILE_CHANCE = 15; // 15% chance of getting a mystery tile

// Mystery tile types
export interface MysteryTile {
  name: string;
  description: string;
  bonusMultiplier: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  color: string;
}

export const MYSTERY_TILES: MysteryTile[] = [
  {
    name: "Golden Tile",
    description: "Doubles the score of adjacent tiles",
    bonusMultiplier: 2.0,
    rarity: 'uncommon',
    color: '#ffd700'
  },
  {
    name: "Magic Fountain",
    description: "Triples the score of adjacent water tiles",
    bonusMultiplier: 3.0,
    rarity: 'rare',
    color: '#00ffff'
  },
  {
    name: "Ancient Oak",
    description: "Gives massive bonuses to adjacent forest tiles",
    bonusMultiplier: 4.0,
    rarity: 'rare',
    color: '#228b22'
  },
  {
    name: "Town Square",
    description: "Increases value of all surrounding tiles",
    bonusMultiplier: 2.5,
    rarity: 'uncommon',
    color: '#ff7f50'
  },
  {
    name: "Legendary Monument",
    description: "Massively increases town prestige and all tile values",
    bonusMultiplier: 5.0,
    rarity: 'legendary',
    color: '#9932cc'
  }
];

// Streaks
export interface Streak {
  count: number;
  multiplier: number;
  timeRemaining: number; // in ms
}

// Get a random mystery tile based on rarity
export const getRandomMysteryTile = (): MysteryTile | null => {
  // First, determine if we should get a mystery tile at all
  const roll = Math.random() * 100;
  if (roll > MYSTERY_TILE_CHANCE) {
    return null;
  }

  // Determine rarity
  const rarityRoll = Math.random() * 100;
  let rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  
  if (rarityRoll < 1) {
    rarity = 'legendary'; // 1% chance
  } else if (rarityRoll < 10) {
    rarity = 'rare'; // 9% chance
  } else if (rarityRoll < 40) {
    rarity = 'uncommon'; // 30% chance
  } else {
    rarity = 'common'; // 60% chance
  }

  // Filter tiles by rarity and pick one
  const possibleTiles = MYSTERY_TILES.filter(tile => tile.rarity === rarity);
  if (possibleTiles.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * possibleTiles.length);
  return possibleTiles[randomIndex];
};

// Calculate score for a single tile considering adjacency bonuses
export const calculateTileScore = (
  tile: Tile,
  allTiles: Record<string, Tile>,
  mysteryTiles: Record<string, MysteryTile> = {}
): number => {
  // Base score for this tile type
  let score = TILE_BASE_SCORES[tile.type];
  
  // Check if this is a mystery tile and apply its own bonus
  const tileKey = `${tile.x}-${tile.y}`;
  if (mysteryTiles[tileKey]) {
    score *= mysteryTiles[tileKey].bonusMultiplier;
  }
  
  // Check adjacent tiles for bonuses
  const adjacentPositions = [
    { x: tile.x - 1, y: tile.y },     // Left
    { x: tile.x + 1, y: tile.y },     // Right
    { x: tile.x, y: tile.y - 1 },     // Top
    { x: tile.x, y: tile.y + 1 },     // Bottom
  ];
  
  // Check each adjacent position
  for (const pos of adjacentPositions) {
    const adjacentKey = `${pos.x}-${pos.y}`;
    const adjacentTile = allTiles[adjacentKey];
    
    // Skip if no tile at this position
    if (!adjacentTile) continue;
    
    // Check for adjacency bonuses
    for (const rule of ADJACENCY_RULES) {
      if (tile.type === rule.primary && adjacentTile.type === rule.adjacent) {
        score += rule.bonus;
      }
    }
    
    // Check if adjacent to a mystery tile and apply its bonus
    if (mysteryTiles[adjacentKey]) {
      score *= mysteryTiles[adjacentKey].bonusMultiplier;
    }
  }
  
  return score;
};

// Calculate total town score
export const calculateTownScore = (tiles: Record<string, Tile> | null | undefined): number => {
  // If tiles is null or undefined, return 0
  if (!tiles) {
    return 0;
  }
  
  let score = 0;
  
  // First pass: base scores for each tile
  Object.values(tiles).forEach(tile => {
    if (tile && tile.type) {
      score += TILE_SCORES[tile.type] || 0;
    }
  });
  
  // Second pass: adjacency bonuses
  Object.values(tiles).forEach(tile => {
    if (!tile || !tile.type || tile.type === 'empty') return;
    
    // Check all adjacent tiles for synergies
    const adjacentPositions = [
      `${tile.x+1}-${tile.y}`, // right
      `${tile.x-1}-${tile.y}`, // left
      `${tile.x}-${tile.y+1}`, // down
      `${tile.x}-${tile.y-1}`, // up
    ];
    
    for (const pos of adjacentPositions) {
      const adjacentTile = tiles[pos];
      if (adjacentTile && adjacentTile.type) {
        // Check if there's a synergy
        if (TILE_SYNERGIES[tile.type].includes(adjacentTile.type)) {
          score += 2; // Synergy bonus
        }
      }
    }
  });
  
  return score;
};

// Get current town level based on score
export const getTownLevel = (score: number) => {
  for (let i = TOWN_LEVELS.length - 1; i >= 0; i--) {
    if (score >= TOWN_LEVELS[i].threshold) {
      return TOWN_LEVELS[i];
    }
  }
  return TOWN_LEVELS[0];
};

// Calculate progress to next level (as a percentage)
export const getProgressToNextLevel = (score: number): number => {
  const currentLevel = getTownLevel(score);
  // If at max level, return 100%
  if (currentLevel.threshold === Infinity) return 100;
  
  const levelProgress = score - currentLevel.threshold;
  const levelRange = Infinity - currentLevel.threshold;
  return Math.min(100, Math.floor((levelProgress / levelRange) * 100));
};

// Define micro-achievements
export interface MicroAchievement {
  id: string;
  name: string;
  description: string;
  rewardAmount: number;
  isComplete: boolean;
  progress?: number; // Optional progress percentage
  target?: number;   // Optional target number
  icon: string;
}

// Generate random daily challenges
export const generateDailyChallenges = (): MicroAchievement[] => {
  const challenges: MicroAchievement[] = [
    {
      id: `daily-${Date.now()}-1`,
      name: "Forest Ranger",
      description: "Place 3 forest tiles",
      rewardAmount: 15,
      isComplete: false,
      progress: 0,
      target: 3,
      icon: "🌲"
    },
    {
      id: `daily-${Date.now()}-2`,
      name: "Home Builder",
      description: "Place 2 house tiles",
      rewardAmount: 20,
      isComplete: false,
      progress: 0,
      target: 2,
      icon: "🏠"
    },
    {
      id: `daily-${Date.now()}-3`,
      name: "Town Planner",
      description: "Place 5 tiles of any type",
      rewardAmount: 25,
      isComplete: false,
      progress: 0,
      target: 5,
      icon: "🏙️"
    }
  ];
  
  return challenges;
}; 