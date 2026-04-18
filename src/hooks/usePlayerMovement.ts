import { useCallback, useEffect } from 'react';
import { TileData, MonsterData, GameMode } from '../types';
import { getTileBounds, isSwerveBlocked } from '../lib/gameUtils';

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
  speedBoostTime: number;
  jumpBoostTime: number;
  hasRunner: boolean;
  hasJumper: boolean;
  selectedArtefact: string | null;
  isArtefactActive: boolean;
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
  pressedKeys: Set<string>;
  setPressedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setTextEditModal: React.Dispatch<React.SetStateAction<any>>;
  setBumpEffect: React.Dispatch<React.SetStateAction<{ x: number, y: number, tick: number } | null>>;
  tick: number;
  setIsFalling: React.Dispatch<React.SetStateAction<boolean>>;
  isFalling: boolean;
  hasBoots: boolean;
  spawnProtectionTime: number;
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
  selectedArtefact,
  isArtefactActive,
  speedBoostTime,
  jumpBoostTime,
  hasRunner,
  hasJumper,
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
  isWallBlocked,
  pressedKeys,
  setPressedKeys,
  setTextEditModal,
  setBumpEffect,
  tick,
  setIsFalling,
  isFalling,
  hasBoots,
  spawnProtectionTime
}: PlayerMovementProps) => {
  const movePlayer = useCallback((dx: number, dy: number, actionType: 'normal' | 'jump' | 'slide' = 'normal', currentKeys?: Set<string>) => {
    if (mode !== 'play' || isGameOver || isWin || isDying || isInitialArtefactSelection || isPaused || isFalling) return;

    const activeKeys = currentKeys || pressedKeys;
    const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    const oppositeDir = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down';

    if (dx !== 0 || dy !== 0) {
      setLastDirection({ dx, dy });
    }

    let effectiveAction: 'normal' | 'jump' | 'slide' = actionType;
    if (actionType === 'normal') {
      if (activeKeys.has('lmb') || activeKeys.has('k')) {
        effectiveAction = 'slide';
      }
    }

    const speedMultiplier = (speedBoostTime > 0 || hasRunner || (selectedArtefact === 'artefact-runner' && isArtefactActive)) ? 2 : 1;
    const webMultiplier = webSlowTime > 0 ? 0.5 : 1;
    
    const isJumping = actionType === 'jump';
    let step = Math.max(1, Math.floor(speedMultiplier * webMultiplier));
    if (isJumping) {
      step = (hasJumper || (selectedArtefact === 'artefact-jumper' && isArtefactActive) || jumpBoostTime > 0) ? 5 : 3;
    }
    
    const currentZ = playerPos.z || 0;

    let finalX = playerPos.x;
    let finalY = playerPos.y;
    let finalZ = currentZ;

    for (let i = 0; i < step; i++) {
      const nextX = finalX + dx;
      const nextY = finalY + dy;
      const isIntermediate = step > 1 && i < step - 1;

      const nextTiles = tiles.filter(t => {
        const tz = t.z || 0;
        const isStair = t.type === 'stairs-up' || t.type === 'stairs-down' || t.type === 'hole';
        
        if (!isStair && tz !== finalZ) return false;
        
        if (t.type === 'stairs-up' && tz !== finalZ && tz !== finalZ - 1) return false;
        if (t.type === 'stairs-down' && tz !== finalZ && tz !== finalZ + 1) return false;
        if (t.type === 'hole' && tz !== finalZ && tz !== finalZ + 1) return false;

        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return nextX >= tx && nextX < tx + width && nextY >= ty && nextY < ty + height;
      });

      const monsterAtNext = monsters.find(m => m.x === nextX && m.y === nextY && (m.z || 0) === finalZ);
      if (monsterAtNext && !isGameOver && !isJumping) {
        const isShielded = hasShield || (selectedArtefact === 'artefact-shield' && isArtefactActive);

        if (!isShielded && spawnProtectionTime <= 0) {
          setIsDying(true);
          setDeathCount(prev => prev + 1);
          setHealth(0);
          finalX = nextX;
          finalY = nextY;
          break;
        }
      }

      // Wall & Obstacle check
      let blockedVal = false;
      
      const currentPosTiles = tiles.filter(t => {
        if ((t.z || 0) !== finalZ) return false;
        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return finalX >= tx && finalX < tx + width && finalY >= ty && finalY < ty + height;
      });

      if (currentPosTiles.some(t => isWallBlocked(t, direction, finalX, finalY, false))) blockedVal = true;

      if (!blockedVal) {
        if (nextTiles.some(t => isWallBlocked(t, oppositeDir, nextX, nextY, true))) blockedVal = true;
      }

      // Solid objects ALWAYS block (trees, columns)
      const solidObstacle = nextTiles.find(t => !t.isNeutralized && (t.type === 'column' || t.type === 'tree'));
      if (solidObstacle) blockedVal = true;

      if (blockedVal) break;

      // Other obstacles & Hazards
      const isBlockedByOther = nextTiles.some(t => {
        if (t.isNeutralized) return false;
        const isSliding = effectiveAction === 'slide';

        if (t.type === 'obstacle-half-h') return true;
        if (t.type === 'obstacle-above' && !isSliding) return true;
        
        // Swerve check
        if (t.type === 'obstacle-half-w') {
          const blocked = isSwerveBlocked(t, direction, false, activeKeys);
          setBumpEffect({ x: nextX, y: nextY, tick });
          return blocked;
        }

        // Hazards
        const isHazard = t.type === 'void' || t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit';
        if (isHazard && !isJumping) {
          if (spawnProtectionTime > 0) return false; // Protection 
          
          setHealth(0);
          setDeathCount(prev => prev + 1);
          if (t.type === 'void') setIsFalling(true);
          else setIsDying(true);
          
          finalX = nextX; finalY = nextY;
          return true;
        }
        return false;
      });
      if (isBlockedByOther) break;

      // Interaction check DURING movement to prevent skipping clues/messages
      const infoTile = nextTiles.find(t => t.type === 'message' || t.type === 'clue');
      if (infoTile && infoTile.message) {
        setTextEditModal((prev: any) => {
          if (!prev.isOpen || prev.tileId !== infoTile.id) {
            return {
              isOpen: true,
              tileId: infoTile.id,
              text: infoTile.message,
              type: infoTile.type as 'message' | 'clue',
              mode: 'view',
              autoCloseAt: Date.now() + 6000
            };
          }
          return prev;
        });
      }
      // Stair/Hole logic
      if (!isIntermediate) {
        const stairUp = nextTiles.find(t => t.type === 'stairs-up' && (t.z || 0) === finalZ);
        const stairDown = nextTiles.find(t => t.type === 'stairs-down' && (t.z || 0) === finalZ);
        const hole = nextTiles.find(t => t.type === 'hole' && (t.z || 0) === finalZ);

        if (stairUp) {
          finalZ += 1;
        } else if (stairDown || hole) {
          finalZ -= 1;
        }
      }

      finalX = nextX;
      finalY = nextY;
    }

    setPlayerAction(actionType);
    setPlayerPos({ x: Math.round(finalX), y: Math.round(finalY), z: finalZ });

    if (actionType !== 'normal') {
      setTimeout(() => setPlayerAction('normal'), actionType === 'jump' ? 400 : 300);
    }
  }, [mode, isGameOver, isWin, isDying, isFalling, isInitialArtefactSelection, isPaused, playerPos, tiles, monsters, playTime, hasShield, selectedArtefact, isArtefactActive, speedBoostTime, hasRunner, hasJumper, jumpBoostTime, webSlowTime, setIsDying, setDeathCount, setHealth, setLastDirection, setPlayerAction, setMonsters, setTextEditModal, setBumpEffect, tick, setIsFalling, spawnProtectionTime, isWallBlocked, setPlayerPos]);

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
      let key: string | null = null;
      let action: 'normal' | 'slide' = 'normal';

      if (e.key === 'ArrowUp' || e.key === 'w') { dy = -1; key = 'w'; }
      else if (e.key === 'ArrowDown' || e.key === 's') { dy = 1; key = 's'; }
      else if (e.key === 'ArrowLeft' || e.key === 'a') { dx = -1; key = 'a'; }
      else if (e.key === 'ArrowRight' || e.key === 'd') { dx = 1; key = 'd'; }
      else if (e.key === ' ' && playerAction === 'normal') {
        e.preventDefault();
        movePlayer(lastDirection.dx, lastDirection.dy, 'jump');
        return;
      }
      else if (e.key === 'k') {
        action = 'slide';
        dx = lastDirection.dx;
        dy = lastDirection.dy;
        key = 'k';
      }

      if (key) {
        const nextKeys = new Set(pressedKeys);
        nextKeys.add(key);
        setPressedKeys(nextKeys);
        
        let finalAction = action;
        if (nextKeys.has('lmb') || nextKeys.has('k')) finalAction = 'slide';

        if (dx !== 0 || dy !== 0) {
          setPlayerAction(finalAction);
          movePlayer(dx, dy, finalAction, nextKeys);
        }
      } else {
        if (dx !== 0 || dy !== 0) {
          let finalAction = action;
          if (pressedKeys.has('lmb') || pressedKeys.has('k')) finalAction = 'slide';
          setPlayerAction(finalAction);
          movePlayer(dx, dy, finalAction, pressedKeys);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let key = '';
      if (e.key === 'ArrowUp' || e.key === 'w') key = 'w';
      else if (e.key === 'ArrowDown' || e.key === 's') key = 's';
      else if (e.key === 'ArrowLeft' || e.key === 'a') key = 'a';
      else if (e.key === 'ArrowRight' || e.key === 'd') key = 'd';
      else if (e.key === 'k') key = 'k';

      if (key) {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
      
      if (e.key === 'k') {
        if (!pressedKeys.has('lmb') && !pressedKeys.has('k')) {
          setPlayerAction('normal');
        } else {
          setPlayerAction('slide');
        }
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
