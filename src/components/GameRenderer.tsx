import React, { useRef, useState, useEffect } from 'react';
import '../styles/Game.css';
import { updatePlayerCursor } from '../supabase/tileService';
import type { Tile, TileType, Player } from '../types/game';

// Constants
const TILE_COLORS: Record<TileType, string> = {
  'empty': 'transparent',
  'grass': '#90ee90',
  'forest': '#228b22',
  'water': '#87cefa',
  'house': '#cd853f',
  'market': '#daa520',
  'road': '#a9a9a9'
};

const TILE_ICONS: Record<TileType, string> = {
  'empty': '',
  'grass': '🌿',
  'forest': '🌲',
  'water': '💧',
  'house': '🏠',
  'market': '🏪',
  'road': '🛣️'
};

// Generate consistent colors for players
const generatePlayerColor = (id: string) => {
  // Simple hash function for consistent colors
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // List of nice colors
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFA500', '#45B8AC', '#9370DB', 
    '#FF69B4', '#20B2AA', '#6A5ACD', '#00CED1', '#FF7F50'
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Get emoji for player avatar
const getPlayerEmoji = (id: string) => {
  const emojis = ['👨', '👩', '🧑', '👧', '👦', '👵', '👴', '🧔', '👱', '👸', '🤴', '🧙', '🧚', '🧛', '🧜', '🧝'];
  const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % emojis.length;
  return emojis[index];
};

interface GameRendererProps {
  tiles: Record<string, Tile>;
  players: Record<string, Player>;
  selectedTile: TileType;
  playerId: string;
  onTilePlace: (x: number, y: number, type: TileType) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Record<string, Player>>>;
}

const GameRenderer: React.FC<GameRendererProps> = ({
  tiles,
  players,
  selectedTile,
  playerId,
  onTilePlace,
  setPlayers
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [hoveredTile, setHoveredTile] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [tileSize, setTileSize] = useState(32); // Pixels per tile
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  
  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      
      if (parent) {
        const width = parent.clientWidth;
        const height = parent.clientHeight;
        
        setCanvasSize({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    };
    
    window.addEventListener('resize', updateCanvasSize);
    updateCanvasSize();
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);
  
  // Update current player's cursor position based on mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + cameraOffset.x) / (tileSize * zoomLevel));
    const y = Math.floor((e.clientY - rect.top + cameraOffset.y) / (tileSize * zoomLevel));
    
    // Update hovered tile
    setHoveredTile({ x, y });
    
    // Update player cursor position in state and send to other players
    updatePlayerCursor(playerId, x, y).catch(err => {
      console.error("Error updating cursor position:", err);
    });
    
    // Also update the local player state for immediate feedback
    setPlayers(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        cursor: { x, y },
        lastPlaced: prev[playerId]?.lastPlaced || 0
      }
    }));
    
    // Handle dragging (panning the camera)
    if (isDragging) {
      setCameraOffset({
        x: cameraOffset.x + (dragStart.x - e.clientX) / zoomLevel,
        y: cameraOffset.y + (dragStart.y - e.clientY) / zoomLevel
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle mouse down (start dragging)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only drag with right mouse button
    if (e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Handle mouse up (stop dragging)
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      setIsDragging(false);
    }
  };
  
  // Handle mouse leave (stop dragging)
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  // Handle tile placement
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !hoveredTile || isDragging) return;
    
    const { x, y } = hoveredTile;
    onTilePlace(x, y, selectedTile);
  };
  
  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel * zoomFactor));
    
    // Update zoom level
    setZoomLevel(newZoom);
    
    // Adjust tile size based on zoom
    setTileSize(32 * newZoom);
  };
  
  // Prevent context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };
  
  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Calculate grid dimensions
    const tilesX = Math.ceil(canvasSize.width / (tileSize * zoomLevel)) + 1;
    const tilesY = Math.ceil(canvasSize.height / (tileSize * zoomLevel)) + 1;
    
    // Calculate starting positions for grid
    const startX = Math.floor(cameraOffset.x / (tileSize * zoomLevel));
    const startY = Math.floor(cameraOffset.y / (tileSize * zoomLevel));
    
    // Draw background
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= tilesX; x++) {
        const posX = x * tileSize * zoomLevel - (cameraOffset.x % (tileSize * zoomLevel));
        ctx.beginPath();
        ctx.moveTo(posX, 0);
        ctx.lineTo(posX, canvasSize.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= tilesY; y++) {
        const posY = y * tileSize * zoomLevel - (cameraOffset.y % (tileSize * zoomLevel));
        ctx.beginPath();
        ctx.moveTo(0, posY);
        ctx.lineTo(canvasSize.width, posY);
        ctx.stroke();
      }
    }
    
    // Draw tiles
    Object.values(tiles).forEach(tile => {
      const screenX = tile.x * tileSize * zoomLevel - cameraOffset.x;
      const screenY = tile.y * tileSize * zoomLevel - cameraOffset.y;
      
      // Skip tiles outside of viewport
      if (
        screenX + tileSize * zoomLevel < 0 ||
        screenY + tileSize * zoomLevel < 0 ||
        screenX > canvasSize.width ||
        screenY > canvasSize.height
      ) {
        return;
      }
      
      // Draw tile background
      ctx.fillStyle = TILE_COLORS[tile.type];
      ctx.fillRect(screenX, screenY, tileSize * zoomLevel, tileSize * zoomLevel);
      
      // Draw tile border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenX, screenY, tileSize * zoomLevel, tileSize * zoomLevel);
      
      // Draw tile icon/symbol
      ctx.fillStyle = '#000000';
      ctx.font = `${16 * zoomLevel}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        TILE_ICONS[tile.type],
        screenX + tileSize * zoomLevel / 2,
        screenY + tileSize * zoomLevel / 2
      );
      
      // Show coordinates if enabled
      if (showCoordinates && zoomLevel > 1.5) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.font = `${8 * zoomLevel}px Arial`;
        ctx.fillText(
          `${tile.x},${tile.y}`,
          screenX + tileSize * zoomLevel / 2,
          screenY + tileSize * zoomLevel - 6 * zoomLevel
        );
      }
    });
    
    // Draw hovered tile preview
    if (hoveredTile) {
      const { x, y } = hoveredTile;
      const tileKey = `${x}-${y}`;
      const existingTile = tiles[tileKey];
      
      // Only draw preview if there's no tile already placed
      if (!existingTile || existingTile.type === 'empty') {
        const screenX = x * tileSize * zoomLevel - cameraOffset.x;
        const screenY = y * tileSize * zoomLevel - cameraOffset.y;
        
        // Draw preview with transparency
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = TILE_COLORS[selectedTile];
        ctx.fillRect(screenX, screenY, tileSize * zoomLevel, tileSize * zoomLevel);
        
        // Draw tile icon/symbol
        ctx.fillStyle = '#000000';
        ctx.font = `${16 * zoomLevel}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          TILE_ICONS[selectedTile],
          screenX + tileSize * zoomLevel / 2,
          screenY + tileSize * zoomLevel / 2
        );
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Draw other players' cursors
    Object.values(players).forEach(player => {
      if (player.id === playerId) return; // Skip current player
      
      const screenX = player.cursor.x * tileSize * zoomLevel - cameraOffset.x;
      const screenY = player.cursor.y * tileSize * zoomLevel - cameraOffset.y;
      
      // Skip players outside of viewport
      if (
        screenX + tileSize * zoomLevel < 0 ||
        screenY + tileSize * zoomLevel < 0 ||
        screenX > canvasSize.width ||
        screenY > canvasSize.height
      ) {
        return;
      }
      
      // Generate a consistent color for each player based on their ID
      const playerColor = generatePlayerColor(player.id);
      
      // Draw cursor with player-specific color
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(
        screenX + tileSize * zoomLevel / 2,
        screenY + tileSize * zoomLevel / 2,
        8 * zoomLevel, // Make cursor slightly larger
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw a small label with player ID
      const displayId = player.id.slice(0, 4); // Just show first few characters
      ctx.fillStyle = playerColor;
      ctx.font = `bold ${12 * zoomLevel}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(
        displayId,
        screenX + tileSize * zoomLevel / 2,
        screenY - 8 * zoomLevel
      );
      
      // Draw emoji avatar
      ctx.font = `${16 * zoomLevel}px Arial`;
      ctx.fillStyle = 'white';
      ctx.fillText(
        getPlayerEmoji(player.id),
        screenX + tileSize * zoomLevel / 2,
        screenY + tileSize * zoomLevel / 2
      );
    });
    
    // Draw mini-map in corner
    const mapSize = 100;
    const mapPadding = 10;
    const mapX = canvasSize.width - mapSize - mapPadding;
    const mapY = canvasSize.height - mapSize - mapPadding;
    
    // Draw map background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    
    // Draw tiles on mini-map
    const allTiles = Object.values(tiles);
    if (allTiles.length > 0) {
      // Calculate bounds
      let minX = allTiles[0].x;
      let maxX = allTiles[0].x;
      let minY = allTiles[0].y;
      let maxY = allTiles[0].y;
      
      allTiles.forEach(tile => {
        minX = Math.min(minX, tile.x);
        maxX = Math.max(maxX, tile.x);
        minY = Math.min(minY, tile.y);
        maxY = Math.max(maxY, tile.y);
      });
      
      // Add some padding
      minX -= 5;
      minY -= 5;
      maxX += 5;
      maxY += 5;
      
      // Calculate scale
      const worldWidth = maxX - minX;
      const worldHeight = maxY - minY;
      const scale = Math.min(mapSize / worldWidth, mapSize / worldHeight, 1);
      
      // Draw viewport indicator
      const viewportX = mapX + (cameraOffset.x / (tileSize * zoomLevel) - minX) * scale;
      const viewportY = mapY + (cameraOffset.y / (tileSize * zoomLevel) - minY) * scale;
      const viewportWidth = (canvasSize.width / (tileSize * zoomLevel)) * scale;
      const viewportHeight = (canvasSize.height / (tileSize * zoomLevel)) * scale;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);
      
      // Draw tiles
      allTiles.forEach(tile => {
        const dotX = mapX + (tile.x - minX) * scale;
        const dotY = mapY + (tile.y - minY) * scale;
        
        ctx.fillStyle = TILE_COLORS[tile.type];
        ctx.fillRect(dotX, dotY, scale, scale);
      });
      
      // Draw players
      Object.values(players).forEach(player => {
        const dotX = mapX + (player.cursor.x - minX) * scale;
        const dotY = mapY + (player.cursor.y - minY) * scale;
        
        const playerColor = player.id === playerId ? '#ff0000' : generatePlayerColor(player.id);
        
        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw UI controls
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 120, 40);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 10, 120, 40);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Zoom: ${zoomLevel.toFixed(1)}x`, 20, 30);
    
    // Draw zoom buttons
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(90, 15, 30, 30);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('+', 105, 35);
    
    // Draw toggle grid button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 60, 120, 30);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 60, 120, 30);
    
    ctx.fillStyle = showGrid ? '#4CAF50' : '#ccc';
    ctx.fillRect(15, 65, 20, 20);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(15, 65, 20, 20);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Show Grid', 45, 80);
    
    // Draw toggle coordinates button
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 100, 120, 30);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 100, 120, 30);
    
    ctx.fillStyle = showCoordinates ? '#4CAF50' : '#ccc';
    ctx.fillRect(15, 105, 20, 20);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(15, 105, 20, 20);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Show Coords', 45, 120);
    
    // Draw player count
    const playerCount = Object.keys(players).length;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 140, 120, 30);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 140, 120, 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Players: ${playerCount}`, 20, 160);
    
    // Draw selected tile indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 180, 120, 40);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, 180, 120, 40);
    
    ctx.fillStyle = TILE_COLORS[selectedTile];
    ctx.fillRect(15, 185, 30, 30);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(15, 185, 30, 30);
    
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(TILE_ICONS[selectedTile], 30, 205);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(selectedTile.charAt(0).toUpperCase() + selectedTile.slice(1), 55, 205);
    
  }, [tiles, players, canvasSize, cameraOffset, tileSize, zoomLevel, hoveredTile, selectedTile, showGrid, showCoordinates, playerId]);
  
  // Handle UI button clicks
  const handleToggleGrid = () => {
    setShowGrid(!showGrid);
  };
  
  const handleToggleCoordinates = () => {
    setShowCoordinates(!showCoordinates);
  };
  
  const handleZoomIn = () => {
    const newZoom = Math.min(3, zoomLevel * 1.2);
    setZoomLevel(newZoom);
    setTileSize(32 * newZoom);
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(0.5, zoomLevel / 1.2);
    setZoomLevel(newZoom);
    setTileSize(32 * newZoom);
  };
  
  const handleResetCamera = () => {
    setCameraOffset({ x: 0, y: 0 });
  };
  
  // Check if player clicked on UI elements
  const handleUIClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check zoom button
    if (x >= 90 && x <= 120 && y >= 15 && y <= 45) {
      handleZoomIn();
      return true;
    }
    
    // Check grid toggle
    if (x >= 10 && x <= 130 && y >= 60 && y <= 90) {
      handleToggleGrid();
      return true;
    }
    
    // Check coordinates toggle
    if (x >= 10 && x <= 130 && y >= 100 && y <= 130) {
      handleToggleCoordinates();
      return true;
    }
    
    return false;
  };
  
  // Combined click handler
  const combinedClickHandler = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (handleUIClick(e)) {
      return; // If UI was clicked, don't process as a tile click
    }
    
    handleClick(e);
  };
  
  return (
    <div className="game-renderer">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={combinedClickHandler}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        className="game-canvas"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      />
      
      <div className="game-controls">
        <div className="control-buttons">
          <button onClick={handleZoomIn} className="control-btn">+</button>
          <button onClick={handleZoomOut} className="control-btn">-</button>
          <button onClick={handleResetCamera} className="control-btn">Center</button>
        </div>
        <div className="control-toggles">
          <label className="control-toggle">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={handleToggleGrid}
            />
            Show Grid
          </label>
          <label className="control-toggle">
            <input
              type="checkbox"
              checked={showCoordinates}
              onChange={handleToggleCoordinates}
            />
            Show Coordinates
          </label>
        </div>
      </div>
      
      <div className="player-info">
        <div className="online-players">
          <h3>Online Players ({Object.keys(players).length})</h3>
          <ul>
            {Object.values(players).map(player => (
              <li key={player.id} style={{ color: generatePlayerColor(player.id) }}>
                {getPlayerEmoji(player.id)} {player.id.substring(0, 8)}
                {player.id === playerId && ' (You)'}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="game-help">
        <p>Left-click: Place tile</p>
        <p>Right-click drag: Pan camera</p>
        <p>Mouse wheel: Zoom in/out</p>
      </div>
    </div>
  );
};

export default GameRenderer;