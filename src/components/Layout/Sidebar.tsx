import React from 'react';
import { 
  ChevronLeft, 
  Library as LibraryIcon, 
  Layers, 
  Settings, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Layout,
  BookOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { TileType, GameMode, LevelData, TileData } from '../../types';
import { TILE_LIBRARY, TileDefinition } from '../../constants';
import { TileIcon } from '../Game/TileRenderer';

interface SidebarProps {
  mode: GameMode;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarTab: 'library' | 'level' | 'debug' | 'help';
  setSidebarTab: (tab: 'library' | 'level' | 'debug' | 'help') => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  startResizing: () => void;
  collapsedSections: Set<string>;
  setCollapsedSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedTileType: TileType;
  setSelectedTileType: (type: TileType) => void;
  setHoveredTile: (tile: TileDefinition | null) => void;
  setTooltipPos: (pos: { x: number, y: number }) => void;
  levels: LevelData[];
  currentLevelId: string | null;
  setCurrentLevelId: (id: string | null) => void;
  setActiveCampaign: (campaign: any) => void;
  loadLevel: (id: string) => void;
  clearDungeon: () => void;
  purpose: string;
  setPurpose: (p: string) => void;
  howTo: string;
  setHowTo: (h: string) => void;
  dungeonName: string;
  setDungeonName: (n: string) => void;
  powerUpDuration: number;
  setPowerUpDuration: (d: number) => void;
  darknessRadius: number;
  setDarknessRadius: (r: number) => void;
  gridSize: number;
  setGridSize: (s: number) => void;
  gridCellsX: number;
  setGridCellsX: (x: number) => void;
  gridCellsY: number;
  setGridCellsY: (y: number) => void;
  levelTimeLimit: number;
  setLevelTimeLimit: (t: number) => void;
  setTimeLeft: (t: number) => void;
  instructions: string;
  setInstructions: (i: string) => void;
  showDebug: boolean;
  setShowDebug: (s: boolean) => void;
  playerPos: { x: number, y: number };
  stagePos: { x: number, y: number };
  stageScale: number;
  containerSize: { width: number, height: number };
  tiles: TileData[];
  getTileBounds: (tile: any) => any;
  setHealth: (h: number) => void;
}

export const Sidebar = (props: SidebarProps) => {
  const {
    mode,
    sidebarOpen,
    setSidebarOpen,
    sidebarTab,
    setSidebarTab,
    sidebarWidth,
    startResizing,
    collapsedSections,
    setCollapsedSections,
    selectedTileType,
    setSelectedTileType,
    setHoveredTile,
    setTooltipPos,
    levels,
    currentLevelId,
    setCurrentLevelId,
    setActiveCampaign,
    loadLevel,
    clearDungeon,
    purpose,
    setPurpose,
    howTo,
    setHowTo,
    dungeonName,
    setDungeonName,
    powerUpDuration,
    setPowerUpDuration,
    darknessRadius,
    setDarknessRadius,
    gridSize,
    setGridSize,
    gridCellsX,
    setGridCellsX,
    gridCellsY,
    setGridCellsY,
    levelTimeLimit,
    setLevelTimeLimit,
    setTimeLeft,
    instructions,
    setInstructions,
    showDebug,
    setShowDebug,
    playerPos,
    stagePos,
    stageScale,
    containerSize,
    tiles,
    getTileBounds,
    setHealth
  } = props;

  if (!sidebarOpen) return null;

  return (
    <div 
      className={cn(
        "bg-zinc-900 border-r border-white/10 flex flex-col relative h-full",
        sidebarOpen ? "" : "w-0 overflow-hidden border-none"
      )}
      style={{ width: sidebarWidth }}
    >
      <div className="flex border-b border-white/10">
        {mode === 'build' ? (
          <>
            <button 
              onClick={() => setSidebarTab('library')}
              className={cn(
                "flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2",
                sidebarTab === 'library' ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <LibraryIcon size={14} />
              Library
            </button>
            <button 
              onClick={() => setSidebarTab('level')}
              className={cn(
                "flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2",
                sidebarTab === 'level' ? "text-amber-400 border-amber-500 bg-amber-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <Layers size={14} />
              Level
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setSidebarTab('debug')}
              className={cn(
                "flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2",
                sidebarTab === 'debug' ? "text-amber-400 border-amber-500 bg-amber-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <Settings size={14} />
              Debug Tools
            </button>
            <button 
              onClick={() => setSidebarTab('help')}
              className={cn(
                "flex-1 py-3 px-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-b-2",
                sidebarTab === 'help' ? "text-indigo-400 border-indigo-500 bg-indigo-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <HelpCircle size={14} />
              Help
            </button>
          </>
        )}
        <button onClick={() => setSidebarOpen(false)} className="px-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {sidebarTab === 'library' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Categories</h2>
              <button 
                onClick={() => {
                  const allCats = ['corridor', 'items', 'quad', 'power-up', 'monster', 'artefact', 'controls'];
                  setCollapsedSections(prev => {
                    const next = new Set(prev);
                    const isAllCollapsed = allCats.every(c => next.has(c));
                    if (isAllCollapsed) {
                      allCats.forEach(c => next.delete(c));
                    } else {
                      allCats.forEach(c => next.add(c));
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-bold text-zinc-400 hover:text-white transition-all border border-white/5"
              >
                <Layers size={10} />
                {['corridor', 'items', 'quad', 'power-up', 'monster', 'artefact', 'controls'].every(c => collapsedSections.has(c)) ? 'Expand All' : 'Collapse All'}
              </button>
            </div>

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

            {['corridor', 'items', 'quad', 'power-up', 'monster', 'artefact'].map((cat) => (
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
                  <h3 className="text-[10px] font-bold uppercase text-zinc-500 tracking-tighter group-hover:text-zinc-300 transition-colors">
                    {cat === 'items' ? 'Items' : `${cat}s`}
                  </h3>
                  {collapsedSections.has(cat) ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronUp size={10} className="text-zinc-600" />}
                </button>
                
                {!collapsedSections.has(cat) && (
                  <div className="grid grid-cols-3 gap-2">
                    {TILE_LIBRARY.filter(t => t.category === cat).map((tile) => (
                      <button
                        key={tile.type}
                        onClick={() => setSelectedTileType(tile.type)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTile(tile);
                          setTooltipPos({ x: rect.right + 12, y: rect.top });
                        }}
                        onMouseLeave={() => setHoveredTile(null)}
                        className={cn(
                          "flex flex-col items-center p-2 rounded border transition-all relative group",
                          selectedTileType === tile.type 
                            ? "bg-zinc-800 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                            : "bg-zinc-900 border-white/5 hover:border-white/20"
                        )}
                      >
                        <TileIcon type={tile.type} rotation={0} color={tile.color} />
                        <span className="text-[9px] mt-1 text-center truncate w-full">{tile.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {sidebarTab === 'level' && (
          <>
            <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Select Level</h3>
                <span className="text-[8px] text-zinc-500 font-mono">{levels.length} Levels</span>
              </div>
              <select 
                value={currentLevelId || ''}
                onChange={(e) => {
                  const levelId = e.target.value;
                  setActiveCampaign(null);
                  if (levelId) {
                    loadLevel(levelId);
                    setCurrentLevelId(levelId);
                  } else {
                    setCurrentLevelId(null);
                    clearDungeon();
                  }
                }}
                className="w-full bg-zinc-950 border border-white/10 rounded px-3 py-2 text-[10px] text-white focus:border-indigo-500 outline-none font-bold uppercase tracking-wider cursor-pointer hover:bg-zinc-900 transition-colors"
              >
                <option value="">New / Current Dungeon</option>
                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-3">
              <button 
                onClick={() => {
                  setCollapsedSections(prev => {
                    const next = new Set(prev);
                    if (next.has('narrative')) next.delete('narrative');
                    else next.add('narrative');
                    return next;
                  });
                }}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-[10px] font-bold uppercase text-amber-400 tracking-widest">Narrative</h3>
                {collapsedSections.has('narrative') ? <ChevronDown size={10} className="text-amber-600" /> : <ChevronUp size={10} className="text-amber-600" />}
              </button>
              
              {!collapsedSections.has('narrative') && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] text-amber-500/70 font-mono uppercase tracking-widest">Purpose</label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-amber-500/20 rounded px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-amber-500/50 min-h-[60px] resize-none"
                      placeholder="What is the goal?"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-amber-500/70 font-mono uppercase tracking-widest">How-to</label>
                    <textarea
                      value={howTo}
                      onChange={(e) => setHowTo(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-amber-500/20 rounded px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-amber-500/50 min-h-[60px] resize-none"
                      placeholder="How to solve?"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-3">
              <button 
                onClick={() => {
                  setCollapsedSections(prev => {
                    const next = new Set(prev);
                    if (next.has('level-settings')) next.delete('level-settings');
                    else next.add('level-settings');
                    return next;
                  });
                }}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Level Settings</h3>
                {collapsedSections.has('level-settings') ? <ChevronDown size={10} className="text-zinc-600" /> : <ChevronUp size={10} className="text-zinc-600" />}
              </button>
              
              {!collapsedSections.has('level-settings') && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Maze Title</label>
                    <input
                      type="text"
                      value={dungeonName}
                      onChange={(e) => setDungeonName(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/5 rounded px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                      placeholder="Enter name..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Vision (s)</label>
                      <input
                        type="number"
                        value={powerUpDuration}
                        onChange={(e) => setPowerUpDuration(Number(e.target.value))}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Darkness Dia</label>
                      <input
                        type="number"
                        value={darknessRadius * 2}
                        onChange={(e) => setDarknessRadius(Number(e.target.value) / 2)}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        min="1"
                        step="0.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Grid</label>
                      <input
                        type="number"
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded px-1.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        min="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Width</label>
                      <input
                        type="number"
                        value={gridCellsX}
                        onChange={(e) => setGridCellsX(Number(e.target.value))}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded px-1.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Height</label>
                      <input
                        type="number"
                        value={gridCellsY}
                        onChange={(e) => setGridCellsY(Number(e.target.value))}
                        className="w-full bg-zinc-950/50 border border-white/5 rounded px-1.5 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Time Limit (sec)</label>
                    <input
                      type="number"
                      value={levelTimeLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setLevelTimeLimit(val);
                        setTimeLeft(val);
                      }}
                      className="w-full bg-zinc-950/50 border border-white/5 rounded px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 font-mono uppercase tracking-widest">Instructions</label>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/5 rounded px-2 py-1.5 text-[10px] text-zinc-200 focus:outline-none focus:border-indigo-500/50 min-h-[60px] resize-none"
                      placeholder="Introduce the level..."
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {sidebarTab === 'debug' && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase text-amber-400 tracking-widest">Debug Inspector</h3>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className={cn(
                    "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border",
                    showDebug ? "bg-amber-500 border-amber-400 text-white" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {showDebug ? 'Active' : 'Inactive'}
                </button>
              </div>
              
              <div className="p-3 space-y-2 font-mono text-[9px] bg-black/40 rounded border border-white/5">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Player Pos</span>
                  <span className="text-amber-400">X: {playerPos.x}, Y: {playerPos.y}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Grid Size</span>
                  <span className="text-zinc-300">{gridSize}px ({gridCellsX}x{gridCellsY})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Stage Pos</span>
                  <span className="text-zinc-300">X: {Math.round(stagePos.x)}, Y: {Math.round(stagePos.y)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Stage Scale</span>
                  <span className="text-zinc-300">{stageScale.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Container</span>
                  <span className="text-zinc-300">{Math.round(containerSize.width)}x{Math.round(containerSize.height)}</span>
                </div>
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="text-zinc-500 uppercase mb-1">Current Tiles</div>
                  {tiles.filter(t => {
                    const { x: tx, y: ty, width, height } = getTileBounds(t);
                    return playerPos.x >= tx && playerPos.x < tx + width && playerPos.y >= ty && playerPos.y < ty + height;
                  }).map(t => (
                    <div key={t.id} className="flex justify-between text-indigo-400 bg-white/5 px-2 py-0.5 rounded">
                      <span>{t.type}</span>
                      <span>R: {t.rotation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/30 border border-white/5 rounded-lg p-3 space-y-2">
              <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setHealth(100)}
                  className="w-full py-2 bg-pink-500/10 border border-pink-500/20 rounded text-[9px] font-bold text-pink-400 hover:bg-pink-500/20 transition-all"
                >
                  Restore Health
                </button>
                <button 
                  onClick={() => setTimeLeft(levelTimeLimit)}
                  className="w-full py-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
                >
                  Reset Timer
                </button>
              </div>
            </div>
          </div>
        )}

        {sidebarTab === 'help' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                <HelpCircle size={12} />
                Level Purpose
              </h3>
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 text-[11px] text-zinc-300 leading-relaxed italic">
                {purpose || "No purpose defined for this level."}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase text-amber-400 tracking-widest flex items-center gap-2">
                <Layout size={12} />
                How to Solve
              </h3>
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 text-[11px] text-zinc-300 leading-relaxed">
                {howTo || "No solution hints provided."}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <Settings size={12} />
                Debugging
              </h3>
              <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-4 text-[11px] text-zinc-400 leading-relaxed space-y-2">
                <p>Use the <span className="text-amber-500 font-bold">Debug Tools</span> tab to inspect the internal state of the dungeon.</p>
                <p>The <span className="text-zinc-200">Debug Inspector</span> shows your exact coordinates and the tiles you are currently standing on.</p>
                <p>If you get stuck, you can use the quick actions to restore health or reset the timer.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] text-zinc-400 font-mono">SYSTEM READY</span>
        </div>
      </div>
      
      <div 
        onMouseDown={startResizing}
        className="absolute right-0 top-0 w-1 hover:w-1.5 bg-white/5 hover:bg-indigo-500/50 cursor-col-resize transition-all z-50 h-full"
      />
    </div>
  );
};
