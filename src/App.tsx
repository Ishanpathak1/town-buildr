import { useState, useEffect, useRef } from 'react'
import './App.css'
import GameRenderer from './game/GameRenderer'
import TilePalette from './components/TilePalette'
import PlayerList from './components/PlayerList'
import MusicControls from './components/MusicControls'
import VotingSystem from './components/VotingSystem'
import TownStats from './components/TownStats'
import DailyChallenges from './components/DailyChallenges'
import GameRules from './components/GameRules'
import ClearButton from './components/ClearButton'
import ErrorBoundary from './components/ErrorBoundary'
import GameFallback from './components/GameFallback'
import type { Tile, Player, TileType, VoteEvent, MysteryTile, MicroAchievement } from './types/game'
import { fetchTiles, subscribeTiles, subscribePlayers, clearTiles, isUsingDemoMode } from './supabase/tileService'
import { generateDailyChallenges, getRandomMysteryTile, calculateTownScore } from './game/GameMechanics'
import audioPlayer from './game/AudioPlayer'
import { supabase } from './supabase/client'
import Chat from './components/Chat'
import BuildingChallenge from './components/BuildingChallenge'
import PlayerCounter from './components/PlayerCounter'

// Simplified fallback App component to help diagnose issues
function App() {
  const [error, setError] = useState<string | null>(null)
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Checking...')
  const [usingSupabase, setUsingSupabase] = useState(false)
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [selectedTile, setSelectedTile] = useState<TileType>('grass')
  const [playerId] = useState<string>(() => {
    // Generate a unique ID that's different for each tab/window
    const existingId = sessionStorage.getItem('lofi-town-player-id');
    
    if (existingId) {
      console.log('Using existing player ID:', existingId);
      return existingId;
    }
    
    // Generate a new ID if none exists
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now().toString(36);
    
    // Include tab-specific information to ensure uniqueness
    const tabId = Math.random().toString(36).substring(2, 5);
    
    const newId = `player-${tabId}-${randomPart}-${timestamp}`;
    console.log('Generated new player ID for this tab:', newId);
    
    // Store in sessionStorage to keep it tab-specific
    sessionStorage.setItem('lofi-town-player-id', newId);
    
    return newId;
  });
  const [connectedPlayers, setConnectedPlayers] = useState(0)
  const [playerName, setPlayerName] = useState(() => {
    // Try to load saved name or generate a random one
    const saved = localStorage.getItem('lofi-town-player-name');
    return saved || `Builder ${Math.floor(Math.random() * 1000)}`;
  });
  const [tiles, setTiles] = useState<Record<string, Tile>>({});

  // Track previous player count
  const prevPlayerCountRef = useRef(Object.keys(players).length);

  // Modify your App component to use local player names
  const [playerNames, setPlayerNames] = useState<Record<string, string>>(() => {
    // Try to load saved names
    const saved = localStorage.getItem('lofi-town-player-names');
    return saved ? JSON.parse(saved) : {};
  });

  // Load tiles from Supabase
  useEffect(() => {
    // Initial load of tiles
    const loadTiles = async () => {
      try {
        // Fetch tiles from Supabase
        const { supabase } = await import('./supabase/client');
        const { data, error } = await supabase
          .from('tiles')
          .select('*');
        
        if (error) {
          console.error('Error loading tiles:', error);
          return;
        }
        
        // Convert array to record, using coordinates as keys for quick lookup
        const tilesRecord: Record<string, Tile> = {};
        data.forEach(tile => {
          if (tile && tile.x !== undefined && tile.y !== undefined) {
            const key = `${tile.x}-${tile.y}`;
            tilesRecord[key] = tile;
          }
        });
        
        setTiles(tilesRecord);
        console.log(`Loaded ${Object.keys(tilesRecord).length} tiles from database`);
      } catch (error) {
        console.error('Error loading tiles:', error);
      }
    };
    
    // Load tiles immediately
    loadTiles();
    
    // Set up polling interval (every 3 seconds)
    const pollingInterval = setInterval(loadTiles, 3000);
    
    // Clean up on unmount
    return () => {
      clearInterval(pollingInterval);
    };
  }, []);

  // Handle tile placement
  const handleTilePlace = async (x: number, y: number, type: TileType) => {
    if (x === undefined || y === undefined) {
      console.error('Invalid tile coordinates:', x, y);
      return;
    }
    
    // Generate a UUID for the tile
    const tileId = crypto.randomUUID(); // Use UUID v4
    // Still keep track of coordinates as a key for local state
    const tileKey = `${x}-${y}`;
    
    console.log(`Placing ${type} tile at coordinates (${x}, ${y}) with ID ${tileId}`);
    
    // Update local state first for immediate feedback
    setTiles(prev => ({
      ...prev,
      [tileKey]: {
        id: tileId,
        x,
        y,
        type,
        placed_by: playerId
      }
    }));
    
    try {
      // Save to Supabase with UUID as the primary key
      const { supabase } = await import('./supabase/client');
      
      const { error } = await supabase
        .from('tiles')
        .upsert({
          id: tileId,
          x: x,
          y: y,
          type: type,
          placed_by: playerId
        });
        
      if (error) {
        console.error('Error saving tile to Supabase:', error);
      } else {
        console.log(`Successfully saved ${type} tile at (${x}, ${y}) to Supabase`);
      }
    } catch (err) {
      console.error('Error in handleTilePlace:', err);
    }
  };

  useEffect(() => {
    // Simple function to check if Supabase is configured
    const checkSupabase = async () => {
      try {
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing')
        console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configured' : 'Missing')
        
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          setSupabaseStatus('Environment variables missing')
          return
        }
        
        // Test a simple query
        const { data, error } = await supabase.from('tiles').select('*').limit(1)
        
        if (error) {
          console.error('Supabase error:', error)
          setSupabaseStatus(`Error: ${error.message}`)
        } else {
          console.log('Supabase connected! Sample data:', data)
          setSupabaseStatus('Connected')
        }
      } catch (err) {
        console.error('Exception:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSupabaseStatus('Exception occurred')
      }
    }
    
    checkSupabase()
  }, [])

  useEffect(() => {
    // Dynamically import to avoid issues
    const checkMode = async () => {
      try {
        // Load the module dynamically
        const tileService = await import('./supabase/tileService');
        
        // Check if the function exists
        if (typeof tileService.isUsingDemoMode === 'function') {
          setUsingSupabase(!tileService.isUsingDemoMode());
          console.log('Using Supabase:', !tileService.isUsingDemoMode());
        } else {
          // Fallback if function doesn't exist
          console.log('isUsingDemoMode function not found, checking forceDemoMode directly');
          // Try to access forceDemoMode as a property
          const isDemoMode = tileService.forceDemoMode === true;
          setUsingSupabase(!isDemoMode);
          console.log('Using Supabase (fallback check):', !isDemoMode);
        }
      } catch (err) {
        console.error('Error checking multiplayer mode:', err);
      }
    };
    
    checkMode();
  }, []);

  useEffect(() => {
    console.log('Checking if Supabase multiplayer is active...');
    console.log('You should see "forceDemoMode: false" in the console above');
    console.log('If forceDemoMode is false, Supabase multiplayer is active');
  }, []);

  useEffect(() => {
    // Update player list whenever players change
    const updatePlayers = async () => {
      try {
        // Call subscribePlayers without assigning a return value to 'unsubscribe'
        subscribePlayers((playerId, x, y) => {
          if (!playerId) return; // Skip invalid player IDs
          
          setPlayers(prev => ({
            ...prev,
            [playerId]: {
              id: playerId,
              cursor: { x: x || 0, y: y || 0 }, // Ensure x and y have default values
              lastPlaced: Date.now()
            }
          }));
        });
      } catch (err) {
        console.error('Error updating player list:', err);
      }
    };

    updatePlayers();
    // No cleanup function needed since subscribePlayers doesn't return an unsubscribe function
  }, []);

  useEffect(() => {
    const currentCount = Object.keys(players).length;
    const prevCount = prevPlayerCountRef.current;
    
    if (currentCount > prevCount) {
      // A player joined
      console.log('A new player has joined!');
      // You could show a toast notification here
    } else if (currentCount < prevCount) {
      // A player left
      console.log('A player has left.');
      // You could show a toast notification here
    }
    
    prevPlayerCountRef.current = currentCount;
  }, [players]);

  useEffect(() => {
    // Count players (excluding system players) - FIX FOR THE ERROR
    const count = Object.values(players).filter(p => 
      p && p.id && typeof p.id === 'string' && !p.id.includes('system')
    ).length;
    
    setConnectedPlayers(count);
    console.log(`Connected players: ${count}`);
  }, [players]);

  useEffect(() => {
    // Make players available for debugging
    if (typeof window !== 'undefined') {
      (window as any).__REACT_APP_STATE = (window as any).__REACT_APP_STATE || {};
      (window as any).__REACT_APP_STATE.players = players;
      (window as any).__REACT_APP_STATE.playerId = playerId;
    }
  }, [players, playerId]);

  useEffect(() => {
    // Skip if no playerId or name
    if (!playerId || !playerName) {
      return;
    }
    
    console.log(`Storing player name "${playerName}" locally (column not available in database)`);
    localStorage.setItem('lofi-town-player-name', playerName);
    
  }, [playerId, playerName]);

  useEffect(() => {
    console.log('Current playerId:', playerId);
    if (!playerId) {
      console.warn('PlayerId is empty or undefined!');
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) {
      console.error('PlayerId is still undefined after initialization!');
      return;
    }
    
    console.log('Initializing player in Supabase with ID:', playerId);
    
    const initializePlayer = async () => {
      try {
        const { supabase } = await import('./supabase/client');
        
        // Create initial player record with name
        const { error } = await supabase
          .from('players')
          .upsert({
            id: playerId,
            name: playerName,
            cursor: { x: 0, y: 0 },
            last_active: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error initializing player:', error);
        } else {
          console.log('Player initialized successfully in Supabase with name');
        }
      } catch (err) {
        console.error('Exception initializing player:', err);
      }
    };
    
    initializePlayer();
  }, [playerId, playerName]);

  // Update your own player name
  useEffect(() => {
    if (!playerId || !playerName) return;
    
    // Update local names cache
    setPlayerNames(prev => {
      const updated = { ...prev, [playerId]: playerName };
      localStorage.setItem('lofi-town-player-names', JSON.stringify(updated));
      return updated;
    });
    
  }, [playerId, playerName]);

  // Create a function to get player names
  const getPlayerName = (id: string) => {
    if (id === playerId) return playerName;
    return playerNames[id] || `Player ${id.slice(-4)}`;
  };

  const playerCount = Object.keys(players).length;

  if (typeof window !== 'undefined') {
    (window as any).checkPlayers = async () => {
      console.group('Multiplayer Status Check');
      
      // Check local React state
      const localPlayers = (window as any).__REACT_APP_STATE?.players || {};
      const localCount = Object.keys(localPlayers).length;
      
      console.log(`Local player count: ${localCount}`);
      console.table(Object.entries(localPlayers).map(([id, p]: [string, any]) => ({
        id: id.slice(-6),
        x: p.cursor?.x,
        y: p.cursor?.y,
        lastActive: new Date(p.lastPlaced || Date.now()).toLocaleTimeString()
      })));
      
      // Check Supabase directly
      try {
        // Import dynamically to avoid circular dependencies
        const { supabase } = await import('./supabase/client');
        const { data, error } = await supabase.from('players').select('*');
        
        if (error) {
          console.error('Error fetching players from Supabase:', error);
        } else {
          console.log(`Supabase player count: ${data.length}`);
          console.table(data.map((p: any) => ({
            id: p.id.slice(-6),
            x: p.cursor?.x,
            y: p.cursor?.y,
            lastActive: new Date(p.last_active || Date.now()).toLocaleTimeString()
          })));
        }
      } catch (err) {
        console.error('Error checking Supabase players:', err);
      }
      
      console.groupEnd();
      return 'Check console for player details';
    };

    (window as any).testMultiplayer = () => {
      console.group('Multiplayer Test');
      
      // Access the exposed state
      const state = (window as any).__REACT_APP_STATE || {};
      const allPlayers = state.players || {};
      const currentPlayerId = state.playerId;
      
      console.log(`Total players: ${Object.keys(allPlayers).length}`);
      
      if (Object.keys(allPlayers).length === 0) {
        console.warn('No players found in state! This could be because:');
        console.warn('1. The state hasn\'t been exposed to window.__REACT_APP_STATE');
        console.warn('2. No players are actually connected');
        console.warn('3. The players state is stored elsewhere');
        
        // Let's check the DOM for player elements as a fallback
        const playerElements = document.querySelectorAll('.player-item');
        if (playerElements.length > 0) {
          console.log(`Found ${playerElements.length} player elements in the DOM!`);
          console.log('This suggests players are being rendered, but not exposed to window.__REACT_APP_STATE');
        }
      }
      
      // Format player data for display
      const playerData = Object.entries(allPlayers).map(([id, p]: [string, any]) => ({
        id: id.slice(-6),
        position: `(${p.cursor?.x || 0}, ${p.cursor?.y || 0})`,
        isYou: id === currentPlayerId
      }));
      
      if (playerData.length > 0) {
        console.table(playerData);
      }
      
      // Simple verdict
      const isMultiplayerWorking = playerData.length > 1;
      console.log(`Verdict: Multiplayer is ${isMultiplayerWorking ? 'WORKING ✓' : 'NOT WORKING ✗'}`);
      
      console.groupEnd();
      
      // Alert for visibility
      if (isMultiplayerWorking) {
        return `Multiplayer is WORKING! Found ${playerData.length} players.`;
      } else {
        return `Multiplayer NOT confirmed. Only found ${playerData.length} player(s).`;
      }
    };

    // Add a simpler function that directly checks the Supabase database
    (window as any).checkPlayersInSupabase = async () => {
      try {
        const { supabase } = await import('./supabase/client');
        const { data, error } = await supabase.from('players').select('*');
        
        if (error) {
          console.error('Error checking players:', error);
          return `Error: ${error.message}`;
        }
        
        console.group('Players in Supabase');
        console.log(`Total players in database: ${data.length}`);
        
        if (data.length > 0) {
          console.table(data.map(p => ({
            id: p.id.slice(-6),
            x: p.cursor?.x,
            y: p.cursor?.y,
            lastActive: new Date(p.last_active).toLocaleTimeString()
          })));
        }
        
        console.groupEnd();
        
        return `Found ${data.length} players in Supabase database.`;
      } catch (err) {
        console.error('Exception:', err);
        return `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    };
  }

  // Add this debug function
  const checkPlayersTable = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // Query for information_schema to get column details
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'players');
      
      if (error) {
        console.error('Error checking players table schema:', error);
      } else {
        console.log('Players table columns:', data);
      }
    } catch (err) {
      console.error('Exception checking table schema:', err);
    }
  };

  // Call this in your useEffect or add a debug button
  useEffect(() => {
    checkPlayersTable();
  }, []);

  // Add this function to your App component
  const debugPlayerTable = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // First, get one row to see what fields it has
      const { data: sample, error: sampleError } = await supabase
        .from('players')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.error('Error fetching sample player:', sampleError);
      } else {
        console.log('Sample player record structure:', sample[0]);
        console.log('Available fields:', sample[0] ? Object.keys(sample[0]) : 'No records');
      }
      
      // Try to use the name column explicitly
      const { data: nameTest, error: nameError } = await supabase
        .from('players')
        .select('id, name')
        .limit(1);
        
      if (nameError) {
        console.error('Error testing name column:', nameError);
      } else {
        console.log('Name column test result:', nameTest);
      }
      
    } catch (err) {
      console.error('Exception debugging player table:', err);
    }
  };

  // Call this function
  useEffect(() => {
    debugPlayerTable();
  }, []);

  // Add this test function
  const testPlayerUpdate = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // First try to insert a completely new player
      const testId = `test-player-${Date.now()}`;
      
      console.log('Step 1: Creating test player with ID:', testId);
      
      // Insert without name field first
      const { error: insertError } = await supabase
        .from('players')
        .insert({
          id: testId,
          cursor: { x: 5, y: 5 },
          last_active: new Date().toISOString()
        });
        
      if (insertError) {
        console.error('Error creating test player:', insertError);
        return;
      }
      
      console.log('Step 2: Test player created successfully');
      
      // Now try to update only the name
      console.log('Step 3: Updating test player name');
      
      const { error: updateError } = await supabase
        .from('players')
        .update({ name: 'Test Player Name' })
        .eq('id', testId);
        
      if (updateError) {
        console.error('Error updating test player name:', updateError);
      } else {
        console.log('Step 4: Test player name updated successfully');
      }
      
      // Fetch the record to verify
      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', testId);
        
      if (fetchError) {
        console.error('Error fetching test player:', fetchError);
      } else {
        console.log('Step 5: Retrieved test player:', data);
      }
      
    } catch (err) {
      console.error('Exception in test:', err);
    }
  };

  // Test with the new field
  const testNewField = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // Update with the test field
      const { error } = await supabase
        .from('players')
        .update({ test_field: 'Test value' })
        .eq('id', playerId);
        
      if (error) {
        console.error('Error updating test field:', error);
        alert(`Error: ${error.message}`);
      } else {
        console.log('Test field updated successfully');
        alert('Test field updated successfully');
      }
    } catch (err) {
      console.error('Exception:', err);
      alert(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Add this to your App component
  const testTileSync = async () => {
    // Place a test tile with a unique identifier
    const testX = Math.floor(Math.random() * 20);
    const testY = Math.floor(Math.random() * 20);
    const testType: TileType = 'grass';
    const timestamp = Date.now();
    
    console.log(`TILE SYNC TEST: Placing test tile at (${testX}, ${testY}) with timestamp ${timestamp}`);
    
    try {
      await handleTilePlace(testX, testY, testType);
      
      // Check if our local state updated
      setTimeout(() => {
        const tileKey = `${testX}-${testY}`;
        const localTile = tiles[tileKey];
        
        console.log('TILE SYNC TEST: Local state after 500ms:', localTile ? 'Tile exists' : 'No tile found');
        
        // Fetch directly from Supabase to verify
        const checkDatabase = async () => {
          try {
            const { supabase } = await import('./supabase/client');
            const { data, error } = await supabase
              .from('tiles')
              .select('*')
              .eq('id', tileKey);
              
            if (error) {
              console.error('TILE SYNC TEST: Error checking database:', error);
            } else {
              console.log(`TILE SYNC TEST: Database check result (${data.length} tiles found):`, data);
            }
          } catch (err) {
            console.error('TILE SYNC TEST: Exception checking database:', err);
          }
        };
        
        checkDatabase();
        
        // Alert the result
        alert(`Tile sync test:\nPlaced test tile at (${testX}, ${testY})\nLocal state: ${localTile ? 'Updated ✓' : 'Failed ✗'}\nCheck console for database verification`);
      }, 500);
    } catch (err) {
      console.error('TILE SYNC TEST: Error in test:', err);
      alert(`Tile sync test failed with error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Add this to your App component
  const checkTilesTable = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // Check if the tiles table exists and its structure
      const { data, error } = await supabase
        .from('tiles')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error checking tiles table:', error);
        alert(`Error checking tiles table: ${error.message}`);
      } else {
        console.log('Tiles table structure (sample):', data);
        
        // Query for column information
        const { data: columnInfo, error: columnError } = await supabase.rpc(
          'get_column_info',
          { table_name: 'tiles' }
        );
        
        if (columnError) {
          console.error('Error getting column info:', columnError);
          
          // Alternative approach - check a specific field directly
          alert('Unable to get column information. Please check the Supabase dashboard for the structure of the tiles table.');
        } else {
          console.log('Tiles table column information:', columnInfo);
          alert(`Tiles table column information: ${JSON.stringify(columnInfo, null, 2)}`);
        }
      }
    } catch (err) {
      console.error('Error checking tiles table:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Add this utility function to your App component
  const setupTilesTable = async () => {
    try {
      const { supabase } = await import('./supabase/client');
      
      // Drop the existing table if it exists
      const { error: dropError } = await supabase.rpc('drop_table_if_exists', { table_name: 'tiles' });
      
      if (dropError) {
        console.error('Error dropping existing tiles table:', dropError);
        alert(`Error dropping existing tiles table: ${dropError.message}`);
        return;
      }
      
      // Create the tiles table with UUID as primary key
      const { error: createError } = await supabase.rpc('create_tiles_table');
      
      if (createError) {
        console.error('Error creating tiles table:', createError);
        alert(`Error creating tiles table: ${createError.message}`);
        return;
      }
      
      alert('Tiles table created successfully with UUID as primary key!');
      
      // Refresh the page to ensure everything is using the new table structure
      window.location.reload();
    } catch (err) {
      console.error('Error setting up tiles table:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1><span className="game-icon">🏙️</span> Lo-Fi Town Builder</h1>
        <div className="connection-status">
          <span className={usingSupabase ? 'status-good' : 'status-warning'}>
            {usingSupabase ? 'Supabase Connected' : 'Demo Mode'} 
          </span>
        </div>
      </header>
      
      <div className="game-container">
        <div className="game-area">
          <ErrorBoundary fallback={<GameFallback error="Game rendering error" />}>
            <GameRenderer 
              tiles={tiles}
              players={players}
              selectedTile={selectedTile}
              playerId={playerId}
              onTilePlace={handleTilePlace}
              setPlayers={setPlayers}
            />
          </ErrorBoundary>
        </div>
        
        <div className="game-sidebar">
          <TilePalette 
            selectedTile={selectedTile} 
            onSelectTile={setSelectedTile} 
          />
          
          <PlayerList 
            players={players} 
            currentPlayerId={playerId}
            getPlayerName={getPlayerName} 
          />
        </div>
      </div>
      
      <div className="player-info">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          className="player-name-input"
        />
      </div>
      
      <Chat 
        playerId={playerId} 
        playerName={playerName}
        getPlayerName={getPlayerName}
      />
      
      <PlayerCounter playerId={playerId} />

      <div style={{ position: 'absolute', bottom: '50px', right: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={checkTilesTable}
          style={{
            padding: '8px 16px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Tiles Table
        </button>
        
        <button 
          onClick={setupTilesTable}
          style={{
            padding: '8px 16px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Setup Tiles Table
        </button>
        
        <button 
          onClick={testTileSync}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Tile Sync
        </button>
      </div>
    </div>
  )
}

export default App
