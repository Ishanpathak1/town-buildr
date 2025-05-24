import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

interface PlayerCounterProps {
  playerId: string;
}

const PlayerCounter: React.FC<PlayerCounterProps> = ({ playerId }) => {
  const [playerCount, setPlayerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Count active players every 5 seconds
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id')
          .gte('last_active', new Date(Date.now() - 30000).toISOString());
          
        if (error) {
          console.error('Error fetching player count:', error);
        } else {
          setPlayerCount(data?.length || 0);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Exception fetching player count:', err);
        setIsConnected(false);
      }
    };
    
    // Initial fetch
    fetchPlayers();
    
    // Set up interval
    const interval = setInterval(fetchPlayers, 5000);
    
    // Subscribe to changes
    const channel = supabase.channel('public:players')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players'
      }, () => {
        fetchPlayers();
      })
      .subscribe();
      
    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);
  
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      zIndex: 1000
    }}>
      <div style={{ 
        width: '10px', 
        height: '10px', 
        borderRadius: '50%', 
        background: isConnected ? '#4CAF50' : '#F44336',
        marginRight: '8px'
      }} />
      <span style={{ fontWeight: 'bold' }}>
        {playerCount} {playerCount === 1 ? 'Player' : 'Players'} Online
      </span>
      {playerCount > 1 && (
        <span style={{ 
          marginLeft: '8px',
          background: '#4CAF50',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '10px',
          fontWeight: 'bold'
        }}>
          MULTIPLAYER
        </span>
      )}
    </div>
  );
};

export default PlayerCounter; 