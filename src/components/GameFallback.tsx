import React from 'react';
import type { TileType } from '../types/game';

interface GameFallbackProps {
  selectedTile: TileType;
  onSelectTile: (tile: TileType) => void;
}

const GameFallback: React.FC<GameFallbackProps> = ({ selectedTile, onSelectTile }) => {
  // Create a simple grid for the fallback
  const grid = [];
  const size = 10; // Smaller grid for fallback
  
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      row.push(
        <div 
          key={`${x}-${y}`} 
          className="fallback-cell"
          onClick={() => console.log(`Clicked cell ${x},${y}`)}
        />
      );
    }
    grid.push(<div key={y} className="fallback-row">{row}</div>);
  }
  
  return (
    <div className="game-fallback">
      <div className="fallback-message">
        <h3>Simple Mode</h3>
        <p>The fancy game renderer couldn't be loaded, so here's a simple version.</p>
        <p>Current tile: <span className="current-tile">{selectedTile}</span></p>
      </div>
      <div className="fallback-grid">
        {grid}
      </div>
    </div>
  );
};

export default GameFallback; 