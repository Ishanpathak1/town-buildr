import { supabase } from './client';
import type { Tile, TileType } from '../types/game';

// Table name in Supabase
const TILES_TABLE = 'tiles';
const PLAYERS_TABLE = 'players';

// Check if we're in demo mode (no Supabase credentials)
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
let forceDemoMode = false; // Change from true to false to use Supabase

// Demo mode local storage
const demoTiles: Tile[] = [];
const demoPlayers: Record<string, { id: string, cursor: { x: number, y: number }, lastActive: number }> = {};
let tileListeners: ((tile: Tile) => void)[] = [];
let playerListeners: ((playerId: string, x: number, y: number) => void)[] = [];

// Store unique session ID to help with cross-window communication
const SESSION_ID = `session-${Math.random().toString(36).substring(2, 10)}`;
console.log('This client SESSION_ID:', SESSION_ID);

// Track when we last broadcast all players
let lastBroadcastTime = 0;
const BROADCAST_INTERVAL = 500; // 500ms - more frequent broadcasting for better responsiveness

// Use localStorage for cross-window communication in demo mode
if (typeof window !== 'undefined' && forceDemoMode) {
  console.log('Setting up cross-tab communication');
  
  // Set up localStorage event listener for player updates
  window.addEventListener('storage', (event) => {
    if (event.key === 'lofi-town-player-update') {
      try {
        const data = JSON.parse(event.newValue || '{}');
        // Always process data from other sessions, regardless of session ID
        if (data.playerId && data.x !== undefined && data.y !== undefined) {
          console.log('Received player update from another tab:', data);
          
          // Update local player record
          demoPlayers[data.playerId] = {
            id: data.playerId,
            cursor: { x: data.x, y: data.y },
            lastActive: Date.now()
          };
          
          // Notify listeners about this player update
          playerListeners.forEach(callback => {
            callback(data.playerId, data.x, data.y);
          });
        }
      } catch (err) {
        console.error('Error parsing player update:', err);
      }
    }
    
    // Listen for tile updates from other tabs
    if (event.key && event.key.startsWith('lofi-town-tile-update-')) {
      try {
        const data = JSON.parse(event.newValue || '{}');
        if (data.tile && data.sessionId !== SESSION_ID) {
          console.log('Received tile update from another tab:', data.tile);
          
          // Find if this tile already exists
          const tileIndex = demoTiles.findIndex(t => 
            t.x === data.tile.x && t.y === data.tile.y
          );
          
          if (tileIndex >= 0) {
            // Update existing tile
            demoTiles[tileIndex] = data.tile;
          } else {
            // Add new tile
            demoTiles.push(data.tile);
          }
          
          // Notify listeners about the tile update
          tileListeners.forEach(callback => {
            callback(data.tile);
          });
        }
      } catch (err) {
        console.error('Error parsing tile update:', err);
      }
    }
    
    // Listen for clear tiles command
    if (event.key && event.key.startsWith('lofi-town-clear-tiles-')) {
      try {
        const data = JSON.parse(event.newValue || '{}');
        if (data.sessionId !== SESSION_ID && data.action === 'clear-all') {
          console.log('Received clear tiles command from another tab');
          
          // Clear local tiles array
          demoTiles.length = 0;
          
          // Notify listeners about the clear
          tileListeners.forEach(callback => {
            callback({
              x: -1,
              y: -1,
              type: 'empty' as TileType,
              placed_by: 'system',
              id: 'clear-all'
            });
          });
        }
      } catch (err) {
        console.error('Error handling clear tiles command:', err);
      }
    }
  });
  
  // Broadcast a ping on window load to announce this player to other tabs
  window.addEventListener('load', () => {
    console.log('Broadcasting ping on window load');
    
    // Use a small delay to ensure event listeners are set up in other tabs
    setTimeout(() => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lofi-town-ping', JSON.stringify({
          timestamp: Date.now(),
          sessionId: SESSION_ID
        }));
      }
      
      // Also broadcast active players
      broadcastActivePlayers();
    }, 500);
  });
  
  // Listen for pings from other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'lofi-town-ping') {
      console.log('Received ping from another tab, broadcasting players');
      // Respond with our player data
      broadcastActivePlayers();
    }
    
    // Listen for tile requests from other tabs
    if (event.key === 'lofi-town-request-tiles') {
      try {
        const data = JSON.parse(event.newValue || '{}');
        if (data.sessionId !== SESSION_ID) {
          console.log('Received tile request from another tab, broadcasting all tiles');
          
          // Broadcast all our tiles to localStorage
          demoTiles.forEach((tile, index) => {
            // Use a delay to avoid overwhelming localStorage events
            setTimeout(() => {
              if (typeof localStorage !== 'undefined') {
                const tileUpdateKey = `lofi-town-tile-update-response-${index}`;
                localStorage.setItem(tileUpdateKey, JSON.stringify({
                  tile,
                  timestamp: Date.now(),
                  sessionId: SESSION_ID
                }));
              }
            }, index * 50); // Stagger the updates to ensure they all get processed
          });
        }
      } catch (err) {
        console.error('Error handling tile request:', err);
      }
    }
  });
}

