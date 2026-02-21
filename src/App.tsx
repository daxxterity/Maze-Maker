import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group, Text } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Play, 
  Hammer, 
  RotateCw, 
  Download, 
  Upload, 
  Trash2, 
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Zap,
  Move,
  Skull,
  ToggleLeft,
  ToggleRight,
  GripHorizontal
} from 'lucide-react';
import { cn } from './lib/utils';
import { TileType, TileData, GameMode, DungeonMap } from './types';
import { TILE_LIBRARY, TileDefinition } from './constants';

const GRID_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// --- Components ---

const TileIcon = ({ type, rotation, size = 1, color }: { type: TileType, rotation: number, size?: number, color: string }) => {
  const s = size * 20;
  return (
    <div 
      className="w-10 h-10 flex items-center justify-center border border-white/10 rounded bg-zinc-800 overflow-hidden"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <div 
        className="w-6 h-6 rounded-sm" 
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

const TileRenderer = ({ 
  tile, 
  hasArtefact, 
  isPowerUpActive, 
  powerUpTimeLeft, 
  powerUpDuration, 
  tick,
  mode
}: { 
  tile: TileData, 
  hasArtefact: boolean, 
  isPowerUpActive: boolean, 
  powerUpTimeLeft: number,
  powerUpDuration: number,
  tick: number,
  mode: GameMode
}) => {
  const { type, x, y, rotation, size } = tile;
  const tileDef = TILE_LIBRARY.find(t => t.type === type);
  const isItem = tileDef?.category === 'item';
  const isPowerUp = tileDef?.category === 'power-up';
  const isMonster = tileDef?.category === 'monster';
  
  const pixelX = x * GRID_SIZE;
  const pixelY = y * GRID_SIZE;
  const s = size * GRID_SIZE;
  const center = s / 2;

  const getTileContent = () => {
    const drawSize = isItem || isPowerUp || isMonster ? s - 8 : s;
    const drawOffset = isItem || isPowerUp || isMonster ? 4 : 0;
    const drawCenter = drawSize / 2;

    switch (type) {
      case 'corridor':
        return (
          <>
            <Rect width={s} height={s} fill="#4b5563" />
            <Line points={[0, 0, s, 0]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[0, s, s, s]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'corner':
        return (
          <>
            <Rect width={s} height={s} fill="#4b5563" />
            <Line points={[0, 0, s, 0]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[0, 0, 0, s]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 't-junction':
        return (
          <>
            <Rect width={s} height={s} fill="#4b5563" />
            <Line points={[0, 0, s, 0]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'open-floor':
        return <Rect width={s} height={s} fill="#6b7280" />;
      case 'one-side':
        return (
          <>
            <Rect width={s} height={s} fill="#4b5563" />
            <Line points={[0, 0, s, 0]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'cul-de-sac':
        return (
          <>
            <Rect width={s} height={s} fill="#4b5563" />
            <Line points={[0, 0, s, 0]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[0, 0, 0, s]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[s, 0, s, s]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'entrance':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#10b981" opacity={0.6} />
            <Text text="START" fontSize={8} fill="white" x={2} y={10} />
          </Group>
        );
      case 'lava':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#ef4444" />;
      case 'water':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#3b82f6" />;
      case 'bridge':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#92400e" />;
      case 'stairs':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#78350f" />
            {[...Array(4)].map((_, i) => (
              <Line key={i} points={[0, i * (drawSize/4), drawSize, i * (drawSize/4)]} stroke="#451a03" strokeWidth={2} />
            ))}
          </Group>
        );
      case 'column':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} fill="#1f2937" />
          </Group>
        );
      case 'door':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Rect x={0} y={drawCenter - 2} width={drawSize} height={4} fill="#d97706" />
          </Group>
        );
      case 'rotating-wall':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Rect x={drawCenter - 2} y={0} width={4} height={drawSize} fill="#6366f1" />
          </Group>
        );
      case 'obstacle-half-w':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect x={0} y={0} width={drawSize/2} height={drawSize/2} fill="#f59e0b" />
          </Group>
        );
      case 'obstacle-half-h':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Rect x={0} y={0} width={drawSize} height={drawSize/2} fill="#f59e0b" />
          </Group>
        );
      case 'obstacle-above':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Rect x={0} y={0} width={drawSize} height={drawSize} stroke="#f59e0b" strokeWidth={2} dash={[5, 5]} />
            <Text text="SLIDE" fontSize={8} fill="#f59e0b" x={2} y={2} />
          </Group>
        );
      case 'patio':
        return <Rect width={s} height={s} fill="#6b7280" stroke="#4b5563" strokeWidth={1} />;
      case 'tree':
        return (
          <Group>
            <Rect width={s} height={s} fill="#6b7280" />
            <Circle x={center} y={center} radius={s/2.5} fill="#065f46" />
          </Group>
        );
      case 'rotating-wall-l':
        return (
          <Group>
            <Rect width={s} height={s} fill="#6b7280" />
            <Line points={[center, 0, center, center, s, center]} stroke="#4338ca" strokeWidth={8} />
          </Group>
        );
      case 'rotating-wall-i':
        return (
          <Group>
            <Rect width={s} height={s} fill="#6b7280" />
            <Line points={[center, 0, center, s]} stroke="#4338ca" strokeWidth={8} />
          </Group>
        );
      case 'rotating-wall-plus':
        return (
          <Group>
            <Rect width={s} height={s} fill="#6b7280" />
            <Line points={[center, 0, center, s]} stroke="#4338ca" strokeWidth={8} />
            <Line points={[0, center, s, center]} stroke="#4338ca" strokeWidth={8} />
          </Group>
        );
      case 'tile-above':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#d1d5db" opacity={0.8} />;
      case 'tile-below':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#374151" opacity={0.8} />;
      case 'artefact':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/5} fill="#fbbf24" stroke="#d97706" strokeWidth={2} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/10} fill="white" opacity={0.5} />
          </Group>
        );
      case 'exit':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            {hasArtefact ? (
              <Circle x={drawCenter} y={drawCenter} radius={drawSize/2 - 2} fill="#7dd3fc" stroke="#0ea5e9" strokeWidth={2} />
            ) : (
              <Group>
                <Line points={[4, 4, drawSize-4, drawSize-4]} stroke="#0ea5e9" strokeWidth={4} />
                <Line points={[drawSize-4, 4, 4, drawSize-4]} stroke="#0ea5e9" strokeWidth={4} />
              </Group>
            )}
          </Group>
        );
      case 'portal':
        const isBlinkingRange = mode === 'play' && isPowerUpActive && powerUpTimeLeft > 0 && powerUpTimeLeft <= powerUpDuration * 0.2;
        const isVisible = mode === 'build' || (isPowerUpActive && powerUpTimeLeft > 0);
        const opacity = isVisible ? (isBlinkingRange ? (tick % 2 === 0 ? 0.2 : 1) : 1) : 0;
        return (
          <Group x={drawOffset} y={drawOffset} opacity={opacity}>
            <Rect width={drawSize} height={drawSize} fill="#a855f7" opacity={0.2} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/2 - 4} stroke="#a855f7" strokeWidth={3} dash={[5, 2]} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/4} fill="#d8b4fe" />
          </Group>
        );
      case 'mushroom':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={0.2} />
            <Rect x={drawCenter - 3} y={drawCenter} width={6} height={drawCenter} fill="#fce7f3" cornerRadius={2} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} fill="#ec4899" />
            <Circle x={drawCenter - 3} y={drawCenter - 3} radius={2} fill="white" />
            <Circle x={drawCenter + 3} y={drawCenter - 1} radius={1.5} fill="white" />
          </Group>
        );
      case 'health-potion':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect x={drawCenter - 6} y={drawCenter} width={12} height={drawCenter} fill="#22c55e" cornerRadius={2} />
            <Rect x={drawCenter - 4} y={drawCenter - 8} width={8} height={8} fill="#22c55e" opacity={0.6} />
            <Rect x={drawCenter - 2} y={drawCenter - 12} width={4} height={4} fill="#15803d" />
          </Group>
        );
      case 'firefly':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/4} fill="#fef08a" shadowBlur={10} shadowColor="#fef08a" />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/6} fill="#facc15" />
          </Group>
        );
      case 'magic-tile':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6366f1" opacity={0.3} cornerRadius={4} />
            <Line points={[4, drawCenter, drawSize-4, drawCenter]} stroke="#6366f1" strokeWidth={2} />
            <Line points={[drawCenter, 4, drawCenter, drawSize-4]} stroke="#6366f1" strokeWidth={2} />
          </Group>
        );
      case 'trampoline':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect x={4} y={drawSize-8} width={drawSize-8} height={4} fill="#f97316" cornerRadius={2} />
            <Line points={[drawCenter, drawSize-8, drawCenter, 8]} stroke="#f97316" strokeWidth={2} dash={[2, 2]} />
            <Circle x={drawCenter} y={8} radius={4} fill="#fb923c" />
          </Group>
        );
      case 'lever':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect x={drawCenter-2} y={drawCenter} width={4} height={drawCenter} fill="#94a3b8" />
            <Line points={[drawCenter, drawCenter, drawCenter+8, 8]} stroke="#64748b" strokeWidth={3} />
            <Circle x={drawCenter+8} y={8} radius={4} fill="#475569" />
          </Group>
        );
      case 'orc':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/2.5} fill="#1e3a8a" stroke="#1d4ed8" strokeWidth={2} />
            <Rect x={drawCenter - 4} y={drawCenter - 4} width={2} height={2} fill="white" />
            <Rect x={drawCenter + 2} y={drawCenter - 4} width={2} height={2} fill="white" />
          </Group>
        );
      case 'teeth':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/4} fill="#22c55e" stroke="#15803d" strokeWidth={1} />
            <Line points={[drawCenter-2, drawCenter, drawCenter+2, drawCenter]} stroke="white" strokeWidth={1} />
          </Group>
        );
      case 'spider':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Line points={[0, 0, drawSize, drawSize]} stroke="black" strokeWidth={2} />
            <Line points={[drawSize, 0, 0, drawSize]} stroke="black" strokeWidth={2} />
            <Line points={[drawCenter, 0, drawCenter, drawSize]} stroke="black" strokeWidth={2} />
            <Line points={[0, drawCenter, drawSize, drawCenter]} stroke="black" strokeWidth={2} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/4} fill="black" />
          </Group>
        );
      default:
        return <Rect width={s} height={s} fill="gray" />;
    }
  };

  return (
    <Group 
      x={pixelX + center} 
      y={pixelY + center} 
      rotation={rotation} 
      offsetX={center} 
      offsetY={center}
    >
      <Group opacity={tile.isNeutralized ? 0.4 : 1}>
        {getTileContent()}
      </Group>
      {isPowerUpActive && !isItem && !isPowerUp && !isMonster && (
        <Text 
          text="ᚱ" 
          fontSize={10} 
          fill="rgba(236, 72, 153, 0.4)" 
          x={center - 5} 
          y={center - 5} 
          fontStyle="bold"
        />
      )}
    </Group>
  );
};

