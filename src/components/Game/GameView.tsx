import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import { Skull, Trophy, Plus, Zap, Settings, RotateCw } from 'lucide-react';
import Konva from 'konva';
import { cn } from '../../lib/utils';
import { 
  TileData, 
  GameMode, 
  CampaignData, 
  SitemapData, 
  TileType,
  MonsterData,
  TriggerData
} from '../../types';
import { TILE_LIBRARY, ARTEFACTS } from '../../constants';
import { TileRenderer } from './TileRenderer';
import { MoonTimer } from '../HUD/MoonTimer';

interface GameViewProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<Konva.Stage | null>;
  containerSize: { width: number; height: number };
  mode: GameMode;
  stageScale: number;
  stagePos: { x: number; y: number };
  setStagePos: (pos: { x: number; y: number }) => void;
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
  tiles: TileData[];
  monsters: MonsterData[];
  triggers: TriggerData[];
  playerPos: { x: number; y: number; z: number };
  health: number;
  deathCount: number;
  timeLeft: number;
  levelTimeLimit: number;
  dungeonName: string;
  isPowerUpActive: boolean;
  isThirdEyeActive: boolean;
  powerUpTimeLeft: number;
  powerUpDuration: number;
  thirdEyeTimeLeft: number;
  speedBoostTime: number;
  jumpBoostTime: number;
  lightTime: number;
  slowMonstersTime: number;
  trappedTime: number;
  isWin: boolean;
  isGameOver: boolean;
  isDying: boolean;
  isPaused: boolean;
  hiddenTileIds: Set<string>;
  currentZ: number;
  tick: number;
  pressedKeys: Set<string>;
  activeCampaign: CampaignData | null;
  sitemaps: SitemapData[];
  currentLevelIndex: number;
  activeSitemapScreen: any;
  isInitialArtefactSelection: boolean;
  selectedArtefact: string | null;
  isArtefactActive: boolean;
  isArtefactReloading: boolean;
  showArtefactMenu: boolean;
  setShowArtefactMenu: (show: boolean) => void;
  setSelectedArtefact: (id: any) => void;
  setShowArtefactConfirmation: (show: boolean) => void;
  restartGame: () => void;
  handleCanvasClick: (e: any) => void;
  handleRightClick: (e: any) => void;
  handleWheel: (e: any) => void;
  undo: () => void;
  history: any[];
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
  buildTool: string;
  selectedTileType: TileType;
  movingTileId: string | null;
}

