import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GripHorizontal, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Move, 
  RotateCw, 
  Trash2, 
  Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface BuildModalProps {
  modalPos: { x: number, y: number };
  setModalPos: (pos: { x: number, y: number }) => void;
  isModalCollapsed: boolean;
  setIsModalCollapsed: (collapsed: boolean) => void;
  buildTool: 'place' | 'move' | 'rotate' | 'delete';
  setBuildTool: (tool: 'place' | 'move' | 'rotate' | 'delete') => void;
  undo: () => void;
  historyLength: number;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export const BuildModal = (props: BuildModalProps) => {
  const {
    modalPos,
    setModalPos,
    isModalCollapsed,
    setIsModalCollapsed,
    buildTool,
    setBuildTool,
    undo,
    historyLength,
    showDebug,
    setShowDebug
  } = props;

  return (
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
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Build Tools</span>
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
          <div className="space-y-2">
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

          <div className="pt-2 border-t border-white/5 flex gap-2">
            <button
              onClick={undo}
              disabled={historyLength === 0}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider",
                historyLength > 0 ? "bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white" : "opacity-30 cursor-not-allowed border-transparent text-zinc-600"
              )}
            >
              <RotateCw size={12} className="-scale-x-100" />
              Undo
            </button>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className={cn(
                "px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                showDebug ? "bg-amber-500/20 border-amber-500/50 text-amber-500" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:text-zinc-300"
              )}
              title="Debug Panel"
            >
              <Settings size={12} />
              Debug
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
