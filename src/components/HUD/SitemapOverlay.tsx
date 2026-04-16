import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle2, Info, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SitemapOverlay = ({ 
  screen, 
  onClose,
  onAction
}: { 
  screen: { title: string, content: string, type: string, levelId?: string, nextScreenId?: string }, 
  onClose: () => void,
  onAction?: (action: string, levelId?: string, nextScreenId?: string) => void
}) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-3xl p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden"
      >
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              screen.type === 'success' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
              screen.type === 'lore' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
              "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
            )}>
              {screen.type === 'success' ? <CheckCircle2 size={28} /> :
               screen.type === 'lore' ? <BookOpen size={28} /> :
               <Info size={28} />}
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              {screen.title}
            </h2>
          </div>

          <div className="prose prose-invert max-w-none mb-10">
            <div className="text-zinc-300 text-lg leading-relaxed font-medium">
              {screen.content}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {
                if (screen.nextScreenId && onAction) {
                  onAction('next_screen', undefined, screen.nextScreenId);
                } else if (screen.levelId && onAction) {
                  onAction('load_level', screen.levelId);
                } else {
                  onClose();
                }
              }}
              className={cn(
                "flex-1 py-4 px-8 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 group",
                screen.type === 'success' ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" :
                screen.type === 'lore' ? "bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" :
                "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20_rgba(79,70,229,0.3)]"
              )}
            >
              {screen.nextScreenId ? 'Continue Journey' : screen.levelId ? 'Enter Level' : 'Close'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
