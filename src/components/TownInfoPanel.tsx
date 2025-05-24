import React from 'react';
import { calculateTownScore, getTownLevel, TOWN_LEVELS } from '../game/GameMechanics';
import type { Tile } from '../types/game';
import '../styles/TownInfoPanel.css';

interface TownInfoPanelProps {
  tiles: Record<string, Tile> | null | undefined;
}

const TownInfoPanel: React.FC<TownInfoPanelProps> = ({ tiles }) => {
  const score = calculateTownScore(tiles);
  const level = getTownLevel(score);
  
  // Count different tile types with null check
  const tileCounts = tiles ? Object.values(tiles).reduce((counts, tile) => {
    if (tile && tile.type) {
      counts[tile.type] = (counts[tile.type] || 0) + 1;
    }
    return counts;
  }, {} as Record<string, number>) : {};
  
  return (
    <div className="town-info-panel">
      <h3 className="town-name" style={{ color: level.color }}>
        {level.name}
      </h3>
      
      <div className="town-score">
        <span className="score-value">{score}</span> points
      </div>
      
      <div className="town-stats">
        <div className="stat-row">
          <span className="stat-icon">🏠</span>
          <span className="stat-value">{tileCounts.house || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-icon">🏪</span>
          <span className="stat-value">{tileCounts.market || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-icon">🌲</span>
          <span className="stat-value">{tileCounts.forest || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-icon">💧</span>
          <span className="stat-value">{tileCounts.water || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-icon">🛣️</span>
          <span className="stat-value">{tileCounts.road || 0}</span>
        </div>
      </div>
      
      <div className="next-level">
        <div className="progress-label">
          Next level: {level.name === TOWN_LEVELS[TOWN_LEVELS.length-1].name 
            ? 'Max level reached!' 
            : TOWN_LEVELS[TOWN_LEVELS.findIndex(l => l.name === level.name) + 1]?.name}
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{ 
              width: `${getProgressPercentage(score, level)}%`,
              backgroundColor: level.color 
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate progress percentage to next level
const getProgressPercentage = (score: number, currentLevel: typeof TOWN_LEVELS[0]): number => {
  const currentLevelIndex = TOWN_LEVELS.findIndex(l => l.name === currentLevel.name);
  
  // If at max level, return 100%
  if (currentLevelIndex === TOWN_LEVELS.length - 1) {
    return 100;
  }
  
  const nextLevel = TOWN_LEVELS[currentLevelIndex + 1];
  const levelDifference = nextLevel.threshold - currentLevel.threshold;
  const scoreProgress = score - currentLevel.threshold;
  
  return Math.min(100, Math.max(0, (scoreProgress / levelDifference) * 100));
};

export default TownInfoPanel; 