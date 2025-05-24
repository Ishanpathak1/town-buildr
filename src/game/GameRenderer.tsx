import React, { useRef, useEffect, useState } from 'react';
import type { Tile, Player, TileType } from '../types/game';
import { updatePlayerCursor } from '../supabase/tileService';
import '../styles/GameRenderer.css';
import { initializeGameTime, updateGameTime, formatGameTime } from '../game/TimeSystem';
import { generateWeather, updateWeather } from '../game/WeatherSystem';
import { getRandomSpecialTile } from '../game/SpecialTiles';
import type { GameTime } from '../game/TimeSystem';
// Import type separately to avoid conflicts
import type { SpecialTile } from '../game/SpecialTiles';

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

// Tile colors and icons for rendering
const TILE_COLORS: Record<TileType, string> = {
  grass: '#a1e887',
  forest: '#2ecc71',
  house: '#e74c3c',
  market: '#f39c12',
  water: '#3498db',
  road: '#95a5a6',
  empty: '#f5f5f5'
};

const TILE_ICONS: Record<TileType, string> = {
  grass: '🌿',
  forest: '🌲',
  house: '🏠',
  market: '🏪',
  water: '💧',
  road: '🛣️',
  empty: ''
};

// Add these constants at the top of your file (before the component definition)
const GRID_SIZE = 20; // 20x20 grid
const DEFAULT_CANVAS_SIZE = 800; // Larger default canvas size in pixels

interface GameRendererProps {
  tiles: Record<string, Tile>;
  players: Record<string, Player>;
  selectedTile: TileType;
  playerId: string;
  onTilePlace: (x: number, y: number, type: TileType) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Record<string, Player>>>;
  specialTiles?: Record<string, SpecialTile>;
  weather?: WeatherData;
  gameTime?: GameTime;
}

