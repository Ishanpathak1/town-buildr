import React, { useMemo } from 'react';
import type { Player } from '../types/game';
import '../styles/PlayerList.css';

interface PlayerListProps {
  players: Record<string, Player>;
  currentPlayerId: string;
  onClearOthers?: () => void; // Optional callback to clear other players
}

// Safe emoji characters to use for avatars
const AVATAR_EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😎', '🧐', '🤓', '👽', '🐱', '🐶', '🦊'];

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, onClearOthers }) => {
  console.log('PlayerList - rendering with players:', players);
  console.log('Player count:', Object.keys(players).length);

  // Check if player has been active recently (in last 30 seconds)
  const isPlayerActive = (player: Player): boolean => {
    if (!player.lastPlaced) return false;
    const ACTIVE_THRESHOLD = 30000; // 30 seconds
    return Date.now() - player.lastPlaced < ACTIVE_THRESHOLD;
  };
  
  // Count active players and get sorted list
  const { activeCount, sortedPlayers } = useMemo(() => {
    const now = Date.now();
    const ACTIVE_THRESHOLD = 60000; // 60 seconds for counting purposes
    
    let count = 0;
    const entries = Object.entries(players).map(([id, player]) => {
      const isActive = player.lastPlaced && (now - player.lastPlaced < ACTIVE_THRESHOLD);
      if (isActive) count++;
      return { id, player, isActive };
    });
    
    // Sort players: current player first, then active players, then inactive
    const sorted = entries.sort((a, b) => {
      if (a.id === currentPlayerId) return -1;
      if (b.id === currentPlayerId) return 1;
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return (b.player.lastPlaced || 0) - (a.player.lastPlaced || 0);
    });
    
    return { activeCount: count, sortedPlayers: sorted };
  }, [players, currentPlayerId]);
  
  // Calculate if we have other active players besides ourselves
  const hasOtherActivePlayers = useMemo(() => {
    if (activeCount <= 1) return false;
    
    // Count how many active players are not the current player
    return sortedPlayers.some(p => p.id !== currentPlayerId && p.isActive);
  }, [sortedPlayers, currentPlayerId, activeCount]);
  
  // Get an emoji based on player ID
  const getPlayerEmoji = (id: string) => {
    // Create a simple hash from the player ID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Get a positive index in the emoji array
    const index = Math.abs(hash) % AVATAR_EMOJIS.length;
    return AVATAR_EMOJIS[index];
  };
  
  // Generate a consistent color for each player based on their ID
  const getPlayerColor = (id: string): string => {
    // Simple hash function to convert ID to a number
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to RGB color
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    
    return `rgb(${Math.abs(r)}, ${Math.abs(g)}, ${Math.abs(b)})`;
  };
  
  return (
    <div className="player-list card">
      <div className="player-header">
        <h3>
          Players Online ({activeCount})
          <span className={`connection-indicator ${hasOtherActivePlayers ? 'connected' : 'disconnected'}`} 
                title={hasOtherActivePlayers ? 'Connected to other players' : 'No other players detected'}>
          </span>
        </h3>
        {hasOtherActivePlayers && onClearOthers && (
          <button 
            className="clear-others-btn" 
            onClick={onClearOthers}
            title="Remove other players from view"
          >
            Clear Others
          </button>
        )}
      </div>
      <div className="player-items">
        {sortedPlayers.map(({ id, player }) => {
          const playerColor = getPlayerColor(id);
          const active = isPlayerActive(player);
          
          return (
            <div 
              key={id} 
              className={`player-item ${id === currentPlayerId ? 'current-player' : ''} ${active ? 'active-player' : ''}`}
            >
              <div 
                className="player-avatar"
                style={{ backgroundColor: playerColor }}
              >
                {getPlayerEmoji(id)}
              </div>
              <div className="player-info">
                <div className="player-name">
                  {id === currentPlayerId ? 'You' : `Player ${id.slice(-4)}`}
                </div>
                <div className="player-position">
                  Tile: {player.cursor?.x || 0},{player.cursor?.y || 0}
                </div>
              </div>
              <div className={`player-status ${active ? 'active' : 'inactive'}`}></div>
              {id === currentPlayerId && <div className="player-badge">You</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList; 