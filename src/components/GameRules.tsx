import React, { useState } from 'react';
import { 
  TILE_BASE_SCORES, 
  ADJACENCY_RULES,
  MYSTERY_TILE_CHANCE,
  MYSTERY_TILES,
  TOWN_LEVELS
} from '../game/GameMechanics';
import '../styles/GameRules.css';

const GameRules: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`game-rules ${isOpen ? 'open' : ''}`}>
      <button 
        className="rules-toggle" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Hide Rules' : 'Game Rules'}
      </button>
      
      {isOpen && (
        <div className="rules-content">
          <h2>Lo-Fi Town Builder Rules</h2>
          
          <section className="rule-section">
            <h3>Basic Gameplay</h3>
            <p>Build a town by placing tiles on the grid. Each player can place one tile at a time.</p>
            <p>The goal is to build the most efficient and highest-scoring town possible through collaborative building.</p>
          </section>
          
          <section className="rule-section">
            <h3>Tile Values</h3>
            <div className="tiles-list">
              {Object.entries(TILE_BASE_SCORES).filter(([type]) => type !== 'empty').map(([type, score]) => (
                <div key={type} className="tile-value">
                  <span className="tile-type">{type}</span>
                  <span className="tile-score">{score} points</span>
                </div>
              ))}
            </div>
          </section>
          
          <section className="rule-section">
            <h3>Adjacency Bonuses</h3>
            <p>Place tiles strategically to earn bonus points from adjacency:</p>
            <ul className="adjacency-rules">
              {ADJACENCY_RULES.map((rule, index) => (
                <li key={index}>
                  <strong>{rule.primary} + {rule.adjacent}</strong>: +{rule.bonus} points — {rule.description}
                </li>
              ))}
            </ul>
          </section>
          
          <section className="rule-section">
            <h3>Mystery Tiles</h3>
            <p>You have a {MYSTERY_TILE_CHANCE}% chance of discovering a special mystery tile when placing a regular tile.</p>
            <div className="mystery-tiles-list">
              {MYSTERY_TILES.map((tile, index) => (
                <div key={index} className="mystery-tile" style={{ borderColor: tile.color }}>
                  <div className="mystery-tile-header">
                    <span className="mystery-name">{tile.name}</span>
                    <span className="mystery-rarity">{tile.rarity}</span>
                  </div>
                  <p className="mystery-description">{tile.description}</p>
                  <div className="mystery-bonus">×{tile.bonusMultiplier} multiplier</div>
                </div>
              ))}
            </div>
          </section>
          
          <section className="rule-section">
            <h3>Town Progression</h3>
            <p>As your town score increases, your settlement will grow through these levels:</p>
            <div className="town-levels-list">
              {TOWN_LEVELS.map((level, index) => (
                <div key={index} className="town-level-item" style={{ borderColor: level.color }}>
                  <span className="level-name">{level.name}</span>
                  <span className="level-range">
                    {level.minScore} - {level.maxScore === Infinity ? '∞' : level.maxScore} points
                  </span>
                  <p className="level-description">{level.description}</p>
                </div>
              ))}
            </div>
          </section>
          
          <section className="rule-section">
            <h3>Daily Challenges</h3>
            <p>Complete daily challenges to earn bonus points.</p>
            <p>New challenges appear every 24 hours.</p>
          </section>
          
          <section className="rule-section">
            <h3>Placement Streaks</h3>
            <p>Place tiles quickly to build up a streak for bonus points.</p>
            <p>Streaks must be maintained by placing tiles within 5 seconds of each other.</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default GameRules; 