export const GameView = ({
  containerRef,
  stageRef,
  containerSize,
  mode,
  stageScale,
  stagePos,
  setStagePos,
  gridSize,
  canvasWidth,
  canvasHeight,
  tiles,
  monsters,
  triggers,
  playerPos,
  health,
  deathCount,
  timeLeft,
  levelTimeLimit,
  dungeonName,
  isPowerUpActive,
  isThirdEyeActive,
  powerUpTimeLeft,
  powerUpDuration,
  thirdEyeTimeLeft,
  speedBoostTime,
  jumpBoostTime,
  lightTime,
  slowMonstersTime,
  trappedTime,
  isWin,
  isGameOver,
  isDying,
  isPaused,
  hiddenTileIds,
  currentZ,
  tick,
  pressedKeys,
  activeCampaign,
  sitemaps,
  currentLevelIndex,
  activeSitemapScreen,
  isInitialArtefactSelection,
  selectedArtefact,
  isArtefactActive,
  isArtefactReloading,
  showArtefactMenu,
  setShowArtefactMenu,
  setSelectedArtefact,
  setShowArtefactConfirmation,
  restartGame,
  handleCanvasClick,
  handleRightClick,
  handleWheel,
  undo,
  history,
  showDebug,
  setShowDebug,
  buildTool,
  selectedTileType,
  movingTileId
}: GameViewProps) => {
  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
    >
      {mode === 'play' && (
        <>
          <div className="absolute top-4 right-4 z-30">
            <MoonTimer timeLeft={timeLeft} limit={levelTimeLimit} />
          </div>
          
          {/* Top Left HUD */}
          <div className="absolute top-6 left-6 z-40 flex flex-col gap-1 pointer-events-none">
            <h2 className="text-xl font-black text-amber-500 tracking-tighter uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-serif italic">
              {dungeonName || "CORRIDOR OF TEARS"}
            </h2>
            
            {/* Health Bar */}
            <div className="relative w-64 h-3 bg-zinc-900/80 rounded-full border border-amber-900/50 overflow-hidden shadow-inner flex items-center px-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${health}%` }}
                className="h-1.5 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full shadow-[0_0_10px_rgba(244,114,182,0.4)]"
              />
            </div>

            {/* Skull Row */}
            <div className="flex flex-wrap gap-1 mt-1">
              <AnimatePresence>
                {Array.from({ length: deathCount }).map((_, i) => (
                  <motion.div 
                    key={`death-skull-${i}`}
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-[#f5f5dc] drop-shadow-md"
                  >
                    <Skull size={12} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
      
      {isInitialArtefactSelection && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-30 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-pulse">
            <div className="text-cyan-400 font-mono text-xs uppercase tracking-[0.3em] mb-2">Equip your starting artefact</div>
            <div className="text-zinc-500 text-[10px] italic">Look at the top menu</div>
            <div className="mt-8 flex flex-col items-center">
              <div className="w-px h-12 bg-gradient-to-b from-cyan-500/0 to-cyan-500" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            </div>
          </div>
        </div>
      )}

      <Stage 
        width={containerSize.width} 
        height={containerSize.height} 
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={pressedKeys.has(' ') || mode === 'build'}
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
        ref={stageRef}
        style={{ backgroundColor: 'transparent' }} 
      >
        <Layer>
          {/* Dungeon Floor Background */}
          <Rect
            x={-10000}
            y={-10000}
            width={20000 + canvasWidth}
            height={20000 + canvasHeight}
            fill="#09090b"
          />

          {/* Grid Lines */}
          {[...Array(Math.ceil((canvasWidth + 20000) / gridSize) + 1)].map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[(i * gridSize) - 10000, -10000, (i * gridSize) - 10000, canvasHeight + 10000]}
              stroke="#ffffff"
              strokeWidth={0.5}
              opacity={0.05}
            />
          ))}
          {[...Array(Math.ceil((canvasHeight + 20000) / gridSize) + 1)].map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[-10000, (i * gridSize) - 10000, canvasWidth + 10000, (i * gridSize) - 10000]}
              stroke="#ffffff"
              strokeWidth={0.5}
              opacity={0.05}
            />
          ))}

          {/* Tiles */}
          {mode === 'build' && tiles
            .filter(t => (t.z || 0) === currentZ - 1)
            .map((tile) => (
              <Group key={`ghost-below-${tile.id}`} opacity={0.15}>
                <TileRenderer 
                  tile={tile} 
                  hasArtefact={false} 
                  isPowerUpActive={false} 
                  isThirdEyeActive={false}
                  thirdEyeTimeLeft={0}
                  powerUpTimeLeft={0}
                  powerUpDuration={powerUpDuration}
                  tick={tick} 
                  mode="play"
                  targetZ={currentZ}
                  gridSize={gridSize}
                />
              </Group>
            ))
          }
          {mode === 'build' && tiles
            .filter(t => (t.z || 0) === currentZ + 1)
            .map((tile) => (
              <Group key={`ghost-above-${tile.id}`} opacity={0.15}>
                <TileRenderer 
                  tile={tile} 
                  hasArtefact={false} 
                  isPowerUpActive={false} 
                  isThirdEyeActive={false}
                  thirdEyeTimeLeft={0}
                  powerUpTimeLeft={0}
                  powerUpDuration={powerUpDuration}
                  tick={tick} 
                  mode="play"
                  targetZ={currentZ}
                  gridSize={gridSize}
                />
              </Group>
            ))
          }

          {tiles
            .filter(t => {
              const isMonsterTile = TILE_LIBRARY.find(tl => tl.type === t.type)?.category === 'monster';
              if (mode === 'play' && isMonsterTile) return false;
              
              const targetZ = mode === 'play' ? playerPos.z : currentZ;
              const tz = t.z || 0;
              
              if (mode === 'play') {
                if (tz === targetZ) return !hiddenTileIds.has(t.id);
                if (t.type === 'stairs-up' && tz === targetZ - 1) return !hiddenTileIds.has(t.id);
                if (t.type === 'stairs-down' && tz === targetZ + 1) return !hiddenTileIds.has(t.id);
                if (t.type === 'hole' && tz === targetZ + 1) return !hiddenTileIds.has(t.id);
                return false;
              }

              if (tz !== targetZ) return false;
              return mode === 'build' || !hiddenTileIds.has(t.id);
            })
            .sort((a, b) => {
              const catA = TILE_LIBRARY.find(t => t.type === a.type)?.category;
              const catB = TILE_LIBRARY.find(t => t.type === b.type)?.category;
              if (catA === 'monster' && catB !== 'monster') return 1;
              if (catA !== 'monster' && catB === 'monster') return -1;
              return 0;
            })
            .map((tile) => (
              <TileRenderer 
                key={tile.id} 
                tile={tile} 
                hasArtefact={false} 
                isPowerUpActive={isPowerUpActive} 
                isThirdEyeActive={isThirdEyeActive}
                thirdEyeTimeLeft={thirdEyeTimeLeft}
                powerUpTimeLeft={powerUpTimeLeft}
                powerUpDuration={powerUpDuration}
                tick={tick} 
                mode={mode}
                gridSize={gridSize}
              />
            ))
          }

          {/* Player */}
          {mode === 'play' && (
            <Group 
              x={playerPos.x * gridSize} 
              y={playerPos.y * gridSize}
            >
              <Rect 
                width={gridSize} 
                height={gridSize} 
                fill="#f472b6" 
                cornerRadius={4}
                shadowBlur={10}
                shadowColor="#f472b6"
                opacity={isDying ? 0.5 : 1}
              />
              <Rect 
                width={gridSize - 8} 
                height={gridSize - 8} 
                x={4}
                y={4}
                fill="#fbcfe8" 
                cornerRadius={2}
              />
            </Group>
          )}

          {/* Monsters */}
          {mode === 'play' && monsters
            .filter(m => (m.z || 0) === playerPos.z)
            .map((monster) => (
              <Group 
                key={monster.id}
                x={monster.x * gridSize} 
                y={monster.y * gridSize}
              >
                <Rect 
                  width={gridSize} 
                  height={gridSize} 
                  fill="#ef4444" 
                  cornerRadius={4}
                  shadowBlur={5}
                  shadowColor="#ef4444"
                />
                <Text 
                  text="👹" 
                  fontSize={gridSize * 0.6} 
                  x={gridSize * 0.2} 
                  y={gridSize * 0.2} 
                />
              </Group>
            ))
          }

          {/* HUD Layer inside Stage */}
          {mode === 'play' && (
            <Group x={canvasWidth / 2 - 100} y={20}>
              <Rect width={200} height={30} fill="rgba(0,0,0,0.5)" cornerRadius={5} />
              
              <Group y={12}>
                {isPowerUpActive && <Rect x={5} width={30} height={12} fill="#ec4899" cornerRadius={2} />}
                {isThirdEyeActive && <Rect x={40} width={30} height={12} fill="#a855f7" cornerRadius={2} />}
                {speedBoostTime > 0 && <Rect x={75} width={30} height={12} fill="#6366f1" cornerRadius={2} />}
                {jumpBoostTime > 0 && <Rect x={110} width={30} height={12} fill="#f97316" cornerRadius={2} />}
                {lightTime > 0 && <Rect x={145} width={30} height={12} fill="#fef08a" cornerRadius={2} />}
                {slowMonstersTime > 0 && <Rect x={180} width={30} height={12} fill="#94a3b8" cornerRadius={2} />}
                
                <Text text="RUNES" fontSize={6} fill="white" x={8} y={3} fontStyle="bold" opacity={isPowerUpActive ? 1 : 0.2} />
                <Text text="EYE" fontSize={6} fill="white" x={48} y={3} fontStyle="bold" opacity={isThirdEyeActive ? 1 : 0.2} />
                <Text text="SPEED" fontSize={6} fill="white" x={78} y={3} fontStyle="bold" opacity={speedBoostTime > 0 ? 1 : 0.2} />
                <Text text="JUMP" fontSize={6} fill="white" x={114} y={3} fontStyle="bold" opacity={jumpBoostTime > 0 ? 1 : 0.2} />
                <Text text="LIGHT" fontSize={6} fill="white" x={149} y={3} fontStyle="bold" opacity={lightTime > 0 ? 1 : 0.2} />
                <Text text="SLOW" fontSize={6} fill="white" x={185} y={3} fontStyle="bold" opacity={slowMonstersTime > 0 ? 1 : 0.2} />
              </Group>
              
              {trappedTime > 0 && (
                <Group y={35}>
                  <Rect width={200} height={15} fill="rgba(239, 68, 68, 0.8)" cornerRadius={3} />
                  <Text 
                    text={`TRAPPED! DEATH IN ${10 - trappedTime}s`} 
                    fontSize={8} 
                    fill="white" 
                    width={200} 
                    align="center" 
                    y={3} 
                    fontStyle="bold" 
                  />
                </Group>
              )}
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Win State Overlay */}
      <AnimatePresence>
        {isWin && !activeSitemapScreen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border-2 border-emerald-500 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Trophy size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">You Escaped!</h2>
              <p className="text-zinc-400 mb-6">The dungeon has been conquered.</p>
              <button 
                onClick={restartGame}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm"
              >
                Play Again
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overlay Info */}
      {mode === 'build' && (
        <div className="absolute bottom-4 left-4 pointer-events-none flex flex-col items-start gap-1">
          <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-zinc-400">
            TOOL: {buildTool.toUpperCase()} | {buildTool === 'place' ? 'L-CLICK: PLACE/ROTATE' : buildTool === 'move' ? (movingTileId ? 'CLICK EMPTY TO DROP' : 'CLICK TILE TO PICK UP') : 'CLICK TILE TO ' + buildTool.toUpperCase()}
          </div>
          <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded border border-white/10 text-[10px] font-mono text-zinc-400">
            SELECTED: {selectedTileType.toUpperCase()}
          </div>
        </div>
      )}

      {mode === 'play' && (
        <div className="absolute bottom-6 left-6 z-40 flex items-end gap-8 pointer-events-none">
          {/* Artefacts Section */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Artefacts</div>
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="relative">
                <button 
                  onClick={() => setShowArtefactMenu(!showArtefactMenu)}
                  className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center transition-all relative overflow-hidden group",
                    selectedArtefact 
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      : "bg-zinc-800/50 border-white/10 text-zinc-500 hover:border-white/20"
                  )}
                >
                  {selectedArtefact ? (
                    <div className="relative z-10">
                      {ARTEFACTS.find(a => a.id === selectedArtefact)?.icon}
                    </div>
                  ) : (
                    <Plus size={16} opacity={0.3} />
                  )}
                  
                  {isArtefactActive && (
                    <motion.div 
                      layoutId="active-glow"
                      className="absolute inset-0 bg-cyan-400/20 animate-pulse"
                    />
                  )}
                </button>

                <AnimatePresence>
                  {showArtefactMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: -12, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                    >
                      <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Equip Artefact</div>
                      <div className="space-y-1">
                        {ARTEFACTS.map(a => (
                          <button
                            key={a.id}
                            onClick={() => {
                              setSelectedArtefact(a.id as any);
                              setShowArtefactMenu(false);
                              if (isInitialArtefactSelection) {
                                setShowArtefactConfirmation(true);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors">
                              {a.icon}
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-zinc-200">{a.label}</div>
                              <div className="text-[8px] text-zinc-500">{a.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Power-ups Section */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Power-ups</div>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl border flex items-center justify-center transition-all relative overflow-hidden",
                isPowerUpActive 
                  ? "bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                  : "bg-zinc-800/50 border-white/10 text-zinc-500"
              )}>
                {isPowerUpActive ? <Zap size={24} className="animate-pulse" /> : <Zap size={20} opacity={0.3} />}
                
                {isPowerUpActive && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900/50">
                    <div 
                      className={cn(
                        "h-full transition-all duration-100",
                        (powerUpTimeLeft / powerUpDuration) < 0.25 ? "bg-red-500 animate-pulse" : "bg-pink-400"
                      )}
                      style={{ width: `${(powerUpTimeLeft / powerUpDuration) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              {isPowerUpActive && (
                <div className="text-[10px] font-mono text-pink-400 uppercase tracking-widest">
                  Running x2
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'play' && (
        <div className="absolute bottom-6 right-6 pointer-events-none flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-2">
            Press Tab to Focus
          </div>
          <div className="bg-zinc-900/40 backdrop-blur-sm px-3 py-1.5 rounded border border-white/5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            WASD: MOVE | SPACE: JUMP | SHIFT: SLIDE
          </div>
        </div>
      )}
    </div>
  );
};