// At the top of the file, add console logging for initialization:
console.log('Initializing tileService - isDemoMode:', isDemoMode, 'forceDemoMode:', forceDemoMode);

// Helper function to check if a table exists
const checkTableExists = async (tableName: string): Promise<boolean> => {
  // Since we're in forced demo mode, just return false
  if (forceDemoMode) {
    console.log(`Demo mode: Skipping check for table '${tableName}'`);
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If we get a 404 error, the table doesn't exist
    if (error && (error.code === '404' || error.message.includes('Not Found'))) {
      console.warn(`Table '${tableName}' does not exist in Supabase - switching to demo mode`);
      forceDemoMode = true;
      return false;
    }
    
    return true;
  } catch (err) {
    console.error(`Error checking if table '${tableName}' exists:`, err);
    forceDemoMode = true;
    return false;
  }
};

// Check tables on startup
const verifyTables = async () => {
  if (isDemoMode || forceDemoMode) {
    console.log('Demo mode: Skipping table verification');
    return;
  }
  
  const tilesExist = await checkTableExists(TILES_TABLE);
  const playersExist = await checkTableExists(PLAYERS_TABLE);
  
  if (!tilesExist || !playersExist) {
    console.warn('Some required tables are missing - switching to demo mode');
    forceDemoMode = true;
  }
};

// Start verification
verifyTables();

// Fetch all tiles from the database
export const fetchTiles = async (): Promise<Tile[]> => {
  if (isDemoMode || forceDemoMode) {
    console.log('Demo mode: Returning local tiles or creating initial demo tiles');
    
    // If we don't have any demo tiles yet, create some initial ones
    if (demoTiles.length === 0) {
      console.log('Demo mode: Creating initial demo tiles');
      const initialTiles = [
        { x: 5, y: 5, type: 'grass' as TileType, placed_by: 'system', id: '5-5' },
        { x: 6, y: 5, type: 'forest' as TileType, placed_by: 'system', id: '6-5' },
        { x: 7, y: 5, type: 'house' as TileType, placed_by: 'system', id: '7-5' },
        { x: 8, y: 5, type: 'market' as TileType, placed_by: 'system', id: '8-5' },
        { x: 9, y: 5, type: 'water' as TileType, placed_by: 'system', id: '9-5' }
      ];
      
      demoTiles.push(...initialTiles);
    }
    
    return demoTiles;
  }

  if (!isDemoMode && !forceDemoMode) {
    console.log('Fetching tiles from Supabase');
    const { data, error } = await supabase
      .from(TILES_TABLE)
      .select('*');
    
    if (error) {
      console.error('Error fetching tiles:', error);
      // If we get a 404, switch to demo mode for future calls
      if (error.code === '404' || error.message.includes('Not Found')) {
        forceDemoMode = true;
      }
      return [];
    }
    
    return data || [];
  }
  
  return [];
};

