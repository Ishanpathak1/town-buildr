import type { TileType } from '../types/game';

export type SpecialTile = {
  id: string;
  name: string;
  description: string;
  baseType: TileType;
  bonusScore: number;
  effect: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
};

// Special tile database
export const SPECIAL_TILES: SpecialTile[] = [
  {
    id: 'ancient-tree',
    name: 'Ancient Tree',
    description: 'A thousand-year-old tree that provides extra harmony to surrounding tiles',
    baseType: 'forest',
    bonusScore: 15,
    effect: 'Provides +3 score to all adjacent tiles',
    rarity: 'rare'
  },
  {
    id: 'crystal-lake',
    name: 'Crystal Lake',
    description: 'A pristine lake with healing properties',
    baseType: 'water',
    bonusScore: 20,
    effect: 'Doubles the score of adjacent forest tiles',
    rarity: 'rare'
  },
  {
    id: 'town-hall',
    name: 'Town Hall',
    description: 'The central administrative building of your town',
    baseType: 'house',
    bonusScore: 25,
    effect: 'Increases score of all road tiles by 50%',
    rarity: 'legendary'
  },
  {
    id: 'farmers-market',
    name: 'Farmers Market',
    description: 'A vibrant market where locals sell fresh produce',
    baseType: 'market',
    bonusScore: 15,
    effect: 'Adjacent grass tiles provide double score',
    rarity: 'uncommon'
  }
];

// Chance to get a special tile when placing a regular tile (1-5%)
export const getRandomSpecialTile = (baseType: TileType): SpecialTile | null => {
  const randomChance = Math.random() * 100;
  
  // 5% chance to get a special tile
  if (randomChance > 95) {
    // Filter special tiles by base type
    const possibleTiles = SPECIAL_TILES.filter(tile => tile.baseType === baseType);
    
    if (possibleTiles.length > 0) {
      // Random selection weighted by rarity
      const rarityWeights = {
        common: 0.6,
        uncommon: 0.3,
        rare: 0.08,
        legendary: 0.02
      };
      
      // Weight the selection
      const weightedTiles = possibleTiles.map(tile => ({
        tile,
        weight: rarityWeights[tile.rarity]
      }));
      
      // Calculate total weight
      const totalWeight = weightedTiles.reduce((sum, item) => sum + item.weight, 0);
      
      // Random selection based on weight
      let random = Math.random() * totalWeight;
      for (const item of weightedTiles) {
        random -= item.weight;
        if (random <= 0) {
          return item.tile;
        }
      }
      
      return possibleTiles[0]; // Fallback
    }
  }
  
  return null;
}; 