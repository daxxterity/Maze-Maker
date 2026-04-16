import { useCallback, useEffect } from 'react';
import { TileData, MonsterData, GameMode } from '../types';
import { getTileBounds } from '../lib/gameUtils';

interface PlayerMovementProps {
  mode: GameMode;
  isGameOver: boolean;
  isWin: boolean;
  isDying: boolean;
  isInitialArtefactSelection: boolean;
  isPaused: boolean;
  playerPos: { x: number; y: number; z: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  tiles: TileData[];
  setTiles: React.Dispatch<React.SetStateAction<TileData[]>>;
  monsters: MonsterData[];
  setMonsters: React.Dispatch<React.SetStateAction<MonsterData[]>>;
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
  jumpBoostTime: number;
  hasJumper: boolean;
  selectedArtefact: string | null;
  isArtefactActive: boolean;
  speedBoostTime: number;
  hasRunner: boolean;
  webSlowTime: number;
  setWebSlowTime: React.Dispatch<React.SetStateAction<number>>;
  setWebPressCount: React.Dispatch<React.SetStateAction<number>>;
  webPressCount: number;
  playTime: number;
  hasShield: boolean;
  setIsDying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFlashing: React.Dispatch<React.SetStateAction<boolean>>;
  setDeathCount: React.Dispatch<React.SetStateAction<number>>;
  setHealth: React.Dispatch<React.SetStateAction<number>>;
  setLastDirection: React.Dispatch<React.SetStateAction<{ dx: number; dy: number }>>;
  lastDirection: { dx: number; dy: number };
  setPlayerAction: React.Dispatch<React.SetStateAction<'normal' | 'jump' | 'slide'>>;
  playerAction: 'normal' | 'jump' | 'slide';
  isWallBlocked: (tile: TileData, dir: string, px: number, py: number, isEntry?: boolean) => boolean;
}

export const usePlayerMovement = ({
  mode,
  isGameOver,
  isWin,
  isDying,
  isInitialArtefactSelection,
  isPaused,
  playerPos,
  setPlayerPos,
  tiles,
  setTiles,
  monsters,
  setMonsters,
  gridSize,
  canvasWidth,
  canvasHeight,
  jumpBoostTime,
  hasJumper,
  selectedArtefact,
  isArtefactActive,
  speedBoostTime,
  hasRunner,
  webSlowTime,
  setWebSlowTime,
  setWebPressCount,
  webPressCount,
  playTime,
  hasShield,
  setIsDying,
  setIsFlashing,
  setDeathCount,
  setHealth,
  setLastDirection,
  lastDirection,
  setPlayerAction,
  playerAction,
  isWallBlocked
}: PlayerMovementProps) => {
  const movePlayer = useCallback((dx: number, dy: number, actionType: 'normal' | 'jump' | 'slide' = 'normal') => {
    if (mode !== 'play' || isGameOver || isWin || isDying || isInitialArtefactSelection || isPaused) return;

    const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    const oppositeDir = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down';

    if (dx !== 0 || dy !== 0) {
      setLastDirection({ dx, dy });
    }

    const isSpecial = actionType !== 'normal';
    const jumpMultiplier = (jumpBoostTime > 0 || hasJumper || (selectedArtefact === 'artefact-jumper' && isArtefactActive)) ? 2 : 1;
    const speedMultiplier = (speedBoostTime > 0 || hasRunner || (selectedArtefact === 'artefact-runner' && isArtefactActive)) ? 2 : 1;
    const webMultiplier = webSlowTime > 0 ? 0.5 : 1;
    
    let step = Math.max(1, Math.floor((actionType === 'jump' ? 2 * jumpMultiplier : 1) * speedMultiplier * webMultiplier));
    
    const currentZ = playerPos.z || 0;

    // Special jump for Lava/Water: jump over 2 tiles (land on 3rd)
    const checkX = playerPos.x + dx;
    const checkY = playerPos.y + dy;
    const checkTiles = tiles.filter(t => {
      if ((t.z || 0) !== currentZ) return false;
      const { x: tx, y: ty, width, height } = getTileBounds(t);
      return checkX >= tx && checkX < tx + width && checkY >= ty && checkY < ty + height;
    });
    const isTrapAhead = checkTiles.some(t => (t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit') && !t.isNeutralized);
    
    // Only jump if we are NOT already on a trap (to allow walking with boots)
    const currentTiles = tiles.filter(t => {
      if ((t.z || 0) !== currentZ) return false;
      const { x: tx, y: ty, width, height } = getTileBounds(t);
      return playerPos.x >= tx && playerPos.x < tx + width && playerPos.y >= ty && playerPos.y < ty + height;
    });
    const isCurrentlyOnTrap = currentTiles.some(t => (t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit') && !t.isNeutralized);

    let effectiveAction = actionType;
    if (actionType === 'jump' && isTrapAhead && !isCurrentlyOnTrap) {
      step = 3;
    }

    let finalX = playerPos.x;
    let finalY = playerPos.y;
    let finalZ = currentZ;

    for (let i = 0; i < step; i++) {
      const nextX = finalX + dx;
      const nextY = finalY + dy;
      const isIntermediate = step > 1 && i < step - 1;

      // Boundary check
      if (nextX < 0 || nextX >= canvasWidth / gridSize || nextY < 0 || nextY >= canvasHeight / gridSize) break;

      const nextTiles = tiles.filter(t => {
        const tz = t.z || 0;
        const isStair = t.type === 'stairs-up' || t.type === 'stairs-down' || t.type === 'hole';
        
        // Normal tiles must be on current Z
        if (!isStair && tz !== finalZ) return false;
        
        // Stairs/Holes are relevant if they are on current Z or connect to it
        if (t.type === 'stairs-up' && tz !== finalZ && tz !== finalZ - 1) return false;
        if (t.type === 'stairs-down' && tz !== finalZ && tz !== finalZ + 1) return false;
        if (t.type === 'hole' && tz !== finalZ && tz !== finalZ + 1) return false;

        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return nextX >= tx && nextX < tx + width && nextY >= ty && nextY < ty + height;
      });

      // Monster collision check (Cannot jump over Orcs or Spiders, but CAN jump over Teeth)
      const monsterAtNext = monsters.find(m => m.x === nextX && m.y === nextY && (m.z || 0) === finalZ);
      if (monsterAtNext) {
        const isTeeth = monsterAtNext.type === 'teeth';
        const canJumpOver = isTeeth && effectiveAction === 'jump';
        const isShielded = hasShield || (selectedArtefact === 'artefact-shield' && isArtefactActive);

        if (canJumpOver) {
          // Immobilize Teeth for 4 seconds after jumping over them
          setMonsters(prev => prev.map(m => m.id === monsterAtNext.id ? { ...m, immobilizedUntil: playTime + 4 } : m));
        }

        if (!canJumpOver && !isShielded) {
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
              setPlayerPos({ x: entrance.x, y: entrance.y, z: entrance.z || 0 });
            }
            setMonsters([]);
          }, 1000);
          break;
        }
      }

      // Wall check (current)
      const currentPosTiles = tiles.filter(t => {
        if ((t.z || 0) !== finalZ) return false;
        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return finalX >= tx && finalX < tx + width && finalY >= ty && finalY < ty + height;
      });
      if (currentPosTiles.some(t => isWallBlocked(t, direction, finalX, finalY, false))) break;

      // Wall check (next)
      if (nextTiles.some(t => isWallBlocked(t, oppositeDir, nextX, nextY, true))) break;

      // Obstacle check (unless jumping)
      if (effectiveAction !== 'jump') {
        const isBlocked = nextTiles.some(t => {
          if (t.isNeutralized) return false;
          return t.type === 'obstacle-half-h' || t.type === 'obstacle-above' || t.type === 'column';
        });
        if (isBlocked) break;
      }

      // Stair logic
      const stairUp = nextTiles.find(t => t.type === 'stairs-up' && (t.z || 0) === finalZ);
      const stairDown = nextTiles.find(t => t.type === 'stairs-down' && (t.z || 0) === finalZ);
      const hole = nextTiles.find(t => t.type === 'hole' && (t.z || 0) === finalZ);

      if (stairUp) {
        finalZ += 1;
      } else if (stairDown || hole) {
        finalZ -= 1;
      }

      finalX = nextX;
      finalY = nextY;
    }

    setPlayerPos({ x: finalX, y: finalY, z: finalZ });
  }, [mode, isGameOver, isWin, isDying, isInitialArtefactSelection, isPaused, playerPos, tiles, monsters, gridSize, canvasWidth, canvasHeight, jumpBoostTime, hasJumper, selectedArtefact, isArtefactActive, speedBoostTime, hasRunner, webSlowTime, playTime, hasShield, setIsDying, setIsFlashing, setDeathCount, setHealth, setLastDirection, isWallBlocked, setMonsters, setPlayerPos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'play') return;
      
      if (webSlowTime > 0) {
        setWebPressCount(prev => prev + 1);
        if (webPressCount >= 5) {
          setWebSlowTime(0);
          setWebPressCount(0);
        }
        return;
      }

      let dx = 0;
      let dy = 0;
      let action: 'normal' | 'jump' | 'slide' = 'normal';

      if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
      else if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;
      else if (e.key === ' ' || e.key === 'j') {
        action = 'jump';
        dx = lastDirection.dx;
        dy = lastDirection.dy;
      } else if (e.key === 'k') {
        action = 'slide';
        dx = lastDirection.dx;
        dy = lastDirection.dy;
      }

      if (dx !== 0 || dy !== 0) {
        setPlayerAction(action);
        movePlayer(dx, dy, action);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'j' || e.key === 'k') {
        setPlayerAction('normal');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, movePlayer, webSlowTime, webPressCount, lastDirection, setPlayerAction, setWebPressCount, setWebSlowTime]);

  return { movePlayer };
};
