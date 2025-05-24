import React, { useState, useEffect } from 'react';
import { supabase } from './supabase/client';
import GameRenderer from './game/GameRenderer';
import TilePalette from './components/TilePalette';
import TownInfoPanel from './components/TownInfoPanel';
import ChallengePanel from './components/ChallengePanel';
import Chat from './components/Chat';
import WeatherDisplay from './components/WeatherDisplay';
import type { Tile, Player, TileType } from './types/game';
import { placeTile, subscribeTiles, subscribePlayers } from './supabase/tileService';
import { initializeGameTime, updateGameTime, formatGameTime } from './game/TimeSystem';
import { generateWeather, updateWeather } from './game/WeatherSystem';
import { generateChallenges, checkChallengeCompletion } from './game/Challenges';
import type { GameTime } from './game/TimeSystem';
import type { Challenge } from './game/Challenges';
import './App.css';

// Define Weather type locally to avoid import conflicts
interface WeatherData {
  type: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
  intensity: number;
  duration: number;
  timeRemaining: number;
  effects: {
    visualFilter: string;
    scoreMultiplier: number;
  };
}

function App() {
  const [tiles, setTiles] = useState<Record<string, Tile>>({});
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [selectedTile, setSelectedTile] = useState<TileType>('grass');
  const [playerId] = useState(() => `player-${Date.now()}-${Math.random()}`);
  const [playerName, setPlayerName] = useState('Anonymous');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [gameTime, setGameTime] = useState<GameTime>(initializeGameTime());
  const [weather, setWeather] = useState<WeatherData>(generateWeather());
  const [challenges, setChallenges] = useState<Challenge[]>(generateChallenges());
  const [townScore, setTownScore] = useState(0);
  
  // New state for toggleable sections
  const [activeSection, setActiveSection] = useState<string | null>('tiles');

  // Subscribe to tiles and players
  useEffect(() => {
    const tilesSubscription = subscribeTiles((tile: Tile) => {
      setTiles(prev => {
        const tileKey = `${tile.x}-${tile.y}`;
        if (tile.type === 'empty') {
          const newTiles = { ...prev };
          delete newTiles[tileKey];
          return newTiles;
        } else {
          return { ...prev, [tileKey]: tile };
        }
      });
    });

    const playersSubscription = subscribePlayers((playerId: string, x: number, y: number) => {
      setPlayers(prev => ({
        ...prev,
        [playerId]: {
          id: playerId,
          cursor: { x, y },
          lastPlaced: Date.now()
        }
      }));
    });

    setConnectionStatus('connected');

    return () => {
      tilesSubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  }, []);

  // Game time and weather updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGameTime(prev => updateGameTime(prev));
      setWeather(prev => updateWeather(prev));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate town score
  useEffect(() => {
    const score = Object.values(tiles).reduce((total, tile) => {
      if (tile.type === 'house') return total + 10;
      if (tile.type === 'market') return total + 15;
      if (tile.type === 'forest') return total + 5;
      return total + 1;
    }, 0);
    setTownScore(Math.floor(score * weather.effects.scoreMultiplier));
  }, [tiles, weather]);

  const handleTilePlace = async (x: number, y: number, type: TileType) => {
    try {
      await placeTile(x, y, type, playerId);
    } catch (error) {
      console.error('Error placing tile:', error);
    }
  };

  const handleChallengeComplete = (challengeId: string, reward: number) => {
    setChallenges(prev => 
      prev.map(challenge => 
        challenge.id === challengeId 
          ? { ...challenge, completed: true }
          : challenge
      )
    );
    setTownScore(prev => prev + reward);
  };

  const toggleSection = (sectionName: string) => {
    setActiveSection(prev => prev === sectionName ? null : sectionName);
  };

  const getTileCount = (type: TileType): number => {
    return Object.values(tiles).filter(tile => tile.type === type).length;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>
          <span className="game-icon">🏘️</span>
          Lo-Fi Town Builder
        </h1>
        
        <div className="header-info">
          <WeatherDisplay weather={weather} gameTime={gameTime} />
          <div className="connection-status status-good">
            {Object.keys(players).length} Players Online
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Game Area */}
        <div className="game-area">
          <div className="game-renderer">
            <GameRenderer
              tiles={tiles}
              players={players}
              selectedTile={selectedTile}
              playerId={playerId}
              onTilePlace={handleTilePlace}
              setPlayers={setPlayers}
              weather={weather}
              gameTime={gameTime}
            />
          </div>
          
          {/* Always visible score */}
          <div className="score-display">
            <div className="score-value">{townScore}</div>
            <div className="score-label">points</div>
          </div>
        </div>

        {/* Toggleable Sidebar */}
        <div className="sidebar">
          {/* Section Toggles */}
          <div className="section-toggles">
            <button 
              className={`section-toggle ${activeSection === 'tiles' ? 'active' : ''}`}
              onClick={() => toggleSection('tiles')}
            >
              🎨 Tiles
            </button>
            <button 
              className={`section-toggle ${activeSection === 'town' ? 'active' : ''}`}
              onClick={() => toggleSection('town')}
            >
              🏘️ Town
            </button>
            <button 
              className={`section-toggle ${activeSection === 'challenges' ? 'active' : ''}`}
              onClick={() => toggleSection('challenges')}
            >
              🎯 Challenges
            </button>
            <button 
              className={`section-toggle ${activeSection === 'chat' ? 'active' : ''}`}
              onClick={() => toggleSection('chat')}
            >
              💬 Chat
            </button>
          </div>

          {/* Section Content */}
          <div className="section-content">
            {activeSection === 'tiles' && (
              <TilePalette
                selectedTile={selectedTile}
                onSelectTile={setSelectedTile}
              />
            )}
            
            {activeSection === 'town' && (
              <TownInfoPanel
                tiles={tiles}
              />
            )}
            
            {activeSection === 'challenges' && (
              <ChallengePanel
                challenges={challenges}
                tiles={tiles}
                onChallengeComplete={handleChallengeComplete}
              />
            )}
            
            {activeSection === 'chat' && (
              <div className="chat-section">
                <Chat playerId={playerId} playerName={playerName} />
              </div>
            )}

            {!activeSection && (
              <div className="section-empty">
                <div className="section-empty-icon">🏘️</div>
                <div className="section-empty-text">Welcome to Lo-Fi Town Builder</div>
                <div className="section-empty-subtitle">Select a section above to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player Name Input (floating) */}
      <div className="player-info">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          className="player-name-input"
        />
      </div>
    </div>
  );
}

export default App;
