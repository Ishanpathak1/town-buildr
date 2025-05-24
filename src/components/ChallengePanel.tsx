import React from 'react';
import { checkChallengeCompletion } from '../game/Challenges';
import type { Challenge } from '../game/Challenges';
import type { Tile } from '../types/game';
import '../styles/ChallengePanel.css';

interface ChallengePanelProps {
  challenges: Challenge[];
  tiles: Record<string, Tile>;
  onChallengeComplete: (challengeId: string, reward: number) => void;
}

const ChallengePanel: React.FC<ChallengePanelProps> = ({ 
  challenges, 
  tiles, 
  onChallengeComplete 
}) => {
  return (
    <div className="challenge-panel">
      <h3 className="panel-title">Town Challenges</h3>
      
      <div className="challenges-list">
        {challenges.map(challenge => {
          const isCompleted = challenge.completed;
          const isCompletable = !isCompleted && checkChallengeCompletion(challenge, tiles);
          
          return (
            <div 
              key={challenge.id} 
              className={`challenge-item ${isCompleted ? 'completed' : ''} ${isCompletable ? 'completable' : ''}`}
            >
              <div className="challenge-header">
                <h4 className="challenge-title">{challenge.title}</h4>
                <span className="challenge-reward">+{challenge.reward}</span>
              </div>
              
              <p className="challenge-description">{challenge.description}</p>
              
              <div className="challenge-requirements">
                {Object.entries(challenge.requiredTiles).map(([type, count]) => (
                  <div key={type} className="requirement">
                    <span className="tile-icon">
                      {type === 'house' ? '🏠' : 
                       type === 'market' ? '🏪' : 
                       type === 'forest' ? '🌲' : 
                       type === 'water' ? '💧' : 
                       type === 'road' ? '🛣️' : 
                       type === 'grass' ? '🌿' : ''}
                    </span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
              
              {isCompletable && (
                <button 
                  className="claim-button"
                  onClick={() => onChallengeComplete(challenge.id, challenge.reward)}
                >
                  Claim Reward
                </button>
              )}
              
              {isCompleted && (
                <div className="completed-badge">Completed ✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChallengePanel; 