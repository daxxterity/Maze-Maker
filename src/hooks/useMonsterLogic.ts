import { useEffect } from 'react';
import { TileData, MonsterData, GameMode } from '../types';
import { TILE_LIBRARY } from '../constants';

interface MonsterLogicProps {
  mode: GameMode;
  isGameOver: boolean;
  isWin: boolean;
  isDying: boolean;
  isInitialArtefactSelection: boolean;
  isPaused: boolean;
  slowMonstersTime: number;
  playTime: number;
  setPlayTime: React.Dispatch<React.SetStateAction<number>>;
  monsters: MonsterData[];
  setMonsters: React.Dispatch<React.SetStateAction<MonsterData[]>>;
  tiles: TileData[];
  setTiles: React.Dispatch<React.SetStateAction<TileData[]>>;
  playerPos: { x: number; y: number; z: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  isWallBlocked: (tile: TileData, dir: string, px: number, py: number, isEntry?: boolean) => boolean;
  hasShield: boolean;
  selectedArtefact: string | null;
  isArtefactActive: boolean;
  playerAction: 'normal' | 'jump' | 'slide';
  hasCloak: boolean;
  setIsDying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFlashing: React.Dispatch<React.SetStateAction<boolean>>;
  setDeathCount: React.Dispatch<React.SetStateAction<number>>;
  isPowerUpActive: boolean;
}

export const useMonsterLogic = ({
  mode,
  isGameOver,
  isWin,
  isDying,
  isInitialArtefactSelection,
  isPaused,
  slowMonstersTime,
  playTime,
  setPlayTime,
  monsters,
  setMonsters,
  tiles,
  setTiles,
  playerPos,
  setPlayerPos,
  canvasWidth,
  canvasHeight,
  gridSize,
  isWallBlocked,
  hasShield,
  selectedArtefact,
  isArtefactActive,
  playerAction,
  hasCloak,
  setIsDying,
  setIsFlashing,
  setDeathCount,
  isPowerUpActive
}: MonsterLogicProps) => {
  useEffect(() => {
    let interval: any;
    if (mode === 'play' && !isGameOver && !isWin && !isDying && !isInitialArtefactSelection && !isPaused) {
      const moveInterval = slowMonstersTime > 0 ? 1000 : 500;
      interval = setInterval(() => {
        setPlayTime(prev => prev + (moveInterval / 1000));
        
        // Spawn logic
        const currentMonsterIds = new Set(monsters.map(m => m.id));
        const monsterTilesToSpawn = tiles.filter(t => {
          const def = TILE_LIBRARY.find(tl => tl.type === t.type);
          if (def?.category !== 'monster') return false;
          if (currentMonsterIds.has(t.id)) return false;
          
          if (t.type === 'teeth') return true; // Teeth spawn immediately
          return playTime >= 5; // Others spawn after 5s
        });

        if (monsterTilesToSpawn.length > 0) {
          setMonsters(prev => [...prev, ...monsterTilesToSpawn.map(m => ({ 
            ...m, 
            x: m.x, 
            y: m.y,
            z: m.z || 0,
            nextDistractionAt: playTime + 7 + Math.random() * 5
          }))]);
        }

        // Move monsters
        if (monsters.length > 0) {
          const isSpiderTick = Math.floor(playTime * 2) % 2 === 0;

          setMonsters(prev => prev.map(m => {
            if (m.type === 'spider' && !isSpiderTick) return m;

            // Monsters only move if they are on the same Z-level as the player
            if ((m.z || 0) !== playerPos.z) return m;

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
              if (targetX < 0 || targetX >= canvasWidth / gridSize || targetY < 0 || targetY >= canvasHeight / gridSize) return false;

              // Must have a corridor or quad tile (not tree) on the same Z-level
              const targetTiles = tiles.filter(t => {
                if ((t.z || 0) !== (m.z || 0)) return false;
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
                if ((t.z || 0) !== (m.z || 0)) return false;
                if (t.size === 1) return t.x === m.x && t.y === m.y;
                return m.x >= t.x && m.x < t.x + 2 && m.y >= t.y && m.y < t.y + 2;
              });
              if (currentTiles.some(t => isWallBlocked(t, dir, m.x, m.y, false))) return false;

              // Wall check (next)
              if (targetTiles.some(t => isWallBlocked(t, oppDir, targetX, targetY, true))) return false;

              // Orc specific
              if (m.type === 'orc') {
                // Obstacles
                if (targetTiles.some(t => t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit' || t.type === 'obstacle-half-h' || t.type === 'obstacle-above')) return false;
                
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
                  
                  const lavaOrWater = sTargetTiles.find(t => t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit');
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

            // Skip if immobilized
            if (m.immobilizedUntil && playTime < m.immobilizedUntil) {
              return m;
            }

            // Invisibility Cloak logic: monsters move randomly if player has cloak (placed or active equippable)
            const isCloaked = hasCloak || (selectedArtefact === 'artefact-cloak' && isArtefactActive);
            if (isCloaked) {
              const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
              const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
              tryMove(randomDir[0], randomDir[1]);
              return { ...m, x: nextX, y: nextY };
            }

            // Teeth distraction logic
            let currentDistractedUntil = m.distractedUntil;
            let currentNextDistractionAt = m.nextDistractionAt;
            let currentDistractionDir = m.distractionDir;
            let isDistracted = false;

            if (m.type === 'teeth') {
              if (!currentDistractedUntil && currentNextDistractionAt && playTime >= currentNextDistractionAt) {
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const randomDir = dirs[Math.floor(Math.random() * dirs.length)];
                currentDistractedUntil = playTime + 5;
                currentDistractionDir = { dx: randomDir[0], dy: randomDir[1] };
              }
              
              if (currentDistractedUntil && playTime < currentDistractedUntil) {
                isDistracted = true;
                if (currentDistractionDir) {
                  tryMove(currentDistractionDir.dx, currentDistractionDir.dy);
                }
              }
              
              if (currentDistractedUntil && playTime >= currentDistractedUntil) {
                currentDistractedUntil = undefined;
                currentDistractionDir = undefined;
                currentNextDistractionAt = playTime + 7 + Math.random() * 5;
              }
            }

            if (!isDistracted) {
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
            }

            // Spider leaves web trail
            if (m.type === 'spider' && moved) {
              setTiles(prev => {
                // Check if web already exists at current position
                if (prev.some(t => t.type === 'web' && t.x === m.x && t.y === m.y)) return prev;
                return [...prev, {
                  id: Math.random().toString(36).substr(2, 9),
                  type: 'web',
                  x: m.x,
                  y: m.y,
                  rotation: 0,
                  size: 1
                }];
              });
            }

            // Check collision with player
            if (nextX === playerPos.x && nextY === playerPos.y) {
              const isTeeth = m.type === 'teeth';
              const isShielded = hasShield || (selectedArtefact === 'artefact-shield' && isArtefactActive);
              const canJumpOver = isTeeth && playerAction === 'jump';

              if (!isShielded && !canJumpOver) {
                setIsDying(true);
                setIsFlashing(true);
                setDeathCount(d => d + 1);
                setTimeout(() => {
                  setIsDying(false);
                  setIsFlashing(false);
                  const entrance = tiles.find(t => t.type === 'entrance');
                  if (entrance) setPlayerPos({ x: entrance.x, y: entrance.y, z: entrance.z || 0 });
                  setMonsters([]);
                  setPlayTime(0);
                }, 1000);
              }
            }

            return { 
              ...m, 
              x: nextX, 
              y: nextY,
              distractedUntil: currentDistractedUntil,
              nextDistractionAt: currentNextDistractionAt,
              distractionDir: currentDistractionDir
            };
          }));
        }
      }, moveInterval);
    }
    return () => clearInterval(interval);
  }, [mode, isGameOver, isWin, isDying, playTime, monsters.length, tiles, playerPos, hasShield, selectedArtefact, isArtefactActive, playerAction, hasCloak, isPaused, slowMonstersTime]);
};
