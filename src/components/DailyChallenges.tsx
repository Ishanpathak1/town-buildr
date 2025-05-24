import React from 'react';
import type { MicroAchievement } from '../types/game';
import '../styles/DailyChallenges.css';

interface DailyChallengesProps {
  challenges: MicroAchievement[];
  onClaim: (id: string) => void;
}

const DailyChallenges: React.FC<DailyChallengesProps> = ({ challenges, onClaim }) => {
  return (
    <div className="daily-challenges">
      <h3>Daily Challenges</h3>
      <p className="challenges-description">Complete challenges to earn bonus points!</p>
      
      <div className="challenges-list">
        {challenges.map(challenge => (
          <div 
            key={challenge.id} 
            className={`challenge-item ${challenge.isComplete ? 'complete' : ''}`}
          >
            <div className="challenge-icon">{challenge.icon}</div>
            
            <div className="challenge-details">
              <div className="challenge-header">
                <h4>{challenge.name}</h4>
                <span className="challenge-reward">+{challenge.rewardAmount} pts</span>
              </div>
              
              <p className="challenge-description">{challenge.description}</p>
              
              {challenge.progress !== undefined && challenge.target !== undefined && (
                <div className="challenge-progress">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {challenge.progress}/{challenge.target}
                  </span>
                </div>
              )}
            </div>
            
            {challenge.isComplete && !challenge.claimed && (
              <button 
                className="claim-button"
                onClick={() => onClaim(challenge.id)}
              >
                Claim
              </button>
            )}
            
            {challenge.claimed && (
              <div className="claimed-status">Claimed</div>
            )}
          </div>
        ))}
      </div>
      
      <div className="refresh-info">
        <span>New challenges in:</span>
        <span className="refresh-timer">11:24:32</span>
      </div>
    </div>
  );
};

export default DailyChallenges; 