// Place a new tile or update existing one
export const placeTile = async (x: number, y: number, type: TileType, playerId: string): Promise<Tile | null> => {
  console.log('placeTile called with:', { x, y, type, playerId });
  
  const tile: Tile = {
    x,
    y,
    type,
    placed_by: playerId,
    id: `${x}-${y}`
  };

  if (isDemoMode || forceDemoMode) {
    console.log('Using demo mode for tile placement');
    // Find existing tile index
    const existingIndex = demoTiles.findIndex(t => t.x === x && t.y === y);
    
    if (existingIndex >= 0) {
      // Update existing tile
      console.log('Updating existing tile at', x, y);
      demoTiles[existingIndex] = tile;
    } else {
      // Add new tile
      console.log('Adding new tile at', x, y);
      demoTiles.push(tile);
    }
    
    // Notify listeners
    console.log('Notifying', tileListeners.length, 'listeners about placed tile');
    tileListeners.forEach(callback => callback(tile));
    
    // Also broadcast this tile update to other tabs via localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        // Use a random key suffix to ensure the storage event fires
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const tileUpdateKey = `lofi-town-tile-update-${randomSuffix}`;
        
        // Store the tile update with timestamp
        localStorage.setItem(tileUpdateKey, JSON.stringify({
          tile,
          timestamp: Date.now(),
          sessionId: SESSION_ID
        }));
        
        console.log('Broadcasted tile placement to other tabs via localStorage');
      } catch (err) {
        console.error('Error broadcasting tile placement:', err);
      }
    }
    
    return tile;
  }

  try {
    // Check if tile exists at this position
    const { data: existingTiles } = await supabase
      .from(TILES_TABLE)
      .select('*')
      .eq('x', x)
      .eq('y', y)
      .single();
    
    let result;
    
    if (existingTiles) {
      // Update existing tile
      result = await supabase
        .from(TILES_TABLE)
        .update(tile)
        .eq('x', x)
        .eq('y', y)
        .select()
        .single();
    } else {
      // Insert new tile
      result = await supabase
        .from(TILES_TABLE)
        .insert(tile)
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error placing tile:', result.error);
      
      // If we get a 404, switch to demo mode for future calls
      if (result.error.code === '404' || result.error.message.includes('Not Found')) {
        forceDemoMode = true;
        // Save in demo mode instead
        return placeTile(x, y, type, playerId);
      }
      
      return null;
    }
    
    return result.data;
  } catch (err) {
    console.error('Error in placeTile:', err);
    forceDemoMode = true;
    // Try again in demo mode
    return placeTile(x, y, type, playerId);
  }
};

