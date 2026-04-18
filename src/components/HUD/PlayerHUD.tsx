import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Shield, 
  Zap, 
  Wind, 
  Footprints, 
  ArrowUp, 
  Ghost, 
  Trophy, 
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { MoonTimer } from './MoonTimer';

interface PlayerHUDProps {
  health: number;
  timeLeft: number;
  levelTimeLimit: number;
  activePowerUp: string | null;
  powerUpTimeLeft: number;
  powerUpDuration: number;
  activeArtefact: string | null;
  artefactCooldown: number;
  artefacts: string[];
  isDarknessActive: boolean;
  isSlowActive: boolean;
  isThirdEyeActive: boolean;
  thirdEyeTimeLeft: number;
  isTrapped: boolean;
  trappedTime: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'trapped';
  resetGameState: () => void;
  loadLevel: (id: string) => void;
  currentLevelId: string | null;
}

export const PlayerHUD = (props: PlayerHUDProps) => {
  const {
    health,
    timeLeft,
    levelTimeLimit,
    activePowerUp,
    powerUpTimeLeft,
    powerUpDuration,
    activeArtefact,
    artefactCooldown,
    artefacts,
    isDarknessActive,
    isSlowActive,
    isThirdEyeActive,
    thirdEyeTimeLeft,
    isTrapped,
    trappedTime,
    gameStatus,
    resetGameState,
    loadLevel,
    currentLevelId
  } = props;

  return (
    <>
      {/* HUD: Health & Timer */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-20">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
          <div className="relative">
            <Heart className={cn("text-red-500", health < 30 && "animate-pulse")} size={20} fill={health < 30 ? "currentColor" : "none"} />
            {health < 30 && <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />}
          </div>
          <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              className={cn("h-full transition-all", health > 50 ? "bg-emerald-500" : health > 25 ? "bg-amber-500" : "bg-red-500")}
              animate={{ width: `${health}%` }}
            />
          </div>
          <span className="text-xs font-black text-white w-8 font-mono">{Math.ceil(health)}</span>
        </div>

        <MoonTimer timeLeft={timeLeft} limit={levelTimeLimit} />
      </div>

      {/* HUD: Artefacts & Status */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20">
        <AnimatePresence mode="wait">
          {(isDarknessActive || isSlowActive || isThirdEyeActive || isTrapped) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex gap-2"
            >
              {isDarknessActive && (
                <div className="px-3 py-1.5 bg-zinc-950/80 border border-indigo-500/50 rounded-full flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <Ghost size={12} className="animate-pulse" />
                  Darkness
                </div>
              )}
              {isSlowActive && (
                <div className="px-3 py-1.5 bg-zinc-950/80 border border-amber-500/50 rounded-full flex items-center gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Footprints size={12} className="animate-bounce" />
                  Slowed
                </div>
              )}
              {isThirdEyeActive && (
                <div className="px-3 py-1.5 bg-zinc-950/80 border border-purple-500/50 rounded-full flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                  <Zap size={12} className="animate-pulse" />
                  Third Eye ({Math.ceil(thirdEyeTimeLeft)}s)
                </div>
              )}
              {isTrapped && (
                <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  <AlertCircle size={12} />
                  Trapped ({Math.ceil(3 - trappedTime)}s)
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
          {['artefact-shield', 'artefact-rod', 'artefact-cloak', 'artefact-boots', 'artefact-runner'].map((art) => {
            const isOwned = artefacts.includes(art);
            const isActive = activeArtefact === art;
            const isCooldown = activeArtefact === art && artefactCooldown > 0;
            
            return (
              <div 
                key={art}
                className={cn(
                  "w-12 h-12 rounded-xl border flex items-center justify-center transition-all relative group overflow-hidden",
                  isOwned ? "bg-zinc-800 border-white/20" : "bg-zinc-950/50 border-white/5 opacity-20 grayscale",
                  isActive && "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-110 z-10"
                )}
              >
                {art === 'artefact-shield' && <Shield size={20} className={cn(isOwned ? "text-blue-400" : "text-zinc-600")} />}
                {art === 'artefact-rod' && <Zap size={20} className={cn(isOwned ? "text-emerald-400" : "text-zinc-600")} />}
                {art === 'artefact-cloak' && <Ghost size={20} className={cn(isOwned ? "text-indigo-400" : "text-zinc-600")} />}
                {art === 'artefact-boots' && <Footprints size={20} className={cn(isOwned ? "text-orange-400" : "text-zinc-600")} />}
                {art === 'artefact-runner' && <Wind size={20} className={cn(isOwned ? "text-cyan-400" : "text-zinc-600")} />}
                
                {isActive && (
                  <motion.div 
                    className="absolute inset-0 bg-indigo-500/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
                
                {isCooldown && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-black text-white font-mono">
                    {Math.ceil(artefactCooldown)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Power-up Active Indicator */}
      <AnimatePresence>
        {activePowerUp && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-24 right-8 z-20"
          >
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-indigo-500/30 shadow-2xl flex items-center gap-4 min-w-[200px]">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                {activePowerUp === 'speed' ? <Zap size={20} /> : <Ghost size={20} />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    {activePowerUp === 'speed' ? 'Speed Boost' : 'Third Eye'}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400">{Math.ceil(powerUpTimeLeft)}s</span>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-indigo-500"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(powerUpTimeLeft / powerUpDuration) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over / Win Overlays */}
      <AnimatePresence>
        {gameStatus !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className={cn(
                "max-w-md w-full bg-zinc-900 border rounded-3xl p-8 shadow-2xl text-center",
                gameStatus === 'won' ? "border-emerald-500/50 shadow-emerald-500/10" : "border-red-500/50 shadow-red-500/10"
              )}
            >
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                gameStatus === 'won' ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
              )}>
                {gameStatus === 'won' ? <Trophy size={40} /> : <RotateCw size={40} />}
              </div>
              
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">
                {gameStatus === 'won' ? "Dungeon Conquered!" : gameStatus === 'trapped' ? "You are Trapped!" : "Dungeon Failed"}
              </h2>
              
              <p className="text-zinc-400 mb-8 font-medium">
                {gameStatus === 'won' 
                  ? "You have successfully navigated the maze and escaped with the artefacts!" 
                  : gameStatus === 'trapped'
                  ? "The path has closed behind you and there is no way out. The shadows claim another soul."
                  : "The darkness has overcome you. Your journey ends here."}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    resetGameState();
                    if (currentLevelId) loadLevel(currentLevelId);
                  }}
                  className={cn(
                    "w-full py-4 text-white font-black rounded-xl transition-all active:scale-95 uppercase tracking-widest text-xs",
                    gameStatus === 'won' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
                  )}
                >
                  {gameStatus === 'won' ? "Play Again" : "Try Again"}
                </button>
                <button
                  onClick={resetGameState}
                  className="w-full py-4 text-zinc-400 font-bold rounded-xl hover:bg-white/5 transition-all text-xs uppercase tracking-widest"
                >
                  Return to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
