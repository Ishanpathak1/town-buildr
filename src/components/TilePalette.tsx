import React from 'react';
import type { TileType } from '../types/game';
import '../styles/TilePalette.css';

interface TilePaletteProps {
  selectedTile: TileType;
  onSelectTile: (tile: TileType) => void;
}

const TilePalette: React.FC<TilePaletteProps> = ({ selectedTile, onSelectTile }) => {
  const tileTypes: TileType[] = ['grass', 'forest', 'house', 'market', 'water', 'road', 'empty'];
  
  const TILE_ICONS: Record<TileType, string> = {
    grass: '🌿',
    forest: '🌲',
    house: '🏠',
    market: '🏪',
    water: '💧',
    road: '🛣️',
    empty: '❌'
  };
  
  return (
    <div className="tile-palette">
      <h3>Tile Palette</h3>
      <div className="tile-options">
        {tileTypes.map(type => (
          <button
            key={type}
            className={`tile-button ${selectedTile === type ? 'selected' : ''}`}
            onClick={() => onSelectTile(type)}
          >
            <span className="tile-icon">{TILE_ICONS[type]}</span>
            <span className="tile-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TilePalette; 