// Subscribe to tile changes
export const subscribeTiles = (callback: (tile: Tile) => void) => {
  if (isDemoMode || forceDemoMode) {
    console.log('subscribeTiles: Using demo mode, adding listener. Current listeners:', tileListeners.length);
    // Add listener to local array
    tileListeners.push(callback);
    
    // Try to trigger any existing tiles
    if (demoTiles.length > 0) {
      console.log('Demo mode: Sending', demoTiles.length, 'existing tiles to new listener');
      demoTiles.forEach(tile => {
        callback(tile);
      });
    } else {
      // For testing, create some initial tiles
      console.log('Demo mode: Creating initial test tiles');
      const initialTiles = [
        { x: 5, y: 5, type: 'grass' as TileType, placed_by: 'system', id: '5-5' },
        { x: 6, y: 5, type: 'forest' as TileType, placed_by: 'system', id: '6-5' },
        { x: 7, y: 5, type: 'house' as TileType, placed_by: 'system', id: '7-5' }
      ];
      
      initialTiles.forEach(tile => {
        demoTiles.push(tile);
        callback(tile);
      });
    }
    
    // Check localStorage for tile updates from other tabs
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        // Scan localStorage for tile updates
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('lofi-town-tile-update-')) {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.tile) {
              // Find if this tile already exists in our local array
              const tileIndex = demoTiles.findIndex(t => 
                t.x === data.tile.x && t.y === data.tile.y
              );
              
              // Only add or update if it's not already there or if it's more recent
              if (tileIndex === -1) {
                console.log('Found new tile from another tab:', data.tile);
                demoTiles.push(data.tile);
                callback(data.tile);
              } else if (data.timestamp) {
                // If we have a timestamp in the data, use it to determine if we should update
                // We can't check the tile timestamp since it's not part of the Tile type
                console.log('Found updated tile from another tab:', data.tile);
                demoTiles[tileIndex] = data.tile;
                callback(data.tile);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error scanning localStorage for tiles:', err);
      }
    }
    
    // Broadcast a request for tiles on subscription
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('lofi-town-request-tiles', JSON.stringify({
        timestamp: Date.now(),
        sessionId: SESSION_ID
      }));
    }
    
    // Return mock subscription with unsubscribe method
    return {
      unsubscribe: () => {
        console.log('Demo mode: Unsubscribing listener');
        tileListeners = tileListeners.filter(cb => cb !== callback);
      }
    };
  }

  console.log('Setting up Supabase realtime channel for tiles');
  
  // Create a more robust channel
  const channel = supabase
    .channel('tiles-channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: TILES_TABLE,
    }, (payload) => {
      console.log('Tile INSERT received:', payload.new);
      callback(payload.new as Tile);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: TILES_TABLE,
    }, (payload) => {
      console.log('Tile UPDATE received:', payload.new);
      callback(payload.new as Tile);
    })
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: TILES_TABLE,
    }, (payload) => {
      console.log('Tile DELETE received:', payload.old);
      // For deletes, we still want to notify with the old data
      // But mark it as empty so it can be removed
      if (payload.old) {
        const oldTile = payload.old as Tile;
        callback({
          ...oldTile,
          type: 'empty'
        });
      }
    })
    .subscribe((status) => {
      console.log('Supabase channel status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to tile changes!');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('Error with Supabase channel - switching to demo mode');
        forceDemoMode = true;
        // Add to local listeners
        tileListeners.push(callback);
      }
    });
  
  return {
    unsubscribe: () => {
      console.log('Unsubscribing from Supabase tiles channel');
      channel.unsubscribe();
      // Also remove from local listeners if we've switched to demo mode
      if (forceDemoMode) {
        tileListeners = tileListeners.filter(cb => cb !== callback);
      }
    }
  };
};

