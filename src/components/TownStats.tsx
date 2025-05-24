import React from 'react';
import { 
  calculateTownScore, 
  getCurrentTownLevel, 
  getProgressToNextLevel,
  TOWN_LEVELS
} from '../game/GameMechanics';
import type { Tile, MysteryTile } from '../types/game';
import '../styles/TownStats.css';

interface TownStatsProps {
  tiles: Record<string, Tile>;
  mysteryTiles: Record<string, MysteryTile>;
}

const TownStats: React.FC<TownStatsProps> = ({ tiles, mysteryTiles }) => {
  // Calculate current town score
  const score = calculateTownScore(tiles, mysteryTiles);
  
  // Get current town level
  const currentLevel = getCurrentTownLevel(score);
  
  // Calculate progress to next level
  const progressPercent = getProgressToNextLevel(score);
  
  // Determine next level (if any)
  const currentLevelIndex = TOWN_LEVELS.findIndex(level => level.name === currentLevel.name);
  const nextLevel = currentLevelIndex < TOWN_LEVELS.length - 1 
    ? TOWN_LEVELS[currentLevelIndex + 1] 
    : null;
  
  // Count different tile types
  const tileCounts: Record<string, number> = {};
  Object.values(tiles).forEach(tile => {
    tileCounts[tile.type] = (tileCounts[tile.type] || 0) + 1;
  });
  
  return (
    <div className="town-stats">
      <div className="town-level">
        <h3>{currentLevel.name}</h3>
        <p className="town-description">{currentLevel.description}</p>
      </div>
      
      <div className="town-score">
        <span className="score-label">Town Score:</span>
        <span className="score-value">{score}</span>
      </div>
      
      {nextLevel && (
        <div className="level-progress">
          <div className="progress-text">
            <span>Next Level: {nextLevel.name}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: currentLevel.color
              }}
            />
          </div>
          <div className="progress-points">
            <span>{score}/{nextLevel.minScore} points</span>
          </div>
        </div>
      )}
      
      <div className="tile-stats">
        <h4>Town Composition</h4>
        <div className="tile-counts">
          {Object.entries(tileCounts).map(([type, count]) => (
            <div key={type} className="tile-count">
              <span className="tile-type">{type}</span>
              <span className="tile-count-value">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {Object.keys(mysteryTiles).length > 0 && (
        <div className="mystery-tiles">
          <h4>Special Discoveries</h4>
          <div className="mystery-list">
            {Object.values(mysteryTiles).map((tile, index) => (
              <div key={index} className="mystery-item" style={{ borderColor: tile.color }}>
                <span className="mystery-name">{tile.name}</span>
                <span className="mystery-bonus">×{tile.bonusMultiplier}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TownStats; 