export default function App() {
  const [mode, setMode] = useState<GameMode>('build');
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [selectedTileType, setSelectedTileType] = useState<TileType>('corridor');
  const [currentRotation, setCurrentRotation] = useState(0);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [playerAction, setPlayerAction] = useState<'normal' | 'jump' | 'slide'>('normal');
  const [isRunning, setIsRunning] = useState(false);
  const [lastDirection, setLastDirection] = useState({ dx: 1, dy: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dungeonName, setDungeonName] = useState("My Dungeon");
  const [buildTool, setBuildTool] = useState<'place' | 'move' | 'rotate' | 'delete'>('place');
  const [movingTileId, setMovingTileId] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [hasArtefact, setHasArtefact] = useState(false);
  const [hiddenTileIds, setHiddenTileIds] = useState<Set<string>>(new Set());
  const [powerUpDuration, setPowerUpDuration] = useState(15);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0);
  const [isPowerUpActive, setIsPowerUpActive] = useState(false);
  const [health, setHealth] = useState(100);
  const [speedBoostTime, setSpeedBoostTime] = useState(0);
  const [jumpBoostTime, setJumpBoostTime] = useState(0);
  const [lightTime, setLightTime] = useState(0);
  const [slowMonstersTime, setSlowMonstersTime] = useState(0);
  const [deathCount, setDeathCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const [isModalCollapsed, setIsModalCollapsed] = useState(false);
  const [modalPos, setModalPos] = useState({ x: 24, y: 24 });
  const [tick, setTick] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [monsters, setMonsters] = useState<{ id: string, type: TileType, x: number, y: number }[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWallBlocked = useCallback((tile: TileData, dir: string) => {
    const r = tile.rotation;
    switch (tile.type) {
      case 'corridor':
        if (r === 0 || r === 180) return dir === 'up' || dir === 'down';
        return dir === 'left' || dir === 'right';
      case 'corner':
        if (r === 0) return dir === 'up' || dir === 'left';
        if (r === 90) return dir === 'up' || dir === 'right';
        if (r === 180) return dir === 'down' || dir === 'right';
        if (r === 270) return dir === 'down' || dir === 'left';
        break;
      case 't-junction':
        if (r === 0) return dir === 'up';
        if (r === 90) return dir === 'right';
        if (r === 180) return dir === 'down';
        if (r === 270) return dir === 'left';
        break;
      case 'one-side':
        if (r === 0) return dir === 'up';
        if (r === 90) return dir === 'right';
        if (r === 180) return dir === 'down';
        if (r === 270) return dir === 'left';
        break;
      case 'cul-de-sac':
        if (r === 0) return dir === 'up' || dir === 'left' || dir === 'right';
        if (r === 90) return dir === 'right' || dir === 'up' || dir === 'down';
        if (r === 180) return dir === 'down' || dir === 'left' || dir === 'right';
        if (r === 270) return dir === 'left' || dir === 'up' || dir === 'down';
        break;
    }
    return false;
  }, []);

  const isSwerveBlocked = useCallback((tile: TileData, moveDir: string, isJumping: boolean, isOrc = false) => {
    if (tile.type !== 'obstacle-half-w' || (isJumping && !isOrc)) return false;
    const r = tile.rotation;
    if (moveDir === 'down') {
      if (r === 180 && !pressedKeys.has('a') && !isOrc) return true;
      if (r === 270 && !pressedKeys.has('d') && !isOrc) return true;
    }
    if (moveDir === 'up') {
      if (r === 0 && !pressedKeys.has('d') && !isOrc) return true;
      if (r === 90 && !pressedKeys.has('a') && !isOrc) return true;
    }
    if (moveDir === 'right') {
      if (r === 90 && !pressedKeys.has('s') && !isOrc) return true;
      if (r === 180 && !pressedKeys.has('w') && !isOrc) return true;
    }
    if (moveDir === 'left') {
      if (r === 0 && !pressedKeys.has('s') && !isOrc) return true;
      if (r === 270 && !pressedKeys.has('w') && !isOrc) return true;
    }
    return false;
  }, [pressedKeys]);

  useEffect(() => {
    let interval: any;
    if (isFlashing) {
      interval = setInterval(() => {
        setTick(t => t + 1);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isFlashing]);

  // Power-up timer logic
  useEffect(() => {
    let interval: any;
    if (mode === 'play') {
      interval = setInterval(() => {
        if (isPowerUpActive && powerUpTimeLeft > 0) {
          setPowerUpTimeLeft(prev => Math.max(0, prev - 0.1));
          if (powerUpTimeLeft <= 0.1) setIsPowerUpActive(false);
        }
        if (speedBoostTime > 0) setSpeedBoostTime(prev => Math.max(0, prev - 0.1));
        if (jumpBoostTime > 0) setJumpBoostTime(prev => Math.max(0, prev - 0.1));
        if (lightTime > 0) setLightTime(prev => Math.max(0, prev - 0.1));
        if (slowMonstersTime > 0) setSlowMonstersTime(prev => Math.max(0, prev - 0.1));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPowerUpActive, powerUpTimeLeft, speedBoostTime, jumpBoostTime, lightTime, slowMonstersTime, mode]);

  // Monster logic
  useEffect(() => {
    let interval: any;
    if (mode === 'play' && !isGameOver && !isWin && !isDying) {
      const moveInterval = slowMonstersTime > 0 ? 1000 : 500;
      interval = setInterval(() => {
        setPlayTime(prev => prev + (moveInterval / 1000));
        
        // Spawn monsters after 5 seconds
        if (playTime >= 5 && monsters.length === 0) {
          const monsterTiles = tiles.filter(t => TILE_LIBRARY.find(tl => tl.type === t.type)?.category === 'monster');
          if (monsterTiles.length > 0) {
            setMonsters(monsterTiles.map(m => ({ ...m, x: m.x, y: m.y })));
          }
        }

        // Move monsters
        if (monsters.length > 0) {
          setMonsters(prev => prev.map(m => {
            const dx = playerPos.x - m.x;
            const dy = playerPos.y - m.y;
            
            let nextX = m.x;
            let nextY = m.y;
            let moved = false;

            const tryMove = (stepX: number, stepY: number) => {
              const targetX = m.x + stepX;
              const targetY = m.y + stepY;
              const dir = stepX > 0 ? 'right' : stepX < 0 ? 'left' : stepY > 0 ? 'down' : 'up';
              const oppDir = stepX > 0 ? 'left' : stepX < 0 ? 'right' : stepY > 0 ? 'up' : 'down';

              // Boundary
              if (targetX < 0 || targetX >= CANVAS_WIDTH / GRID_SIZE || targetY < 0 || targetY >= CANVAS_HEIGHT / GRID_SIZE) return false;

              // Must have a corridor or quad tile (not tree)
              const targetTiles = tiles.filter(t => {
                if (t.size === 1) return t.x === targetX && t.y === targetY;
                return targetX >= t.x && targetX < t.x + 2 && targetY >= t.y && targetY < t.y + 2;
              });
              const baseTile = targetTiles.find(t => {
                const def = TILE_LIBRARY.find(tl => tl.type === t.type);
                return (def?.category === 'corridor' || def?.category === 'quad') && t.type !== 'tree';
              });
              if (!baseTile) return false;

              // Wall check (current)
              const currentTiles = tiles.filter(t => {
                if (t.size === 1) return t.x === m.x && t.y === m.y;
                return m.x >= t.x && m.x < t.x + 2 && m.y >= t.y && m.y < t.y + 2;
              });
              if (currentTiles.some(t => isWallBlocked(t, dir))) return false;

              // Wall check (next)
              if (targetTiles.some(t => isWallBlocked(t, oppDir))) return false;

              // Orc specific
              if (m.type === 'orc') {
                // Obstacles
                if (targetTiles.some(t => t.type === 'lava' || t.type === 'water' || t.type === 'obstacle-half-h' || t.type === 'obstacle-above')) return false;
                
                // Swerve interaction
                const swerve = targetTiles.find(t => t.type === 'obstacle-half-w' && !t.isNeutralized);
                if (swerve) {
                  const sx = swerve.x + stepX;
                  const sy = swerve.y + stepY;
                  const sTargetTiles = tiles.filter(t => t.x === sx && t.y === sy);
                  const sBase = sTargetTiles.find(t => {
                    const def = TILE_LIBRARY.find(tl => tl.type === t.type);
                    return def?.category === 'corridor' || def?.category === 'quad';
                  });
                  
                  const lavaOrWater = sTargetTiles.find(t => t.type === 'lava' || t.type === 'water');
                  if (lavaOrWater) {
                    // Falls in!
                    setTiles(prevTiles => prevTiles.map(t => {
                      if (t.id === swerve.id) return { ...t, x: sx, y: sy, isNeutralized: true };
                      if (t.id === lavaOrWater.id) return { ...t, isNeutralized: true };
                      return t;
                    }));
                  } else {
                    const sOcc = sTargetTiles.some(t => t.type === 'obstacle-half-w' || t.type === 'column');
                    if (sBase && !sOcc) {
                      setTiles(prevTiles => prevTiles.map(t => t.id === swerve.id ? { ...t, x: sx, y: sy } : t));
                    } else {
                      return false;
                    }
                  }
                }

                // Portal
                if (isPowerUpActive) {
                  const portal = targetTiles.find(t => t.type === 'portal');
                  if (portal) {
                    const other = tiles.find(t => t.type === 'portal' && t.id !== portal.id);
                    if (other) {
                      nextX = other.x;
                      nextY = other.y;
                      moved = true;
                      return true;
                    }
                  }
                }
              }

              nextX = targetX;
              nextY = targetY;
              moved = true;
              return true;
            };

            // Try to move towards player
            if (Math.abs(dx) > Math.abs(dy)) {
              if (!tryMove(dx > 0 ? 1 : -1, 0)) {
                if (dy !== 0) tryMove(0, dy > 0 ? 1 : -1);
              }
            } else {
              if (!tryMove(0, dy > 0 ? 1 : -1)) {
                if (dx !== 0) tryMove(dx > 0 ? 1 : -1, 0);
              }
            }

            // Check collision with player
            if (nextX === playerPos.x && nextY === playerPos.y) {
              setIsDying(true);
              setIsFlashing(true);
              setDeathCount(d => d + 1);
              setTimeout(() => {
                setIsDying(false);
                setIsFlashing(false);
                const entrance = tiles.find(t => t.type === 'entrance');
                if (entrance) setPlayerPos({ x: entrance.x, y: entrance.y });
                setMonsters([]);
                setPlayTime(0);
              }, 1000);
            }

            return { ...m, x: nextX, y: nextY };
          }));
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [mode, isGameOver, isWin, isDying, playTime, monsters.length, tiles, playerPos]);

  const handleCanvasClick = (e: any) => {
    if (mode !== 'build') return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const x = Math.floor(pointerPosition.x / GRID_SIZE);
    const y = Math.floor(pointerPosition.y / GRID_SIZE);

    if (buildTool === 'delete') {
      const tileToDelete = tiles.find(t => {
        if (t.size === 1) return t.x === x && t.y === y;
        return x >= t.x && x < t.x + 2 && y >= t.y && y < t.y + 2;
      });
      if (tileToDelete) {
        setTiles(tiles.filter(t => t.id !== tileToDelete.id));
        setTriggers(triggers.filter(tr => tr.targetId !== tileToDelete.id));
      }
      setTriggers(prev => prev.filter(tr => tr.x !== x || tr.y !== y));
      return;
    }

    if (buildTool === 'rotate') {
      const tileToRotate = tiles.find(t => {
        if (t.size === 1) return t.x === x && t.y === y;
        return x >= t.x && x < t.x + 2 && y >= t.y && y < t.y + 2;
      });
      if (tileToRotate) {
        setTiles(tiles.map(t => t.id === tileToRotate.id ? { ...t, rotation: (t.rotation + 90) % 360 } : t));
      }
      return;
    }

    if (buildTool === 'move') {
      if (movingTileId) {
        const movingTile = tiles.find(mt => mt.id === movingTileId);
        if (!movingTile) {
          setMovingTileId(null);
          return;
        }

        const s = movingTile.size;
        const isOccupied = tiles.some(t => {
          if (t.id === movingTileId) return false;
          const tX2 = t.x + t.size;
          const tY2 = t.y + t.size;
          const mX2 = x + s;
          const mY2 = y + s;
          return !(x >= tX2 || mX2 <= t.x || y >= tY2 || mY2 <= t.y);
        });

        if (!isOccupied) {
          setTiles(tiles.map(t => t.id === movingTileId ? { ...t, x, y } : t));
          setMovingTileId(null);
        }
      } else {
        const tileToMove = tiles.find(t => {
          if (t.size === 1) return t.x === x && t.y === y;
          return x >= t.x && x < t.x + 2 && y >= t.y && y < t.y + 2;
        });
        if (tileToMove) {
          setMovingTileId(tileToMove.id);
        }
      }
      return;
    }

    const tileDef = TILE_LIBRARY.find(t => t.type === selectedTileType);
    if (!tileDef) return;

    const isItem = tileDef.category === 'item';
    const isPowerUp = tileDef.category === 'power-up';
    const isMonster = tileDef.category === 'monster';
    const isArtefact = tileDef.category === 'artefact';

    // Check if a tile of the SAME type is already there to rotate it
    const existingSameTypeIndex = tiles.findIndex(t => t.x === x && t.y === y && t.type === selectedTileType);
    if (existingSameTypeIndex > -1) {
      const newTiles = [...tiles];
      newTiles[existingSameTypeIndex].rotation = (newTiles[existingSameTypeIndex].rotation + 90) % 360;
      setTiles(newTiles);
      return;
    }

    // If it's NOT an item, power-up, monster, or artefact, check if the spot is occupied by another base tile
    if (!isItem && !isPowerUp && !isMonster && !isArtefact) {
      const isOccupiedByBase = tiles.some(t => {
        if (t.type === 'obstacle-half-w') return false;
        const tileDefT = TILE_LIBRARY.find(td => td.type === t.type);
        if (tileDefT?.category === 'item' || tileDefT?.category === 'power-up' || tileDefT?.category === 'monster' || tileDefT?.category === 'artefact') return false;
        
        const tX2 = t.x + t.size;
        const tY2 = t.y + t.size;
        const mX2 = x + tileDef.size;
        const mY2 = y + tileDef.size;
        return !(x >= tX2 || mX2 <= t.x || y >= tY2 || mY2 <= t.y);
      });

      if (isOccupiedByBase) {
        const baseTileIndex = tiles.findIndex(t => {
          const tileDefT = TILE_LIBRARY.find(td => td.type === t.type);
          return tileDefT?.category !== 'item' && tileDefT?.category !== 'power-up' && tileDefT?.category !== 'monster' && tileDefT?.category !== 'artefact' && t.x === x && t.y === y;
        });
        if (baseTileIndex > -1) {
          const newTiles = [...tiles];
          newTiles[baseTileIndex] = {
            id: Math.random().toString(36).substr(2, 9),
            type: selectedTileType,
            x,
            y,
            rotation: currentRotation,
            size: tileDef.size
          };
          setTiles(newTiles);
          return;
        }
      }
    }

    // Otherwise, just add it (layering)
    const newTileId = Math.random().toString(36).substr(2, 9);
    const newTile = {
      id: newTileId,
      type: selectedTileType,
      x,
      y,
      rotation: currentRotation,
      size: tileDef.size
    };
    setTiles([...tiles, newTile]);

    // Add trigger for rotating quad tiles
    if (tileDef.category === 'quad' && tileDef.type.includes('rotating')) {
      setTriggers([...triggers, {
        id: Math.random().toString(36).substr(2, 9),
        targetId: newTileId,
        x: x + 2, // Place trigger nearby
        y: y
      }]);
    }
  };

  const handleTriggerDrag = (id: string, e: any) => {
    const x = Math.floor(e.target.x() / GRID_SIZE);
    const y = Math.floor(e.target.y() / GRID_SIZE);
    setTriggers(triggers.map(t => t.id === id ? { ...t, x, y } : t));
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    if (mode !== 'build') return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const x = Math.floor(pointerPosition.x / GRID_SIZE);
    const y = Math.floor(pointerPosition.y / GRID_SIZE);

    const tileToDelete = tiles.find(t => t.x === x && t.y === y);
    if (tileToDelete) {
      setTiles(tiles.filter(t => t.id !== tileToDelete.id));
      setTriggers(triggers.filter(tr => tr.targetId !== tileToDelete.id));
    }
    
    // Also allow deleting triggers directly
    setTriggers(prev => prev.filter(tr => tr.x !== x || tr.y !== y));
  };

  const handleExport = () => {
    const data: DungeonMap = {
      name: dungeonName,
      tiles,
      triggers,
      gridSize: GRID_SIZE,
      powerUpDuration
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = dungeonName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'dungeon';
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as DungeonMap;
        if (data.tiles) {
          setTiles(data.tiles);
        }
        if (data.triggers) {
          setTriggers(data.triggers);
        }
        if (data.name) {
          setDungeonName(data.name);
        }
        if (data.powerUpDuration) {
          setPowerUpDuration(data.powerUpDuration);
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
    };
    reader.readAsText(file);
  };

  const clearDungeon = () => {
    if (confirm("Clear all tiles?")) {
      setTiles([]);
      setTriggers([]);
      setDeathCount(0);
      setDungeonName("My Dungeon");
      setIsGameOver(false);
      setIsWin(false);
      setHasArtefact(false);
      setIsFlashing(false);
    }
  };

  const restartGame = () => {
    setIsGameOver(false);
    setIsWin(false);
    setHasArtefact(false);
    setHiddenTileIds(new Set());
    setIsPowerUpActive(false);
    setPowerUpTimeLeft(0);
    setIsFlashing(false);
    const entrance = tiles.find(t => t.type === 'entrance');
    if (entrance) {
      setPlayerPos({ x: entrance.x, y: entrance.y });
    } else {
      setPlayerPos({ x: 0, y: 0 });
    }
  };

  // --- Play Mode Logic ---

  useEffect(() => {
    if (mode === 'play') {
      setIsGameOver(false);
      setIsWin(false);
      setHasArtefact(false);
      setHiddenTileIds(new Set());
      setIsPowerUpActive(false);
      setPowerUpTimeLeft(0);
      setHealth(100);
      setSpeedBoostTime(0);
      setJumpBoostTime(0);
      setLightTime(0);
      setSlowMonstersTime(0);
      setIsFlashing(false);
      setPlayTime(0);
      setMonsters([]);
      const entrance = tiles.find(t => t.type === 'entrance');
      if (entrance) {
        setPlayerPos({ x: entrance.x, y: entrance.y });
      } else {
        setPlayerPos({ x: 0, y: 0 });
      }
    }
  }, [mode]); // Only reset when mode changes to play

  const movePlayer = useCallback((dx: number, dy: number, isSpecial = false) => {
    if (mode !== 'play' || isGameOver || isWin || isDying) return;

    const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    const oppositeDir = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down';

    if (dx !== 0 || dy !== 0) {
      setLastDirection({ dx, dy });
    }

    const jumpMultiplier = jumpBoostTime > 0 ? 2 : 1;
    const step = (isSpecial ? 2 * jumpMultiplier : 1) * (speedBoostTime > 0 ? 2 : 1);
    let finalX = playerPos.x;
    let finalY = playerPos.y;

    for (let i = 0; i < step; i++) {
      const nextX = finalX + dx;
      const nextY = finalY + dy;
      const isIntermediate = step > 1 && i < step - 1;

      // Boundary check
      if (nextX < 0 || nextX >= CANVAS_WIDTH / GRID_SIZE || nextY < 0 || nextY >= CANVAS_HEIGHT / GRID_SIZE) break;

      // Wall collision check (Current tile exit)
      const currentTiles = tiles.filter(t => {
        if (t.size === 1) return t.x === finalX && t.y === finalY;
        return finalX >= t.x && finalX < t.x + 2 && finalY >= t.y && finalY < t.y + 2;
      });
      if (currentTiles.some(t => isWallBlocked(t, direction))) break;

      // Wall collision check (Next tile entry)
      const nextTiles = tiles.filter(t => {
        if (t.size === 1) return t.x === nextX && t.y === nextY;
        return nextX >= t.x && nextX < t.x + 2 && nextY >= t.y && nextY < t.y + 2;
      });
      if (nextTiles.some(t => isWallBlocked(t, oppositeDir))) break;

      // Swerve check
      if (!isIntermediate && nextTiles.some(t => !t.isNeutralized && isSwerveBlocked(t, direction, playerAction === 'jump'))) break;
      
      if (!isIntermediate) {
        const deathTile = nextTiles.find(t => (t.type === 'lava' || t.type === 'water') && !t.isNeutralized);
        if (deathTile) {
          setIsDying(true);
          setIsFlashing(true);
          setDeathCount(prev => prev + 1);
          setHealth(0);
          finalX = nextX;
          finalY = nextY;
          setTimeout(() => {
            setIsDying(false);
            setIsFlashing(false);
            setHealth(100);
            const entrance = tiles.find(t => t.type === 'entrance');
            if (entrance) {
              setPlayerPos({ x: entrance.x, y: entrance.y });
            } else {
              setPlayerPos({ x: 0, y: 0 });
            }
          }, 1000);
          break;
        }
      }

      // Other collisions
      if (nextTiles.some(t => t.type === 'column' || t.type === 'tree')) break;
      if (!isIntermediate && nextTiles.some(t => t.type === 'obstacle-half-h' && playerAction !== 'jump')) break;
      if (!isIntermediate && nextTiles.some(t => t.type === 'obstacle-above' && playerAction !== 'slide')) break;

      // Artefact collection
      const artefactTile = nextTiles.find(t => t.type === 'artefact' && !hiddenTileIds.has(t.id));
      if (artefactTile) {
        setHasArtefact(true);
        setHiddenTileIds(prev => new Set(prev).add(artefactTile.id));
      }

      // Power up collection
      const mushroomTile = nextTiles.find(t => t.type === 'mushroom' && !hiddenTileIds.has(t.id));
      if (mushroomTile) {
        setIsPowerUpActive(true);
        setPowerUpTimeLeft(powerUpDuration);
        setHiddenTileIds(prev => new Set(prev).add(mushroomTile.id));
      }

      const healthPotion = nextTiles.find(t => t.type === 'health-potion' && !hiddenTileIds.has(t.id));
      if (healthPotion) {
        setHealth(prev => Math.min(100, prev + 25));
        setHiddenTileIds(prev => new Set(prev).add(healthPotion.id));
      }

      const firefly = nextTiles.find(t => t.type === 'firefly' && !hiddenTileIds.has(t.id));
      if (firefly) {
        setLightTime(10);
        setHiddenTileIds(prev => new Set(prev).add(firefly.id));
      }

      const magicTile = nextTiles.find(t => t.type === 'magic-tile' && !hiddenTileIds.has(t.id));
      if (magicTile) {
        setSpeedBoostTime(10);
        setHiddenTileIds(prev => new Set(prev).add(magicTile.id));
      }

      const trampoline = nextTiles.find(t => t.type === 'trampoline' && !hiddenTileIds.has(t.id));
      if (trampoline) {
        setJumpBoostTime(10);
        setHiddenTileIds(prev => new Set(prev).add(trampoline.id));
      }

      const lever = nextTiles.find(t => t.type === 'lever' && !hiddenTileIds.has(t.id));
      if (lever) {
        setSlowMonstersTime(10);
        setHiddenTileIds(prev => new Set(prev).add(lever.id));
      }

      // Portal teleportation
      if (isPowerUpActive && nextTiles.some(t => t.type === 'portal')) {
        const otherPortal = tiles.find(t => t.type === 'portal' && (t.x !== nextX || t.y !== nextY));
        if (otherPortal) {
          finalX = otherPortal.x;
          finalY = otherPortal.y;
          break;
        }
      }

      // Exit check
      if (nextTiles.some(t => t.type === 'exit' && hasArtefact)) {
        setIsWin(true);
        setIsFlashing(true);
        finalX = nextX;
        finalY = nextY;
        break;
      }

      // Check triggers
      const triggerAtNext = triggers.find(t => t.x === nextX && t.y === nextY);
      if (triggerAtNext) {
        setTiles(prev => prev.map(tile => 
          tile.id === triggerAtNext.targetId 
            ? { ...tile, rotation: (tile.rotation + 90) % 360 } 
            : tile
        ));
      }
      
      finalX = nextX;
      finalY = nextY;
      if (isWin) break;
    }

    setPlayerPos({ x: finalX, y: finalY });
  }, [mode, playerPos, tiles, playerAction, isGameOver, isWin, isDying, triggers, hasArtefact, pressedKeys, isPowerUpActive, powerUpDuration]);

  // Auto-running logic
  useEffect(() => {
    if (mode === 'play' && isRunning) {
      const interval = setInterval(() => {
        movePlayer(lastDirection.dx, lastDirection.dy);
      }, 250);
      return () => clearInterval(interval);
    }
  }, [mode, isRunning, lastDirection, movePlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      if (mode === 'build' && key === 'r') {
        setCurrentRotation((r) => (r + 90) % 360);
      }

      if (mode !== 'play') return;

      switch (key) {
        case 'w': movePlayer(0, -1); break;
        case 's': movePlayer(0, 1); break;
        case 'a': movePlayer(-1, 0); break;
        case 'd': movePlayer(1, 0); break;
        case ' ': 
          e.preventDefault();
          setPlayerAction('jump');
          movePlayer(lastDirection.dx, lastDirection.dy, true);
          setTimeout(() => setPlayerAction('normal'), 500);
          break;
        case 'shift':
          setPlayerAction('slide');
          movePlayer(lastDirection.dx, lastDirection.dy, true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      if (key === 'shift') {
        setPlayerAction('normal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, movePlayer]);

  return (
    <div className="flex h-screen bg-[#141414] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div 
        className={cn(
          "bg-zinc-900 border-r border-white/10 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-widest text-zinc-400">Library</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/5 rounded">
            <ChevronLeft size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 space-y-2">
            <button 
              onClick={() => {
                setCollapsedSections(prev => {
                  const next = new Set(prev);
                  if (next.has('controls')) next.delete('controls');
                  else next.add('controls');
                  return next;
                });
              }}
              className="w-full flex items-center justify-between group"
            >
              <h3 className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest">Controls</h3>
              {collapsedSections.has('controls') ? <ChevronDown size={10} className="text-indigo-600" /> : <ChevronUp size={10} className="text-indigo-600" />}
            </button>
            
            {!collapsedSections.has('controls') && (
              <div className="grid grid-cols-2 gap-y-1 text-[9px] text-zinc-400 font-mono">
                <span>WASD</span> <span className="text-zinc-300 text-right">MOVE</span>
                <span>SPACE</span> <span className="text-zinc-300 text-right">JUMP</span>
                <span>SHIFT</span> <span className="text-zinc-300 text-right">SLIDE</span>
                <span>R</span> <span className="text-zinc-300 text-right">ROTATE</span>
              </div>
            )}
          </div>

          {['corridor', 'item', 'quad', 'power-up', 'monster', 'artefact'].map((cat) => (
            <div key={cat} className="space-y-2">
              <button 
                onClick={() => {
                  setCollapsedSections(prev => {
                    const next = new Set(prev);
                    if (next.has(cat)) next.delete(cat);
                    else next.add(cat);
                    return next;
                  });
                }}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-[10px] font-bold uppercase text-zinc-500 tracking-tighter group-hover:text-zinc-300 transition-colors">{cat}s</h3>
                {collapsedSections.has(cat) ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronUp size={10} className="text-zinc-600" />}
              </button>
              
              {!collapsedSections.has(cat) && (
                <div className="grid grid-cols-3 gap-2">
                  {TILE_LIBRARY.filter(t => t.category === cat).map((tile) => (
                    <button
                      key={tile.type}
                      onClick={() => setSelectedTileType(tile.type)}
                      className={cn(
                        "flex flex-col items-center p-2 rounded border transition-all",
                        selectedTileType === tile.type 
                          ? "bg-zinc-800 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                          : "bg-zinc-900 border-white/5 hover:border-white/20"
                      )}
                    >
                      <TileIcon type={tile.type} rotation={0} color={tile.color} size={tile.size} />
                      <span className="text-[9px] mt-1 text-center truncate w-full">{tile.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-zinc-950/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono">SYSTEM READY</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 rounded text-xs border border-white/5 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 rounded text-xs border border-white/5 transition-colors"
            >
              <Upload size={14} />
              Import
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              accept=".json"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-20 p-2 bg-zinc-900 border border-white/10 rounded-full hover:bg-zinc-800 shadow-xl"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Toolbar */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setMode('build')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === 'build' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Hammer size={14} />
                Build
              </button>
              <button
                onClick={() => setMode('play')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === 'play' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Play size={14} />
                Play
              </button>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <button
                onClick={clearDungeon}
                className="p-2 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                title="New Canvas"
              >
                <Plus size={18} />
                <span className="text-[10px] font-bold uppercase">New</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RotateCw size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {mode === 'play' && (
              <div className="flex items-center gap-3 bg-zinc-950 px-4 py-1.5 rounded-full border border-white/5">
                <button 
                  onClick={restartGame}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                >
                  <RotateCw size={12} />
                  Restart
                </button>
                <div className="w-px h-3 bg-white/10" />
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={cn(
                    "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    isRunning ? "text-emerald-400" : "text-zinc-500"
                  )}
                >
                  {isRunning ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                  {isRunning ? "Running" : "Normal"}
                </button>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <Move size={12} />
                  POS: {playerPos.x}, {playerPos.y}
                </div>
              </div>
            )}
            <div className="text-right">
              <h1 className="text-sm font-bold tracking-tighter">DUNGEON ARCHITECT</h1>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">v1.0.4-alpha</p>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:20px_20px] relative">
          {/* Floating Build Modal */}
          <AnimatePresence>
            {mode === 'build' && (
              <motion.div 
                initial={{ opacity: 0, x: modalPos.x - 20, y: modalPos.y }}
                animate={{ opacity: 1, x: modalPos.x, y: modalPos.y }}
                exit={{ opacity: 0, x: modalPos.x - 20 }}
                drag
                dragMomentum={false}
                onDragEnd={(_, info) => setModalPos({ x: modalPos.x + info.offset.x, y: modalPos.y + info.offset.y })}
                className="absolute z-30 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                style={{ left: 0, top: 0 }}
              >
                {/* Grip / Header */}
                <div className="h-10 flex items-center justify-between px-3 border-b border-white/5 bg-white/5 cursor-grab active:cursor-grabbing group">
                  <div className="flex items-center gap-2">
                    <GripHorizontal size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Build Settings</span>
                  </div>
                  <button 
                    onClick={() => setIsModalCollapsed(!isModalCollapsed)}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-white"
                  >
                    {isModalCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>

                <motion.div 
                  animate={{ height: isModalCollapsed ? 0 : 'auto' }}
                  initial={false}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Maze Title</label>
                      <input
                        type="text"
                        value={dungeonName}
                        onChange={(e) => setDungeonName(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500/50 text-zinc-100 placeholder:text-zinc-600"
                        placeholder="Enter name..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Vision (s)</label>
                        <input
                          type="number"
                          value={powerUpDuration}
                          onChange={(e) => setPowerUpDuration(Number(e.target.value))}
                          className="w-full bg-zinc-950/50 border border-white/5 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-indigo-500/50 text-zinc-100"
                          min="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Grid Size</label>
                        <div className="h-9 flex items-center px-3 text-sm font-bold text-zinc-400 bg-zinc-950/20 rounded-lg border border-white/5">
                          {GRID_SIZE}px
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="space-y-2">
                      <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Build Tools</label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setBuildTool('place')}
                          className={cn(
                            "p-2 rounded-lg border transition-all flex items-center justify-center",
                            buildTool === 'place' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
                          )}
                          title="Place Tool"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          onClick={() => setBuildTool('move')}
                          className={cn(
                            "p-2 rounded-lg border transition-all flex items-center justify-center",
                            buildTool === 'move' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
                          )}
                          title="Move Tool"
                        >
                          <Move size={16} />
                        </button>
                        <button
                          onClick={() => setBuildTool('rotate')}
                          className={cn(
                            "p-2 rounded-lg border transition-all flex items-center justify-center",
                            buildTool === 'rotate' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
                          )}
                          title="Rotate Tool"
                        >
                          <RotateCw size={16} />
                        </button>
                        <button
                          onClick={() => setBuildTool('delete')}
                          className={cn(
                            "p-2 rounded-lg border transition-all flex items-center justify-center",
                            buildTool === 'delete' ? "bg-indigo-500 border-indigo-400 text-white" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
                          )}
                          title="Delete Tool"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 rounded-lg overflow-hidden bg-zinc-950">
            <Stage 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT} 
              onClick={handleCanvasClick}
              onContextMenu={handleRightClick}
              ref={stageRef}
            >
              <Layer>
                {/* Grid Lines */}
                {[...Array(Math.ceil(CANVAS_WIDTH / GRID_SIZE))].map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * GRID_SIZE, 0, i * GRID_SIZE, CANVAS_HEIGHT]}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    opacity={0.05}
                  />
                ))}
                {[...Array(Math.ceil(CANVAS_HEIGHT / GRID_SIZE))].map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * GRID_SIZE, CANVAS_WIDTH, i * GRID_SIZE]}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    opacity={0.05}
                  />
                ))}

                {/* Tiles */}
                {tiles
                  .filter(t => {
                    const isMonsterTile = TILE_LIBRARY.find(tl => tl.type === t.type)?.category === 'monster';
                    if (mode === 'play' && isMonsterTile) return false;
                    return mode === 'build' || !hiddenTileIds.has(t.id);
                  })
                  .sort((a, b) => {
                    const catA = TILE_LIBRARY.find(t => t.type === a.type)?.category;
                    const catB = TILE_LIBRARY.find(t => t.type === b.type)?.category;
                    if (catA === 'corridor' && catB !== 'corridor') return -1;
                    if (catA !== 'corridor' && catB === 'corridor') return 1;
                    if (catA === 'item' && catB === 'monster') return -1;
                    if (catA === 'monster' && catB === 'item') return 1;
                    return 0;
                  })
                  .map((tile) => (
                    <Group key={tile.id}>
                      <TileRenderer 
                        tile={tile} 
                        hasArtefact={hasArtefact} 
                        isPowerUpActive={isPowerUpActive} 
                        powerUpTimeLeft={powerUpTimeLeft}
                        powerUpDuration={powerUpDuration}
                        tick={tick} 
                        mode={mode}
                      />
                      {movingTileId === tile.id && (
                        <Rect
                          x={tile.x * GRID_SIZE}
                          y={tile.y * GRID_SIZE}
                          width={tile.size * GRID_SIZE}
                          height={tile.size * GRID_SIZE}
                          stroke="#6366f1"
                          strokeWidth={2}
                          dash={[5, 5]}
                          opacity={0.8}
                        />
                      )}
                    </Group>
                  ))}

                {/* Active Monsters */}
                {mode === 'play' && monsters.map(m => (
                  <TileRenderer 
                    key={m.id}
                    tile={{ ...m, rotation: 0, size: 1 }} 
                    hasArtefact={false} 
                    isPowerUpActive={false} 
                    powerUpTimeLeft={0} 
                    powerUpDuration={0} 
                    tick={tick} 
                    mode={mode} 
                  />
                ))}

                {/* Triggers */}
                {triggers.map((trigger) => (
                  <Rect
                    key={trigger.id}
                    x={trigger.x * GRID_SIZE + 10}
                    y={trigger.y * GRID_SIZE + 10}
                    width={20}
                    height={20}
                    fill="#10b981"
                    stroke="white"
                    strokeWidth={1}
                    draggable={mode === 'build'}
                    onDragEnd={(e) => handleTriggerDrag(trigger.id, e)}
                    opacity={0.8}
                  />
                ))}

                {/* Player */}
                {mode === 'play' && !isWin && (
                  <Group 
                    x={playerPos.x * GRID_SIZE + GRID_SIZE/2} 
                    y={playerPos.y * GRID_SIZE + GRID_SIZE/2}
                    scaleX={playerAction === 'slide' ? 0.8 : 1}
                    scaleY={playerAction === 'slide' ? 0.6 : 1}
                    opacity={isFlashing ? (tick % 2 === 0 ? 0.5 : 1) : 1}
                  >
                    {isDying ? (
                      <Group y={-5}>
                        <Circle radius={GRID_SIZE/4} fill="#ef4444" />
                        <Text text="💀" fontSize={16} x={-8} y={-8} />
                      </Group>
                    ) : (
                      <>
                        {lightTime > 0 && (
                          <Circle 
                            radius={GRID_SIZE * 2} 
                            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                            fillRadialGradientStartRadius={0}
                            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                            fillRadialGradientEndRadius={GRID_SIZE * 2}
                            fillRadialGradientColorStops={[0, 'rgba(254, 240, 138, 0.3)', 1, 'rgba(254, 240, 138, 0)']}
                          />
                        )}
                        <Circle 
                          radius={GRID_SIZE/4} 
                          fill="#6366f1" 
                          stroke="white" 
                          strokeWidth={2}
                          shadowBlur={playerAction === 'jump' ? 20 : 5}
                          shadowColor="#6366f1"
                          y={playerAction === 'jump' ? -10 : 0}
                        />
                        <Circle 
                          radius={GRID_SIZE/8} 
                          fill="white" 
                          opacity={0.5}
                          x={-5}
                          y={playerAction === 'jump' ? -15 : -5}
                        />
                      </>
                    )}
                  </Group>
                )}

                {/* Win State */}
                {isWin && (
                  <Group x={CANVAS_WIDTH / 2 - 100} y={CANVAS_HEIGHT / 2 - 70}>
                    <Rect width={200} height={140} fill="rgba(0,0,0,0.8)" cornerRadius={10} stroke="#10b981" strokeWidth={2} />
                    <Text text="YOU WIN!" fontSize={32} fill="#10b981" x={35} y={20} fontStyle="bold" />
                    <Text text="Artifact Collected" fontSize={12} fill="white" x={50} y={60} />
                    <Group 
                      x={50} y={90} 
                      onClick={restartGame}
                      onMouseEnter={(e: any) => e.target.getStage().container().style.cursor = 'pointer'}
                      onMouseLeave={(e: any) => e.target.getStage().container().style.cursor = 'default'}
                    >
                      <Rect width={100} height={30} fill="#10b981" cornerRadius={5} />
                      <Text text="PLAY AGAIN" fontSize={12} fill="white" x={15} y={10} fontStyle="bold" />
                    </Group>
                  </Group>
                )}

                {/* Score / Deaths */}
                <Group x={CANVAS_WIDTH - 20} y={20}>
                  {[...Array(deathCount)].map((_, i) => (
                    <Text 
                      key={i} 
                      text="💀" 
                      fontSize={14} 
                      x={-(i % 10) * 18 - 18} 
                      y={Math.floor(i / 10) * 18} 
                    />
                  ))}
                </Group>

                {/* Power Up Timer Bar */}
                {(isPowerUpActive || speedBoostTime > 0 || jumpBoostTime > 0 || lightTime > 0 || slowMonstersTime > 0) && (
                  <Group x={CANVAS_WIDTH / 2 - 100} y={20}>
                    <Rect width={200} height={30} fill="rgba(0,0,0,0.5)" cornerRadius={5} />
                    
                    {/* Health Bar */}
                    <Rect x={5} y={5} width={190} height={4} fill="rgba(255,255,255,0.1)" cornerRadius={2} />
                    <Rect x={5} y={5} width={(health / 100) * 190} height={4} fill="#22c55e" cornerRadius={2} />

                    <Group y={12}>
                      {isPowerUpActive && <Rect x={5} width={30} height={12} fill="#ec4899" cornerRadius={2} />}
                      {speedBoostTime > 0 && <Rect x={40} width={30} height={12} fill="#6366f1" cornerRadius={2} />}
                      {jumpBoostTime > 0 && <Rect x={75} width={30} height={12} fill="#f97316" cornerRadius={2} />}
                      {lightTime > 0 && <Rect x={110} width={30} height={12} fill="#fef08a" cornerRadius={2} />}
                      {slowMonstersTime > 0 && <Rect x={145} width={30} height={12} fill="#94a3b8" cornerRadius={2} />}
                      
                      <Text text="RUNES" fontSize={6} fill="white" x={8} y={3} fontStyle="bold" opacity={isPowerUpActive ? 1 : 0.2} />
                      <Text text="SPEED" fontSize={6} fill="white" x={43} y={3} fontStyle="bold" opacity={speedBoostTime > 0 ? 1 : 0.2} />
                      <Text text="JUMP" fontSize={6} fill="white" x={79} y={3} fontStyle="bold" opacity={jumpBoostTime > 0 ? 1 : 0.2} />
                      <Text text="LIGHT" fontSize={6} fill="white" x={114} y={3} fontStyle="bold" opacity={lightTime > 0 ? 1 : 0.2} />
                      <Text text="SLOW" fontSize={6} fill="white" x={150} y={3} fontStyle="bold" opacity={slowMonstersTime > 0 ? 1 : 0.2} />
                    </Group>
                  </Group>
                )}
              </Layer>
            </Stage>

            {/* Overlay Info */}
            {mode === 'build' && (
              <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-1">
                <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-zinc-400">
                  TOOL: {buildTool.toUpperCase()} | {buildTool === 'place' ? 'L-CLICK: PLACE/ROTATE' : buildTool === 'move' ? (movingTileId ? 'CLICK EMPTY TO DROP' : 'CLICK TILE TO PICK UP') : 'CLICK TILE TO ' + buildTool.toUpperCase()}
                </div>
                <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-zinc-400">
                  SELECTED: {selectedTileType.toUpperCase()}
                </div>
              </div>
            )}

            {mode === 'play' && (
              <div className="absolute bottom-4 left-4 pointer-events-none flex flex-col gap-1">
                <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-zinc-400">
                  WASD: MOVE | SPACE: JUMP | SHIFT: SLIDE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