const GameRenderer: React.FC<GameRendererProps> = ({
  tiles,
  players,
  selectedTile,
  playerId,
  onTilePlace,
  setPlayers,
  specialTiles = {},
  weather = { 
    type: 'clear', 
    intensity: 0, 
    duration: 0, 
    timeRemaining: 0, 
    effects: { visualFilter: 'none', scoreMultiplier: 1 } 
  },
  gameTime = { 
    day: 1, 
    hour: 12, 
    minute: 0, 
    isDayTime: true, 
    timeOfDay: 'day' 
  }
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_SIZE, height: DEFAULT_CANVAS_SIZE });
  const [hoveredTile, setHoveredTile] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [tileSize, setTileSize] = useState(32); // Pixels per tile
  const [showHelp, setShowHelp] = useState(false);
  
  // Update current player's cursor position based on mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const cellSize = rect.width / GRID_SIZE;
    
    // Calculate grid coordinates
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    // Ensure coordinates are within grid bounds
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      setHoveredTile({ x, y });
      
      // Update player cursor
      updatePlayerCursor(playerId, x, y).catch(err => {
        console.error("Error updating cursor position:", err);
      });
      
      // Update local player state
      setPlayers(prev => ({
        ...prev,
        [playerId]: {
          ...prev[playerId],
          cursor: { x, y },
          lastPlaced: prev[playerId]?.lastPlaced || 0
        }
      }));
    }
  };
  
  // Start dragging (panning the camera)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle mouse button or right mouse button for panning
    if (e.button === 1 || e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Stop dragging
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
  };
  
  // Add this helper function inside your component
  const ensureValidCoordinates = (x: number, y: number) => {
    // Ensure coordinates are within grid bounds
    return {
      x: Math.min(Math.max(0, x), GRID_SIZE - 1),
      y: Math.min(Math.max(0, y), GRID_SIZE - 1)
    };
  };
  
  // Then use it in your handleClick function
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoveredTile) return;
    
    // Ensure coordinates are valid
    const { x, y } = ensureValidCoordinates(hoveredTile.x, hoveredTile.y);
    
    // Check if this tile is already occupied
    const tileKey = `${x}-${y}`;
    if (tiles[tileKey] && tiles[tileKey].type !== 'empty') {
      return; // Can't place a tile where one already exists
    }
    
    // Handle tile placement
    console.log('Placing tile:', selectedTile, 'at position:', x, y);
    onTilePlace(x, y, selectedTile);
  };
  
  // Prevent context menu on right-click
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    return false;
  };
  
  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // This is a simplified example; in a real implementation,
    // you'd adjust the tile size or scale based on wheel delta
    // and recalculate the camera offset to zoom toward the cursor
  };

  // Toggle help
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };
  
  // Set up canvas and draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set up a resize handler that maintains aspect ratio
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      // Get the container dimensions
      const containerRect = container.getBoundingClientRect();
      
      // Use a larger percentage of the available container space
      let size = Math.min(
        Math.max(containerRect.width, DEFAULT_CANVAS_SIZE), 
        Math.max(containerRect.height, DEFAULT_CANVAS_SIZE)
      );
      
      // Ensure the size is a multiple of the grid size for even cell dimensions
      size = Math.floor(size / GRID_SIZE) * GRID_SIZE;
      
      // Set a minimum size - increased from 320px
      size = Math.max(size, DEFAULT_CANVAS_SIZE); // Minimum size is now DEFAULT_CANVAS_SIZE
      
      // Update canvas dimensions
      canvas.width = size;
      canvas.height = size;
      
      // Update the state for other calculations
      setCanvasSize({ width: size, height: size });
      
      // Update tile size based on canvas dimensions
      const newTileSize = size / GRID_SIZE;
      setTileSize(newTileSize);
    };
    
    // Call once to initialize
    updateCanvasSize();
    
    // Set up listener for window resize
    window.addEventListener('resize', updateCanvasSize);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);
  
  // Add a function to get the canvas filter based on weather and time of day
  const getCanvasFilter = () => {
    let filter = weather.effects.visualFilter;
    
    // Apply day/night effects
    if (!gameTime.isDayTime) {
      if (gameTime.timeOfDay === 'dusk') {
        filter += ' brightness(0.9) sepia(0.2)';
      } else if (gameTime.timeOfDay === 'night') {
        filter += ' brightness(0.7) saturate(0.8)';
      }
    } else if (gameTime.timeOfDay === 'dawn') {
      filter += ' brightness(0.9) sepia(0.3)';
    }
    
    return filter;
  };
  
  // Modify the drawing effect to apply weather and time filters
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Apply weather and time of day filter
    const filter = getCanvasFilter();
    if (filter !== 'none') {
      ctx.filter = filter;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the exact tile size
    const cellSize = canvas.width / GRID_SIZE;
    
    // Draw grid background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.beginPath();
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 1;
    
    // Draw vertical grid lines
    for (let x = 0; x <= GRID_SIZE; x++) {
      const xPos = Math.floor(x * cellSize) + 0.5; // +0.5 for crisp lines
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
    }
    
    // Draw horizontal grid lines
    for (let y = 0; y <= GRID_SIZE; y++) {
      const yPos = Math.floor(y * cellSize) + 0.5; // +0.5 for crisp lines
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
    }
    
    ctx.stroke();
    
    // Draw tiles
    Object.values(tiles).forEach(tile => {
      if (!tile || tile.type === 'empty') return;
      
      const x = tile.x * cellSize;
      const y = tile.y * cellSize;
      
      // Draw tile background
      ctx.fillStyle = TILE_COLORS[tile.type];
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      
      // Draw tile icon
      ctx.fillStyle = 'black';
      ctx.font = `${Math.floor(cellSize * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(TILE_ICONS[tile.type], x + cellSize / 2, y + cellSize / 2);
    });
    
    // Draw hover effect
    if (hoveredTile) {
      const x = hoveredTile.x * cellSize;
      const y = hoveredTile.y * cellSize;
      const tileKey = `${hoveredTile.x}-${hoveredTile.y}`;
      
      // Only show hover if no tile exists
      if (!tiles[tileKey] || tiles[tileKey].type === 'empty') {
        // Draw semi-transparent preview
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = TILE_COLORS[selectedTile];
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        
        // Draw preview icon
        ctx.fillStyle = 'black';
        ctx.font = `${Math.floor(cellSize * 0.6)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TILE_ICONS[selectedTile], x + cellSize / 2, y + cellSize / 2);
        ctx.globalAlpha = 1.0;
      }
      
      // Always draw hover border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }
    
    // Draw player cursors
    Object.values(players).forEach(player => {
      if (!player || !player.cursor || player.id === playerId) return;
      
      const x = player.cursor.x * cellSize;
      const y = player.cursor.y * cellSize;
      
      // Draw cursor
      ctx.fillStyle = generatePlayerColor(player.id);
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 4, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Reset filter when done
    ctx.filter = 'none';
  }, [tiles, players, hoveredTile, selectedTile, canvasSize, weather, gameTime]);
  
  // Helper function to generate a consistent color from player ID
  const generatePlayerColor = (id?: string): string => {
    // Default color if ID is undefined
    if (!id) return 'rgb(150, 150, 150)';
    
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
  
  // Update the tile drawing code to handle special tiles
  const drawTile = (ctx: CanvasRenderingContext2D, tile: Tile, screenX: number, screenY: number) => {
    const tileKey = `${tile.x}-${tile.y}`;
    const isSpecial = specialTiles && specialTiles[tileKey];
    
    // Draw tile background
    ctx.fillStyle = TILE_COLORS[tile.type];
    ctx.fillRect(screenX, screenY, tileSize, tileSize);
    
    // Add special effects for special tiles
    if (isSpecial) {
      // Draw a glowing border
      ctx.strokeStyle = 'gold';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX, screenY, tileSize, tileSize);
      
      // Add sparkling effect
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        const sparkX = screenX + Math.sin(now / 500 + i * 2) * (tileSize / 3) + tileSize / 2;
        const sparkY = screenY + Math.cos(now / 500 + i * 2) * (tileSize / 3) + tileSize / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Draw regular tile border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, tileSize, tileSize);
    }
    
    // Draw tile icon/symbol
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      TILE_ICONS[tile.type],
      screenX + tileSize / 2,
      screenY + tileSize / 2
    );
    
    // Add special tile indicator if applicable
    if (isSpecial) {
      ctx.fillStyle = 'white';
      ctx.font = 'bold 8px Arial';
      ctx.fillText(
        '✨',
        screenX + tileSize / 4,
        screenY + tileSize / 4
      );
    }
  };
  
  return (
    <div className="game-renderer" data-weather={weather.type} data-time={gameTime.timeOfDay}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      />
      
      {/* Visual effect overlays */}
      {weather.type === 'rainy' && (
        <div className="rain-effect"></div>
      )}
      {weather.type === 'snowy' && (
        <div className="snow-effect"></div>
      )}
      {weather.type === 'foggy' && (
        <div className="fog-effect"></div>
      )}
      
      {/* Game controls */}
      <div className="game-controls">
        <button className="control-button" onClick={toggleHelp} title="Help">❓</button>
      </div>
      
      {/* Help panel */}
      {showHelp && (
        <div className="game-help">
          <p>🖱️ Click to place a tile</p>
          <p>🔄 Select tiles from the palette</p>
          <p>👥 Other players are shown as circles</p>
          <p>💧 Place water near houses for bonuses</p>
          <p>🏠 Houses near markets are more valuable</p>
        </div>
      )}
    </div>
  );
};

export default GameRenderer; 