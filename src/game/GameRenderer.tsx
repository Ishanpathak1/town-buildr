import React, { useRef, useEffect, useState } from 'react';
import type { Tile, Player, TileType } from '../types/game';
import { updatePlayerCursor } from '../supabase/tileService';
import '../styles/GameRenderer.css';

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
  
  // Update current player's cursor position based on mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left + cameraOffset.x) / tileSize);
    const y = Math.floor((e.clientY - rect.top + cameraOffset.y) / tileSize);
    
    // Update hovered tile
    setHoveredTile({ x, y });
    
    // Add this log
    console.log(`Sending cursor position (${x}, ${y}) to Supabase`);
    
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
        x: cameraOffset.x + (dragStart.x - e.clientX),
        y: cameraOffset.y + (dragStart.y - e.clientY)
      });
      setDragStart({ x: e.clientX, y: e.clientY });
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
  
  // Handle tile placement on click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hoveredTile) return;
    
    const { x, y } = hoveredTile;
    
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
  
  // Set up canvas and draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size based on container
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        setCanvasSize({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    };
    
    // Initial size update
    updateCanvasSize();
    
    // Add resize listener
    window.addEventListener('resize', updateCanvasSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);
  
  // Draw the game whenever relevant state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate visible grid area
    const startX = Math.floor(cameraOffset.x / tileSize);
    const startY = Math.floor(cameraOffset.y / tileSize);
    const visibleTilesX = Math.ceil(canvas.width / tileSize) + 1;
    const visibleTilesY = Math.ceil(canvas.height / tileSize) + 1;
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= visibleTilesX; x++) {
      const xPos = x * tileSize - (cameraOffset.x % tileSize);
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= visibleTilesY; y++) {
      const yPos = y * tileSize - (cameraOffset.y % tileSize);
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
      ctx.stroke();
    }
    
    // Draw placed tiles
    for (let x = startX; x < startX + visibleTilesX; x++) {
      for (let y = startY; y < startY + visibleTilesY; y++) {
        const tileKey = `${x}-${y}`;
        const tile = tiles[tileKey];
        
        if (tile && tile.type !== 'empty') {
          const screenX = x * tileSize - cameraOffset.x;
          const screenY = y * tileSize - cameraOffset.y;
          
          // Draw tile background
          ctx.fillStyle = TILE_COLORS[tile.type];
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          
          // Draw tile border
          ctx.strokeStyle = '#00000033';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
          
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
        }
      }
    }
    
    // Draw hovered tile preview
    if (hoveredTile) {
      const { x, y } = hoveredTile;
      const tileKey = `${x}-${y}`;
      const existingTile = tiles[tileKey];
      
      // Only draw preview if there's no tile already placed
      if (!existingTile || existingTile.type === 'empty') {
        const screenX = x * tileSize - cameraOffset.x;
        const screenY = y * tileSize - cameraOffset.y;
        
        // Draw preview with transparency
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = TILE_COLORS[selectedTile];
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
        
        // Draw tile icon/symbol
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          TILE_ICONS[selectedTile],
          screenX + tileSize / 2,
          screenY + tileSize / 2
        );
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Draw other players' cursors
    Object.values(players).forEach(player => {
      // Skip invalid players or current player
      if (!player || !player.id || player.id === playerId || !player.cursor) return;
      
      const screenX = player.cursor.x * tileSize - cameraOffset.x;
      const screenY = player.cursor.y * tileSize - cameraOffset.y;
      
      // Generate a consistent color for each player based on their ID
      const playerColor = generatePlayerColor(player.id);
      
      // Draw cursor with player-specific color
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(
        screenX + tileSize / 2,
        screenY + tileSize / 2,
        8, // Make cursor slightly larger
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw a small label with player ID - safely get the first few characters
      const displayId = player.id && player.id.length > 0 ? player.id.slice(0, 4) : 'anon';
      ctx.fillStyle = playerColor;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        displayId,
        screenX + tileSize / 2,
        screenY - 8
      );
    });
    
  }, [tiles, players, hoveredTile, selectedTile, playerId, cameraOffset, canvasSize, tileSize]);
  
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
  
  return (
    <div className="game-renderer" data-tile={selectedTile}>
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
    </div>
  );
};

export default GameRenderer; 