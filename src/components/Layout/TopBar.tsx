import React from 'react';
import { 
  Hammer, 
  Play, 
  Pause, 
  Layout, 
  Download, 
  Upload, 
  LogOut, 
  LogIn, 
  Compass,
  ArrowRight,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { GameMode } from '../../types';

interface TopBarProps {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  dungeonName: string;
  user: any;
  isAdmin: boolean;
  showAdminDashboard: boolean;
  setShowAdminDashboard: (show: boolean) => void;
  saveLevel: () => void;
  exportDungeon: () => void;
  importDungeon: (e: React.ChangeEvent<HTMLInputElement>) => void;
  signIn: () => void;
  signOut: () => void;
  isSaving: boolean;
  activeCampaign: any;
  currentLevelIndex: number;
}

export const TopBar = (props: TopBarProps) => {
  const {
    mode,
    setMode,
    sidebarOpen,
    setSidebarOpen,
    dungeonName,
    user,
    isAdmin,
    showAdminDashboard,
    setShowAdminDashboard,
    saveLevel,
    exportDungeon,
    importDungeon,
    signIn,
    signOut,
    isSaving,
    activeCampaign,
    currentLevelIndex
  } = props;

  return (
    <header className="h-16 bg-zinc-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <Layout size={20} />
            </button>
          )}
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter text-white uppercase flex items-center gap-2">
              <Compass className="text-indigo-500" size={16} />
              Dungeon Architect
            </h1>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {activeCampaign ? `${activeCampaign.name} • Level ${currentLevelIndex + 1}` : dungeonName || 'Untitled Dungeon'}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setMode('build')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'build' ? "bg-indigo-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Hammer size={14} />
            Build
          </button>
          <button 
            onClick={() => setMode('play')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
              mode === 'play' ? "bg-emerald-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Play size={14} />
            Play
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <button 
            onClick={() => setShowAdminDashboard(!showAdminDashboard)}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border",
              showAdminDashboard ? "bg-amber-500 border-amber-400 text-white" : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
            )}
          >
            <Settings size={14} />
            Admin
          </button>
        )}

        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-white/5">
          <button 
            onClick={saveLevel}
            disabled={isSaving}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-white disabled:opacity-50"
            title="Save Level"
          >
            <Download size={18} className={cn(isSaving && "animate-bounce")} />
          </button>
          <button 
            onClick={exportDungeon}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-white"
            title="Export JSON"
          >
            <Download size={18} className="rotate-180" />
          </button>
          <label className="p-2 hover:bg-white/5 rounded-lg transition-all text-zinc-400 hover:text-white cursor-pointer" title="Import JSON">
            <Upload size={18} />
            <input type="file" className="hidden" accept=".json" onChange={importDungeon} />
          </label>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        {user ? (
          <div className="flex items-center gap-3 bg-zinc-900/50 pl-1 pr-3 py-1 rounded-full border border-white/5">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-white leading-none">{user.displayName}</span>
              <button onClick={signOut} className="text-[8px] text-zinc-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest text-left">Sign Out</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={signIn}
            className="px-6 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <LogIn size={14} />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