// Update player cursor position
export const updatePlayerCursor = async (playerId: string, x: number, y: number) => {
  if (isDemoMode || forceDemoMode) {
    console.log('Using demo mode for cursor update');
    // Update player in local storage
    demoPlayers[playerId] = { 
      id: playerId, 
      cursor: { x, y },
      lastActive: Date.now() // Track when this player was last active
    };
    
    // Notify listeners about this player update
    playerListeners.forEach(callback => callback(playerId, x, y));
    
    // Broadcast to other browser windows/tabs using localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        // Use a random key suffix to ensure the event fires even if the data hasn't changed
        // This is important for cross-tab communication via the storage event
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        
        // Use localStorage for cross-window communication
        localStorage.setItem(`lofi-town-player-update-${randomSuffix}`, JSON.stringify({
          sessionId: SESSION_ID,
          playerId,
          x,
          y,
          timestamp: Date.now()
        }));
        
        // Also update the main player update key
        localStorage.setItem('lofi-town-player-update', JSON.stringify({
          sessionId: SESSION_ID,
          playerId,
          x,
          y,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error broadcasting player position:', err);
      }
    }
    
    // Also broadcast currently connected players periodically
    // This helps ensure all clients are aware of all active players
    broadcastActivePlayers();
    
    return;
  } else {
    console.log(`Updating player ${playerId} cursor to ${x},${y} in Supabase`);
    try {
      const { error } = await supabase
        .from(PLAYERS_TABLE)
        .upsert({ 
          id: playerId, 
          cursor: { x, y },
          last_active: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('Error updating player cursor:', error);
        
        // If we get a 404, switch to demo mode for future calls
        if (error.code === '404' || error.message.includes('Not Found')) {
          console.warn('Table not found - switching to demo mode');
          forceDemoMode = true;
          // Update in demo mode instead
          updatePlayerCursor(playerId, x, y);
        }
      } else {
        console.log('Successfully updated cursor in Supabase');
      }
    } catch (err) {
      console.error('Error in updatePlayerCursor:', err);
      forceDemoMode = true;
      // Try again in demo mode
      updatePlayerCursor(playerId, x, y);
    }
  }
};

// Broadcast all active players to listeners
const broadcastActivePlayers = () => {
  const now = Date.now();
  
  // Only broadcast once every BROADCAST_INTERVAL ms to avoid spam
  if (now - lastBroadcastTime < BROADCAST_INTERVAL) {
    return;
  }
  
  lastBroadcastTime = now;
  
  // Consider players active if they were active in the last 20 seconds
  // This shorter timeframe helps remove ghost players more quickly
  const activeTimeThreshold = now - 20000; // 20 seconds
  
  // Collect all active players
  const activePlayers = Object.entries(demoPlayers).filter(([id, player]) => {
    // Filter out system players and inactive players
    return !id.includes('system') && player.lastActive && player.lastActive >= activeTimeThreshold;
  });
  
  console.log(`Broadcasting ${activePlayers.length} active players`);
  
  // Broadcast all active players to local listeners
  activePlayers.forEach(([id, player]) => {
    playerListeners.forEach(callback => {
      callback(id, player.cursor.x, player.cursor.y);
    });
  });
  
  // Also broadcast all active players to localStorage for cross-window communication
  if (typeof window !== 'undefined') {
    try {
      // Store active player data in a consistent localStorage key
      localStorage.setItem('lofi-town-active-players', JSON.stringify({
        sessionId: SESSION_ID,
        timestamp: now,
        players: activePlayers.map(([id, player]) => ({
          id,
          x: player.cursor.x,
          y: player.cursor.y,
          lastActive: player.lastActive
        }))
      }));
    } catch (err) {
      console.error('Error broadcasting active players:', err);
    }
  }
};

// Subscribe to player cursor changes
export const subscribePlayers = (callback: (playerId: string, x: number, y: number) => void) => {
  if (isDemoMode || forceDemoMode) {
    console.log('Using demo mode for player subscriptions');
    // Add listener to local array
    playerListeners.push(callback);
    
    // Immediately notify about all current players
    console.log(`Sending information about ${Object.keys(demoPlayers).length} existing players to new listener`);
    Object.entries(demoPlayers).forEach(([id, player]) => {
      // Notify about each existing player's position
      callback(id, player.cursor.x, player.cursor.y);
    });
    
    // Also check localStorage for players from other windows/tabs
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        // Scan all localStorage keys for player updates
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('lofi-town-player-update')) {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.sessionId !== SESSION_ID && data.playerId && data.x !== undefined && data.y !== undefined) {
              console.log(`Found player ${data.playerId} from another tab in localStorage`);
              
              // Update local player record
              demoPlayers[data.playerId] = {
                id: data.playerId,
                cursor: { x: data.x, y: data.y },
                lastActive: data.timestamp || Date.now()
              };
              
              // Notify about this player
              callback(data.playerId, data.x, data.y);
            }
          }
        }

        // Also check active players data
        const activePlayersData = localStorage.getItem('lofi-town-active-players');
        if (activePlayersData) {
          const data = JSON.parse(activePlayersData);
          if (data.players && Array.isArray(data.players)) {
            console.log(`Found ${data.players.length} players from other sessions in localStorage`);
            
            // Process players from localStorage
            data.players.forEach((player: any) => {
              if (player.id && player.x !== undefined && player.y !== undefined) {
                // Update local player record if not already there or if more recent
                const existingPlayer = demoPlayers[player.id];
                if (!existingPlayer || (player.lastActive && (!existingPlayer.lastActive || existingPlayer.lastActive < player.lastActive))) {
                  demoPlayers[player.id] = {
                    id: player.id,
                    cursor: { x: player.x, y: player.y },
                    lastActive: player.lastActive || Date.now()
                  };
                  
                  // Notify about this player
                  callback(player.id, player.x, player.y);
                }
              }
            });
          }
        }
      } catch (err) {
        console.error('Error reading player data from localStorage:', err);
      }
    }
    
    // Broadcast a ping to announce our presence to other tabs
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('lofi-town-ping', JSON.stringify({
        timestamp: Date.now(),
        sessionId: SESSION_ID
      }));
    }
    
    // Force an immediate broadcast to ensure cross-window visibility
    setTimeout(broadcastActivePlayers, 100);
    
    // Set up periodic broadcasts to maintain player visibility
    const interval = setInterval(broadcastActivePlayers, BROADCAST_INTERVAL * 2);
    
    // Return mock subscription with unsubscribe method
    return {
      unsubscribe: () => {
        playerListeners = playerListeners.filter(cb => cb !== callback);
        clearInterval(interval);
      }
    };
  } else {
    console.log('Setting up Supabase realtime channel for players');
    
    const channel = supabase
      .channel('players-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: PLAYERS_TABLE,
      }, (payload) => {
        console.log('Received player update from Supabase:', payload);
        const player = payload.new as any;
        if (player && player.cursor) {
          callback(player.id, player.cursor.x, player.cursor.y);
        }
      })
      .subscribe((status) => {
        console.log('Supabase channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.warn('Error with Supabase players channel - switching to demo mode');
          forceDemoMode = true;
          // Add to local listeners
          playerListeners.push(callback);
        }
      });
      
    return {
      unsubscribe: () => {
        console.log('Unsubscribing from Supabase players channel');
        channel.unsubscribe();
        // Also remove from local listeners if we've switched to demo mode
        if (forceDemoMode) {
          playerListeners = playerListeners.filter(cb => cb !== callback);
        }
      }
    };
  }
};

