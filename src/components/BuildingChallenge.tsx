import React, { useState } from 'react';
import { supabase } from '../supabase/client';

interface BuildingChallengeProps {
  playerId: string;
}

const BuildingChallenge: React.FC<BuildingChallengeProps> = ({ playerId }) => {
  const [challenge, setChallenge] = useState({
    title: 'Build a Park',
    description: 'Create a park with at least 5 trees and a water feature',
    reward: 500,
    isComplete: false
  });
  
  const completeChallenge = async () => {
    if (challenge.isComplete) return;
    
    setChallenge(prev => ({ ...prev, isComplete: true }));
    
    // Announce in global chat
    try {
      await supabase.from('messages').insert({
        content: `🏆 ${playerId.slice(-4)} completed the challenge: ${challenge.title}!`,
        player_id: 'system',
        player_name: 'Town Herald'
      });
    } catch (err) {
      console.error('Error announcing challenge:', err);
    }
  };
  
  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      left: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      width: '250px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 8px 0', color: '#ffd700' }}>
        Town Challenge
      </h3>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        {challenge.title}
      </div>
      <div style={{ fontSize: '14px', marginBottom: '10px' }}>
        {challenge.description}
      </div>
      <div style={{ fontSize: '14px', color: '#ffd700' }}>
        Reward: {challenge.reward} points
      </div>
      {challenge.isComplete ? (
        <div style={{ 
          marginTop: '10px',
          padding: '5px',
          background: '#4CAF50',
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          COMPLETED! 🎉
        </div>
      ) : (
        <button 
          onClick={completeChallenge}
          style={{
            marginTop: '10px',
            padding: '8px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          Mark as Completed
        </button>
      )}
    </div>
  );
};

export default BuildingChallenge; 