// Clear all tiles
export const clearTiles = async (): Promise<void> => {
  if (isDemoMode || forceDemoMode) {
    console.log('Demo mode: Clearing all tiles');
    // Clear the local array
    demoTiles.length = 0;
    
    // Notify listeners about the clear
    tileListeners.forEach(callback => {
      // Send a special "clear" message - we'll use a special tile to indicate clearing
      callback({
        x: -1,
        y: -1,
        type: 'empty' as TileType,
        placed_by: 'system',
        id: 'clear-all'
      });
    });
    
    // Broadcast clear command to other tabs
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        localStorage.setItem(`lofi-town-clear-tiles-${randomSuffix}`, JSON.stringify({
          timestamp: Date.now(),
          sessionId: SESSION_ID,
          action: 'clear-all'
        }));
        
        console.log('Broadcasted clear tiles command to other tabs');
      } catch (err) {
        console.error('Error broadcasting clear command:', err);
      }
    }
    
    return;
  }

  try {
    // In a real implementation, this would delete all tiles from the database
    const { error } = await supabase
      .from(TILES_TABLE)
      .delete()
      .neq('id', ''); // Delete all records
    
    if (error) {
      console.error('Error clearing tiles:', error);
      
      // If we get a 404, switch to demo mode for future calls
      if (error.code === '404' || error.message.includes('Not Found')) {
        forceDemoMode = true;
        // Try again in demo mode
        return clearTiles();
      }
    }
  } catch (err) {
    console.error('Error in clearTiles:', err);
    forceDemoMode = true;
    // Try again in demo mode
    return clearTiles();
  }
};

// Add this line near the top of the file, after the forceDemoMode declaration
export const isUsingDemoMode = () => isDemoMode || forceDemoMode; 