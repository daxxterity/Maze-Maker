import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group, Text, Ellipse } from 'react-konva';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Play, 
  Pause,
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
  GripHorizontal,
  Moon,
  Sun,
  BookOpen,
  HelpCircle,
  Info,
  Shield,
  Compass,
  Ghost,
  Footprints,
  ArrowUp,
  Wind,
  X,
  Settings,
  Layout,
  FileJson,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  ArrowRight,
  Share2,
  Save,
  Trophy,
  Layers,
  Library as LibraryIcon
} from 'lucide-react';
import { cn } from './lib/utils';
import { TileType, TileData, GameMode, DungeonMap, TriggerData, CampaignData, LevelData, SitemapData, SitemapScreen } from './types';
import { TILE_LIBRARY, TileDefinition } from './constants';
import { db, auth, isFirebaseConfigured } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc,
  updateDoc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';

import { handleFirestoreError, OperationType } from './lib/firestoreUtils';

function sanitizeFirestoreData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(v => sanitizeFirestoreData(v));
  } else if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    // Check if it's a plain object. Firestore special objects (like FieldValue) 
    // usually don't have 'Object' as their constructor name in many environments,
    // or we can check if it's a plain object using prototype.
    const isPlainObject = Object.getPrototypeOf(data) === Object.prototype || Object.getPrototypeOf(data) === null;
    
    if (!isPlainObject) {
      return data;
    }

    const newObj: any = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        newObj[key] = sanitizeFirestoreData(data[key]);
      }
    });
    return newObj;
  }
  return data;
}

import { useUser } from './contexts/UserContext';
import { useDungeonData } from './contexts/DungeonDataContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      let isQuotaError = false;
      
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          errorMessage = parsed.error;
          const lowerError = errorMessage.toLowerCase();
          
          if (lowerError.includes('quota exceeded') || lowerError.includes('quota')) {
            isQuotaError = true;
          }
          
          if (lowerError.includes('offline')) {
            errorMessage = "Firestore is reporting as 'Offline'. This usually means your Project ID is incorrect, or the Firestore Database has not been created yet in the Firebase Console.";
          } else {
            errorMessage = `Firestore Error: ${errorMessage} (${parsed.operationType} on ${parsed.path})`;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
        if (errorMessage.toLowerCase().includes('quota exceeded') || errorMessage.toLowerCase().includes('quota')) {
          isQuotaError = true;
        }
      }

      return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-6 text-center">
          <div className={cn(
            "max-w-md w-full bg-zinc-900 border rounded-3xl p-8 shadow-2xl",
            isQuotaError ? "border-amber-500/50" : "border-red-500/50"
          )}>
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
              isQuotaError ? "bg-amber-500/20" : "bg-red-500/20"
            )}>
              {isQuotaError ? <Zap className="text-amber-500" size={32} /> : <AlertCircle className="text-red-500" size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {isQuotaError ? "Dungeon at Capacity" : "Application Error"}
            </h2>
            <p className="text-zinc-400 mb-8 font-mono text-sm break-words">
              {isQuotaError 
                ? "The daily magic quota for this dungeon has been exhausted. The spirits are resting and will return tomorrow."
                : errorMessage}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "w-full py-4 text-white font-bold rounded-xl transition-all active:scale-95",
                  isQuotaError ? "bg-amber-600 hover:bg-amber-500" : "bg-red-600 hover:bg-red-500"
                )}
              >
                Try Reconnecting
              </button>
              {isQuotaError && (
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  Quota resets daily at midnight Pacific Time
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_GRID_SIZE = 40;
const DEFAULT_GRID_CELLS_X = 200;
const DEFAULT_GRID_CELLS_Y = 200;

// --- Components ---

const getTileBounds = (tile: { x: number, y: number, size: number, width?: number, height?: number, rotation: number }) => {
  const w = tile.width || tile.size;
  const h = tile.height || tile.size;
  const r = tile.rotation;
  const tw = (r === 90 || r === 270) ? h : w;
  const th = (r === 90 || r === 270) ? w : h;
  let tx = tile.x;
  let ty = tile.y;
  if (r === 90) tx -= (h - 1);
  else if (r === 180) { tx -= (w - 1); ty -= (h - 1); }
  else if (r === 270) ty -= (w - 1);
  return { x: tx, y: ty, width: tw, height: th };
};

const getTileLocalCoords = (tile: { x: number, y: number, rotation: number }, worldX: number, worldY: number) => {
  const relX = worldX - tile.x;
  const relY = worldY - tile.y;
  const r = tile.rotation;
  if (r === 0) return { x: relX, y: relY };
  if (r === 90) return { x: relY, y: -relX };
  if (r === 180) return { x: -relX, y: -relY };
  if (r === 270) return { x: -relY, y: relX };
  return { x: relX, y: relY };
};


const MoonPhase = ({ index, color, size = 14 }: { index: number, color: string, size?: number }) => {
  const getPath = (i: number) => {
    switch (i) {
      case 0: return ""; // New
      case 1: return "M12 2C14.76 2 17.26 3.12 19.07 4.93C17.26 6.74 16.14 9.24 16.14 12C16.14 14.76 17.26 17.26 19.07 19.07C17.26 20.88 14.76 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2Z";
      case 2: return "M12 2V22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2Z";
      case 3: return "M12 2C14.76 2 17.26 3.12 19.07 4.93C20.88 6.74 22 9.24 22 12C22 14.76 20.88 17.26 19.07 19.07C17.26 20.88 14.76 22 12 22V2Z";
      case 4: return "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z";
      case 5: return "M12 2C9.24 2 6.74 3.12 4.93 4.93C3.12 6.74 2 9.24 2 12C2 14.76 3.12 17.26 4.93 19.07C6.74 20.88 9.24 22 12 22V2Z";
      case 6: return "M12 2V22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z";
      case 7: return "M12 2C9.24 2 6.74 3.12 4.93 4.93C6.74 6.74 7.86 9.24 7.86 12C7.86 14.76 6.74 17.26 4.93 19.07C6.74 20.88 9.24 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z";
      default: return "";
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1" opacity="0.2" />
      <path d={getPath(index)} fill={color} />
    </svg>
  );
};

const MoonTimer = ({ timeLeft, limit }: { timeLeft: number, limit: number }) => {
  const progress = 1 - (timeLeft / limit); // 0 at start, 1 at end
  const moonCount = 8;
  
  return (
    <div className="relative w-[120px] h-10 flex items-center justify-between px-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
      {/* Dial/Pointer */}
      <motion.div 
        className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between py-0.5 z-10 pointer-events-none"
        animate={{ left: `${progress * 100}%` }}
        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      >
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[10px] border-t-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
      </motion.div>

      {/* Moons */}
      {Array.from({ length: 8 }).map((_, i) => {
        // Color interpolation from zinc-400 to red-500
        const r = Math.floor(161 + (239 - 161) * progress);
        const g = Math.floor(161 + (68 - 161) * progress);
        const b = Math.floor(170 + (68 - 170) * progress);
        const color = `rgb(${r}, ${g}, ${b})`;

        return (
          <div key={i} className="z-0">
            <MoonPhase index={i} color={color} />
          </div>
        );
      })}
    </div>
  );
};

const TileRenderer = ({ 
  tile, 
  hasArtefact, 
  isPowerUpActive, 
  isThirdEyeActive,
  thirdEyeTimeLeft,
  powerUpTimeLeft, 
  powerUpDuration, 
  tick,
  mode,
  targetZ,
  gridSize
}: { 
  tile: TileData, 
  hasArtefact: boolean, 
  isPowerUpActive: boolean, 
  isThirdEyeActive: boolean,
  thirdEyeTimeLeft: number,
  powerUpTimeLeft: number,
  powerUpDuration: number,
  tick: number,
  mode: GameMode,
  targetZ?: number,
  gridSize: number
}) => {
  const { type, x, y, rotation, size } = tile;
  const tileDef = TILE_LIBRARY.find(t => t.type === type);
  const isItem = tileDef?.category === 'items';
  const isPowerUp = tileDef?.category === 'power-up';
  const isMonster = tileDef?.category === 'monster';
  const isCorridor = tileDef?.category === 'corridor';
  const isQuad = tileDef?.category === 'quad';
  const isArtefact = tileDef?.category === 'artefact';
  
  const { width: tileW, height: tileH } = getTileBounds(tile);
  
  const pixelX = x * gridSize;
  const pixelY = y * gridSize;
  const s = size * gridSize;
  
  const currentW = tileW * gridSize;
  const currentH = tileH * gridSize;
  const center = gridSize / 2;

  const tz = tile.z || 0;
  const isRemote = targetZ !== undefined && tz !== targetZ;

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
      case 'corridor-x2':
        return (
          <>
            <Rect width={gridSize * 2} height={gridSize} fill="#4b5563" />
            <Line points={[0, 0, gridSize * 2, 0]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[0, gridSize, gridSize * 2, gridSize]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'corridor-x5':
        return (
          <>
            <Rect width={gridSize * 5} height={gridSize} fill="#4b5563" />
            <Line points={[0, 0, gridSize * 5, 0]} stroke="#1f2937" strokeWidth={4} />
            <Line points={[0, gridSize, gridSize * 5, gridSize]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'corridor-diag':
        return (
          <>
            <Line 
              points={[0, 0, 0, s, s, s]} 
              fill="#4b5563" 
              closed={true} 
            />
            <Line points={[0, 0, s, s]} stroke="#1f2937" strokeWidth={4} />
          </>
        );
      case 'open-floor-x5':
        return <Rect width={gridSize * 5} height={gridSize * 5} fill="#6b7280" />;
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
      case 'spike-pit':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#94a3b8" />
            {[...Array(3)].map((_, i) => (
              [...Array(3)].map((_, j) => (
                <Line 
                  key={`${i}-${j}`} 
                  points={[
                    i * (drawSize/3) + (drawSize/6), j * (drawSize/3),
                    i * (drawSize/3), j * (drawSize/3) + (drawSize/3),
                    i * (drawSize/3) + (drawSize/3), j * (drawSize/3) + (drawSize/3)
                  ]} 
                  fill="#475569" 
                  closed 
                />
              ))
            ))}
          </Group>
        );
      case 'water':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#3b82f6" />;
      case 'bridge':
        return <Rect x={drawOffset} y={drawOffset} width={drawSize} height={drawSize} fill="#92400e" />;
      case 'stairs-up': {
        const label = isRemote ? "DOWN" : "UP";
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#92400e" />
            {[...Array(6)].map((_, i) => (
              <Line key={i} points={[0, i * (drawSize/6), drawSize, i * (drawSize/6)]} stroke="#451a03" strokeWidth={1} />
            ))}
            <Text 
              text={label} 
              fontSize={6} 
              fill="white" 
              x={2} 
              y={2} 
              fontStyle="bold"
              opacity={0.8}
            />
          </Group>
        );
      }
      case 'stairs-down': {
        const label = isRemote ? "UP" : "DOWN";
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#78350f" />
            {[...Array(6)].map((_, i) => (
              <Line key={i} points={[0, i * (drawSize/6), drawSize, i * (drawSize/6)]} stroke="#451a03" strokeWidth={1} />
            ))}
            <Text 
              text={label} 
              fontSize={6} 
              fill="white" 
              x={2} 
              y={2} 
              fontStyle="bold"
              opacity={0.8}
            />
          </Group>
        );
      }
      case 'hole':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#000000" />
            <Rect x={2} y={2} width={drawSize-4} height={drawSize-4} stroke="#333" strokeWidth={1} dash={[2, 2]} />
            <Text 
              text={isRemote ? "CEILING" : "HOLE"} 
              fontSize={5} 
              fill="#666" 
              x={2} 
              y={drawSize - 8} 
            />
          </Group>
        );
      case 'column':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} fill="#1f2937" />
          </Group>
        );
      case 'tree-single':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/2.5} fill="#065f46" />
          </Group>
        );
      case 'door':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#6b7280" opacity={isItem || isPowerUp ? 0.8 : 1} />
            {/* One-way door: Red (outside/no-go) and Green (inside/go) */}
            <Rect x={0} y={0} width={drawSize} height={3} fill="#ef4444" />
            <Rect x={0} y={3} width={drawSize} height={3} fill="#22c55e" />
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
      case 'artefact':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle 
              x={drawCenter} 
              y={drawCenter} 
              radius={drawSize/4} 
              fill="#fbbf24" 
              stroke="#d97706" 
              strokeWidth={2} 
              shadowBlur={5}
              shadowColor="rgba(0,0,0,0.3)"
            />
            <Circle x={drawCenter - 2} y={drawCenter - 2} radius={drawSize/12} fill="white" opacity={0.6} />
          </Group>
        );
      case 'artefact-shield':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect x={drawCenter - 8} y={drawCenter - 10} width={16} height={20} fill="#3b82f6" cornerRadius={4} />
            <Line points={[drawCenter - 8, drawCenter - 10, drawCenter, drawCenter + 10, drawCenter + 8, drawCenter - 10]} stroke="#1d4ed8" strokeWidth={2} />
          </Group>
        );
      case 'artefact-rod':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Line points={[drawCenter - 4, drawCenter + 8, drawCenter + 4, drawCenter - 8]} stroke="#10b981" strokeWidth={4} />
            <Circle x={drawCenter + 4} y={drawCenter - 8} radius={4} fill="#34d399" />
          </Group>
        );
      case 'artefact-cloak':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Ellipse x={drawCenter} y={drawCenter + 4} radiusX={10} radiusY={14} fill="#6366f1" opacity={0.6} />
            <Circle x={drawCenter} y={drawCenter - 6} radius={6} fill="#6366f1" />
          </Group>
        );
      case 'artefact-boots':
        return (
          <Group x={drawOffset} y={drawOffset}>
            {/* Left Boot */}
            <Rect x={drawCenter - 8} y={drawCenter - 4} width={6} height={10} fill="#f97316" cornerRadius={1} />
            <Rect x={drawCenter - 8} y={drawCenter + 2} width={10} height={4} fill="#f97316" cornerRadius={1} />
            {/* Right Boot */}
            <Rect x={drawCenter + 2} y={drawCenter - 4} width={6} height={10} fill="#f97316" cornerRadius={1} />
            <Rect x={drawCenter + 2} y={drawCenter + 2} width={10} height={4} fill="#f97316" cornerRadius={1} />
          </Group>
        );
      case 'artefact-jumper':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Line points={[drawCenter, drawCenter + 10, drawCenter, drawCenter - 10]} stroke="#8b5cf6" strokeWidth={3} />
            <Rect x={drawCenter - 4} y={drawCenter + 6} width={8} height={2} fill="#8b5cf6" />
            <Circle x={drawCenter} y={drawCenter - 10} radius={3} fill="#a78bfa" />
          </Group>
        );
      case 'artefact-runner':
        return (
          <Group x={drawOffset} y={drawOffset}>
            {/* Wings */}
            <Ellipse x={drawCenter - 6} y={drawCenter} radiusX={8} radiusY={4} fill="#06b6d4" rotation={-30} opacity={0.6} />
            <Ellipse x={drawCenter + 6} y={drawCenter} radiusX={8} radiusY={4} fill="#06b6d4" rotation={30} opacity={0.6} />
            <Circle x={drawCenter} y={drawCenter} radius={4} fill="#22d3ee" />
          </Group>
        );
      case 'key':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter - 4} y={drawCenter} radius={drawSize/6} stroke="#fbbf24" strokeWidth={2} />
            <Line points={[drawCenter - 1, drawCenter, drawCenter + 6, drawCenter]} stroke="#fbbf24" strokeWidth={2} />
            <Line points={[drawCenter + 3, drawCenter, drawCenter + 3, drawCenter + 3]} stroke="#fbbf24" strokeWidth={2} />
            <Line points={[drawCenter + 5, drawCenter, drawCenter + 5, drawCenter + 3]} stroke="#fbbf24" strokeWidth={2} />
          </Group>
        );
      case 'exit':
        return (
          <Group x={drawOffset} y={drawOffset}>
            {hasArtefact ? (
              <Group>
                <Circle 
                  x={drawCenter} 
                  y={drawCenter} 
                  radius={drawSize/2 - 4} 
                  fill="#7dd3fc" 
                  stroke="#0ea5e9" 
                  strokeWidth={2} 
                  opacity={0.8}
                />
                <Circle 
                  x={drawCenter} 
                  y={drawCenter} 
                  radius={drawSize/4} 
                  fill="white" 
                  opacity={0.3}
                />
              </Group>
            ) : (
              <Group opacity={0.5}>
                <Line points={[8, 8, drawSize-8, drawSize-8]} stroke="#0ea5e9" strokeWidth={3} />
                <Line points={[drawSize-8, 8, 8, drawSize-8]} stroke="#0ea5e9" strokeWidth={3} />
              </Group>
            )}
          </Group>
        );
      case 'portal':
        const isBlinkingRange = mode === 'play' && isThirdEyeActive && thirdEyeTimeLeft > 0 && thirdEyeTimeLeft <= 5;
        const isVisible = mode === 'build' || (isThirdEyeActive && thirdEyeTimeLeft > 0);
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
            <Rect x={2} y={drawSize-6} width={drawSize-4} height={4} fill="#1f2937" cornerRadius={1} />
            <Line points={[4, drawSize-6, 4, drawSize-2]} stroke="#1f2937" strokeWidth={2} />
            <Line points={[drawSize-4, drawSize-6, drawSize-4, drawSize-2]} stroke="#1f2937" strokeWidth={2} />
            <Rect x={4} y={drawSize-10} width={drawSize-8} height={4} fill="#f97316" cornerRadius={2} />
            <Line points={[drawCenter, drawSize-10, drawCenter, drawCenter]} stroke="#f97316" strokeWidth={1} dash={[1, 1]} />
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
      case 'speed':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/2} fill="#06b6d4" opacity={0.6} />
            <Line 
              points={[
                drawCenter + 2, drawCenter - 8,
                drawCenter - 4, drawCenter + 2,
                drawCenter + 1, drawCenter + 2,
                drawCenter - 2, drawCenter + 8,
                drawCenter + 4, drawCenter - 2,
                drawCenter - 1, drawCenter - 2
              ]} 
              fill="white" 
              closed 
            />
          </Group>
        );
      case 'third-eye':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} fill="#a855f7" opacity={0.3} />
            <Ellipse x={drawCenter} y={drawCenter} radiusX={drawSize/3} radiusY={drawSize/6} stroke="#a855f7" strokeWidth={2} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/8} fill="#d8b4fe" />
          </Group>
        );
      case 'clue':
        const isClueVisible = mode === 'build' || isPowerUpActive;
        return (
          <Group x={drawOffset} y={drawOffset} opacity={isClueVisible ? 1 : 0}>
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} fill="#f472b6" opacity={0.2} />
            <Text 
              text="?" 
              fontSize={14} 
              fill="#f472b6" 
              x={drawCenter - 4} 
              y={drawCenter - 7} 
              fontStyle="bold" 
            />
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
      case 'message':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#fcd34d" cornerRadius={4} />
            <Rect x={4} y={4} width={drawSize-8} height={2} fill="#92400e" opacity={0.3} />
            <Rect x={4} y={8} width={drawSize-8} height={2} fill="#92400e" opacity={0.3} />
            <Rect x={4} y={12} width={drawSize-12} height={2} fill="#92400e" opacity={0.3} />
            <Text text="MSG" fontSize={6} fill="#92400e" x={2} y={drawSize - 8} fontStyle="bold" />
          </Group>
        );
      case 'web':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Line points={[0, 0, drawSize, drawSize]} stroke="white" strokeWidth={1} opacity={0.5} />
            <Line points={[drawSize, 0, 0, drawSize]} stroke="white" strokeWidth={1} opacity={0.5} />
            <Line points={[drawCenter, 0, drawCenter, drawSize]} stroke="white" strokeWidth={1} opacity={0.5} />
            <Line points={[0, drawCenter, drawSize, drawCenter]} stroke="white" strokeWidth={1} opacity={0.5} />
            <Circle x={drawCenter} y={drawCenter} radius={drawSize/3} stroke="white" strokeWidth={1} opacity={0.3} />
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
      {(mode === 'build' || isPowerUpActive) && tile.clue && (
        <Group 
          x={center} 
          y={center - 40}
          rotation={-rotation}
        >
          <Rect 
            width={120} 
            height={30} 
            fill="rgba(0,0,0,0.8)" 
            cornerRadius={4} 
            offsetX={60}
            offsetY={15}
            stroke="#ec4899"
            strokeWidth={1}
          />
          <Text 
            text={tile.clue} 
            fontSize={10} 
            fill="white" 
            width={110}
            align="center"
            offsetX={55}
            offsetY={5}
            fontStyle="bold"
            wrap="word"
          />
        </Group>
      )}
      {isPowerUpActive && !isItem && !isPowerUp && !isMonster && !isCorridor && !isQuad && !isArtefact && (
        <Text 
          text="ᚱ" 
          fontSize={14} 
          fill="rgba(236, 72, 153, 0.6)" 
          x={center} 
          y={center} 
          offsetX={7}
          offsetY={7}
          rotation={-rotation}
          fontStyle="bold"
        />
      )}
    </Group>
  );
};

const TileIcon = ({ type, rotation, color }: { type: TileType, rotation: number, color: string }) => {
  let previewType = type;
  // Map multi-tile versions to single-tile versions for the library
  if (type === 'corridor-x2' || type === 'corridor-x5') previewType = 'corridor';
  if (type === 'open-floor-x5') previewType = 'open-floor';
  
  const mockTile: TileData = {
    id: 'preview',
    type: previewType,
    x: 0,
    y: 0,
    rotation: 0,
    size: 1,
    width: 1,
    height: 1
  };

  return (
    <div 
      className="w-10 h-10 flex items-center justify-center border border-white/10 rounded bg-zinc-800 overflow-hidden pointer-events-none"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <Stage width={40} height={40}>
        <Layer>
          <TileRenderer 
            tile={mockTile}
            hasArtefact={true}
            isPowerUpActive={true}
            isThirdEyeActive={true}
            thirdEyeTimeLeft={10}
            powerUpTimeLeft={10}
            powerUpDuration={10}
            tick={0}
            mode="build"
            gridSize={40}
          />
        </Layer>
      </Stage>
    </div>
  );
};

const AdminDashboard = ({ 
  onClose, 
  levels, 
  sitemaps, 
  campaigns,
  isSaving,
  onSaveCampaign,
  onUploadLevel,
  onUploadSitemap,
  onDeleteCampaign,
  onDeleteLevel,
  onDeleteSitemap,
  onUpdateSitemap,
  onExport,
  onImport,
  onLoadLevel,
  onPlayCampaign,
  userLevels
}: { 
  onClose: () => void,
  levels: LevelData[],
  userLevels: LevelData[],
  sitemaps: SitemapData[],
  campaigns: CampaignData[],
  isSaving: boolean,
  onSaveCampaign: (campaign: Partial<CampaignData>) => Promise<void>,
  onUploadLevel: (file: File) => Promise<void>,
  onUploadSitemap: (file: File) => Promise<void>,
  onDeleteCampaign: (id: string) => Promise<void>,
  onDeleteLevel: (id: string) => Promise<void>,
  onDeleteSitemap: (id: string) => Promise<void>,
  onUpdateSitemap: (sitemap: SitemapData) => Promise<void>,
  onExport: () => void,
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onLoadLevel: (level: LevelData) => void,
  onPlayCampaign: (campaign: CampaignData) => void
}) => {
  const [tab, setTab] = useState<'campaigns' | 'levels' | 'sitemaps' | 'import-export'>('campaigns');
  const [editingCampaign, setEditingCampaign] = useState<Partial<CampaignData> | null>(null);
  const [viewingSitemapId, setViewingSitemapId] = useState<string | null>(null);

  const viewingSitemap = sitemaps.find(s => s.id === viewingSitemapId);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl h-full max-h-[800px] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Settings className="text-amber-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Campaign Manager</h2>
              <p className="text-xs text-zinc-500">Manage levels, sitemaps, and game flow</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-zinc-950/30">
          <button 
            onClick={() => setTab('campaigns')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'campaigns' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Campaigns
          </button>
          <button 
            onClick={() => setTab('levels')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'levels' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Levels ({userLevels.length} Mine / {levels.length} Global)
          </button>
          <button 
            onClick={() => setTab('sitemaps')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'sitemaps' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Sitemaps ({sitemaps.length})
          </button>
          <button 
            onClick={() => setTab('import-export')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'import-export' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Import / Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {tab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Active Campaigns</h3>
                <button 
                  onClick={() => setEditingCampaign({ name: 'New Campaign', levelIds: [], sitemapId: '' })}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Plus size={16} />
                  Create Campaign
                </button>
              </div>

              {editingCampaign && (
                <div className="bg-zinc-800/50 border border-amber-500/30 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Campaign Name</label>
                      <input 
                        type="text" 
                        value={editingCampaign.name}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Sitemap UI</label>
                      <select 
                        value={editingCampaign.sitemapId}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, sitemapId: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
                      >
                        <option value="">Select a Sitemap</option>
                        {sitemaps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Select Levels for Campaign</label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {[...userLevels, ...levels.filter(l => !userLevels.find(ul => ul.id === l.id))].map(level => {
                        const isSelected = editingCampaign.levelIds?.includes(level.id);
                        return (
                          <button 
                            key={level.id}
                            onClick={() => {
                              const currentIds = editingCampaign.levelIds || [];
                              const newIds = isSelected 
                                ? currentIds.filter(id => id !== level.id)
                                : [...currentIds, level.id];
                              setEditingCampaign({ ...editingCampaign, levelIds: newIds });
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                              isSelected ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-amber-500 border-amber-500" : "border-white/20")}>
                                {isSelected && <CheckCircle2 size={10} className="text-zinc-900" />}
                              </div>
                              <span className="text-xs font-medium">{level.name}</span>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold">Pos: {editingCampaign.levelIds?.indexOf(level.id)! + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button 
                      onClick={() => onSaveCampaign(editingCampaign).then(() => setEditingCampaign(null))}
                      disabled={isSaving}
                      className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Campaign'}
                    </button>
                    <button 
                      onClick={() => setEditingCampaign(null)}
                      className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-6 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Layout size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">{campaign.name}</h4>
                        <p className="text-xs text-zinc-500">{campaign.levelIds.length} Levels • {sitemaps.find(s => s.id === campaign.sitemapId)?.name || 'No Sitemap'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => onPlayCampaign(campaign)}
                        className="p-2 hover:bg-emerald-500/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
                        title="Play Campaign"
                      >
                        <Play size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingCampaign(campaign)}
                        className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      >
                        <Settings size={18} />
                      </button>
                      <button 
                        onClick={() => onDeleteCampaign(campaign.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 && !editingCampaign && (
                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                    <div className="text-zinc-600 mb-2 italic">No campaigns found</div>
                    <button onClick={() => setEditingCampaign({ name: 'New Campaign', levelIds: [], sitemapId: '' })} className="text-amber-500 text-xs font-bold hover:underline">Create your first campaign</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'levels' && (
            <div className="space-y-8">
              {/* My Levels */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <h3 className="text-lg font-bold text-white tracking-tight">My Dungeons</h3>
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
                    <Upload size={16} />
                    Upload Level JSON
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".json"
                      onChange={(e) => e.target.files?.[0] && onUploadLevel(e.target.files[0])}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {userLevels.map(level => (
                    <div key={level.id} className="bg-zinc-950/50 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <FileJson size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{level.name}</div>
                          <div className="text-[10px] text-zinc-500">{level.data.tiles.length} Tiles • Private</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onLoadLevel(level)}
                          className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5"
                          title="Load into Canvas"
                        >
                          <Play size={16} />
                          <span className="text-[10px] font-bold uppercase">Load</span>
                        </button>
                        <button 
                          onClick={() => {
                            const url = `${window.location.origin}?embed=true&levelId=${level.id}`;
                            navigator.clipboard.writeText(`<iframe src="${url}" width="1000" height="800" frameborder="0"></iframe>`);
                            alert("Embed code copied to clipboard!");
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Copy Embed Code"
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteLevel(level.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {userLevels.length === 0 && (
                    <div className="col-span-2 py-8 text-center border border-dashed border-white/5 rounded-xl text-zinc-600 text-xs italic">
                      You haven't created any dungeons yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Global Levels */}
              <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Global Library (Recent)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {levels.filter(l => !userLevels.find(ul => ul.id === l.id)).map(level => (
                    <div key={level.id} className="bg-zinc-950/20 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                          <Ghost size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-400">{level.name}</div>
                          <div className="text-[10px] text-zinc-600">{level.data.tiles.length} Tiles</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => onLoadLevel(level)}
                          className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5"
                          title="Load into Canvas"
                        >
                          <Play size={16} />
                          <span className="text-[10px] font-bold uppercase">Load</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'sitemaps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Sitemap Overlays</h3>
                <div className="flex gap-2">
                  {!viewingSitemapId && (
                    <button 
                      onClick={async () => {
                        const newDocRef = doc(collection(db, 'sitemaps'));
                        const newSitemap: SitemapData = {
                          id: newDocRef.id,
                          name: 'New Sitemap',
                          screens: [
                            { id: crypto.randomUUID(), title: 'Welcome', content: 'Welcome to the dungeon!', type: 'lore' }
                          ],
                          createdAt: new Date().toISOString()
                        };
                        await setDoc(newDocRef, newSitemap);
                        setViewingSitemapId(newDocRef.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      <Plus size={16} />
                      Create Sitemap
                    </button>
                  )}
                  {viewingSitemapId && (
                    <button 
                      onClick={() => setViewingSitemapId(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      <ChevronLeft size={16} />
                      Back to List
                    </button>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
                    <Upload size={16} />
                    Upload Sitemap JSON
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".json"
                      onChange={(e) => e.target.files?.[0] && onUploadSitemap(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {viewingSitemap ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="bg-zinc-800/50 border border-cyan-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="space-y-1 flex-1 mr-4">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Sitemap Name</label>
                        <input 
                          type="text" 
                          value={viewingSitemap.name}
                          onChange={(e) => onUpdateSitemap({ ...viewingSitemap, name: e.target.value })}
                          className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newScreen: SitemapScreen = {
                            id: crypto.randomUUID(),
                            title: 'New Screen',
                            content: 'Enter content here...',
                            type: 'lore'
                          };
                          onUpdateSitemap({ ...viewingSitemap, screens: [...viewingSitemap.screens, newScreen] });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        <Plus size={14} />
                        Add Screen
                      </button>
                    </div>

                    <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                      <BookOpen size={18} className="text-cyan-400" />
                      Editing Screens
                    </h4>
                    <div className="space-y-6">
                      {viewingSitemap.screens.map((screen, idx) => (
                        <div key={screen.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-6 space-y-4 relative group/screen">
                          <button 
                            onClick={() => {
                              const newScreens = viewingSitemap.screens.filter(s => s.id !== screen.id);
                              onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                            }}
                            className="absolute top-4 right-4 p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover/screen:opacity-100 transition-all"
                            title="Remove Screen"
                          >
                            <Trash2 size={14} />
                          </button>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase">Screen Title</label>
                              <input 
                                type="text" 
                                value={screen.title}
                                onChange={(e) => {
                                  const newScreens = [...viewingSitemap.screens];
                                  newScreens[idx] = { ...screen, title: e.target.value };
                                  onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase">Screen Type</label>
                              <select 
                                value={screen.type}
                                onChange={(e) => {
                                  const newScreens = [...viewingSitemap.screens];
                                  newScreens[idx] = { ...screen, type: e.target.value as any };
                                  onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                              >
                                <option value="lore">Lore / Story</option>
                                <option value="success">Success / Victory</option>
                                <option value="gameover">Game Over</option>
                                <option value="modal">Modal Info</option>
                                <option value="overlay">Overlay Info</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Content (Markdown supported)</label>
                            <textarea 
                              value={screen.content}
                              onChange={(e) => {
                                const newScreens = [...viewingSitemap.screens];
                                newScreens[idx] = { ...screen, content: e.target.value };
                                onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                              }}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none min-h-[100px] resize-none"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase">Associated Level (Optional)</label>
                              <select 
                                value={screen.levelId || ''}
                                onChange={(e) => {
                                  const newScreens = [...viewingSitemap.screens];
                                  newScreens[idx] = { ...screen, levelId: e.target.value || undefined };
                                  onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                              >
                                <option value="">No Level</option>
                                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-500 uppercase">Next Screen (Optional)</label>
                              <select 
                                value={screen.nextScreenId || ''}
                                onChange={(e) => {
                                  const newScreens = [...viewingSitemap.screens];
                                  newScreens[idx] = { ...screen, nextScreenId: e.target.value || undefined };
                                  onUpdateSitemap({ ...viewingSitemap, screens: newScreens });
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                              >
                                <option value="">No Next Screen</option>
                                {viewingSitemap.screens.filter(s => s.id !== screen.id).map(s => (
                                  <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {sitemaps.map(sm => (
                    <div key={sm.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{sm.name}</div>
                          <div className="text-[10px] text-zinc-500">{sm.screens.length} Screens</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setViewingSitemapId(sm.id)}
                          className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteSitemap(sm.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'import-export' && (
            <div className="space-y-8 max-w-2xl mx-auto py-12">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">Data Management</h3>
                <p className="text-zinc-500 text-sm">Backup or restore your dungeon data locally</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-8 space-y-6 flex flex-col items-center text-center group hover:border-amber-500/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Download size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">Export Data</h4>
                    <p className="text-xs text-zinc-500">Download your current dungeon as a JSON file for backup or sharing.</p>
                  </div>
                  <button 
                    onClick={onExport}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
                  >
                    Download JSON
                  </button>
                </div>

                <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-8 space-y-6 flex flex-col items-center text-center group hover:border-indigo-500/30 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">Import Data</h4>
                    <p className="text-xs text-zinc-500">Restore a dungeon from a previously exported JSON file.</p>
                  </div>
                  <label className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer text-center">
                    Import JSON
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".json"
                      onChange={onImport}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start">
                <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-500/80 leading-relaxed">
                  Note: Importing a file will overwrite your current unsaved changes. Make sure to export your work if you want to keep it. This only affects the local canvas, not the saved levels in the database.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const SitemapOverlay = ({ 
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
              className="flex-1 py-4 bg-white text-black font-black rounded-xl transition-all active:scale-95 hover:bg-zinc-200 uppercase tracking-widest"
            >
              {screen.nextScreenId ? 'Continue Story' : screen.levelId ? 'Play Level' : 'Continue'}
            </button>
            {screen.type === 'success' && onAction && (
              <button
                onClick={() => onAction('next_level', screen.levelId, screen.nextScreenId)}
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl transition-all active:scale-95 hover:bg-indigo-500 uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                Next Level <ArrowRight size={20} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ARTEFACTS = [
  { id: 'artefact-shield', label: 'Shield', icon: <Shield size={20} />, desc: 'Unkillable' },
  { id: 'artefact-rod', label: 'Rod', icon: <Compass size={20} />, desc: 'Exit Pointer' },
  { id: 'artefact-cloak', label: 'Cloak', icon: <Ghost size={20} />, desc: 'Invisible' },
  { id: 'artefact-boots', label: 'Boots', icon: <Footprints size={20} />, desc: 'Liquid Walk' },
  { id: 'artefact-jumper', label: 'Jumper', icon: <ArrowUp size={20} />, desc: 'Jump x2' },
  { id: 'artefact-runner', label: 'Runner', icon: <Wind size={20} />, desc: 'Speed x2' }
];

export default function App() {
  const [gridSize, setGridSize] = useState(DEFAULT_GRID_SIZE);
  const [gridCellsX, setGridCellsX] = useState(DEFAULT_GRID_CELLS_X);
  const [gridCellsY, setGridCellsY] = useState(DEFAULT_GRID_CELLS_Y);
  const canvasWidth = gridCellsX * gridSize;
  const canvasHeight = gridCellsY * gridSize;

  const [mode, setMode] = useState<GameMode>('build');
  const [tiles, setTiles] = useState<TileData[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [selectedTileType, setSelectedTileType] = useState<TileType>('corridor');
  const [currentRotation, setCurrentRotation] = useState(0);
  const [currentZ, setCurrentZ] = useState(0);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 0 });
  const [playerAction, setPlayerAction] = useState<'normal' | 'jump' | 'slide'>('normal');
  const [isRunning, setIsRunning] = useState(false);
  const [lastDirection, setLastDirection] = useState({ dx: 1, dy: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'library' | 'level'>('library');
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [dungeonName, setDungeonName] = useState("My Dungeon");
  const [buildTool, setBuildTool] = useState<'place' | 'move' | 'rotate' | 'delete'>('place');
  const [movingTileId, setMovingTileId] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [hasArtefact, setHasArtefact] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  const [hasRod, setHasRod] = useState(false);
  const [hasCloak, setHasCloak] = useState(false);
  const [hasBoots, setHasBoots] = useState(false);
  const [hasJumper, setHasJumper] = useState(false);
  const [hasRunner, setHasRunner] = useState(false);
  const [selectedArtefact, setSelectedArtefact] = useState<TileType | null>(null);
  const [isArtefactActive, setIsArtefactActive] = useState(false);
  const [artefactTimeLeft, setArtefactTimeLeft] = useState(0);
  const [artefactReloadTime, setArtefactReloadTime] = useState(0);
  const [isArtefactReloading, setIsArtefactReloading] = useState(false);
  const [showArtefactMenu, setShowArtefactMenu] = useState(false);
  const [hiddenTileIds, setHiddenTileIds] = useState<Set<string>>(new Set());
  const [powerUpDuration, setPowerUpDuration] = useState(15);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0);
  const [isPowerUpActive, setIsPowerUpActive] = useState(false);
  const [isThirdEyeActive, setIsThirdEyeActive] = useState(false);
  const [thirdEyeTimeLeft, setThirdEyeTimeLeft] = useState(0);
  const [health, setHealth] = useState(100);
  const [speedBoostTime, setSpeedBoostTime] = useState(0);
  const [jumpBoostTime, setJumpBoostTime] = useState(0);
  const [lightTime, setLightTime] = useState(0);
  const [slowMonstersTime, setSlowMonstersTime] = useState(0);
  const [webSlowTime, setWebSlowTime] = useState(0);
  const [webPressCount, setWebPressCount] = useState(0);
  const [trappedTime, setTrappedTime] = useState(0);
  const [deathCount, setDeathCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDying, setIsDying] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isModalCollapsed, setIsModalCollapsed] = useState(false);
  const [modalPos, setModalPos] = useState({ x: 24, y: 24 });
  const [tick, setTick] = useState(0);
  const [textEditModal, setTextEditModal] = useState<{
    isOpen: boolean;
    tileId: string | null;
    text: string;
    type: 'message' | 'clue';
    mode: 'edit' | 'view';
  }>({ isOpen: false, tileId: null, text: '', type: 'message', mode: 'view' });
  const [showLevelMgmtModal, setShowLevelMgmtModal] = useState(false);

  const tilesRef = useRef<TileData[]>([]);
  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  const { user, isAdminUser, isLoading: isAuthLoading } = useUser();
  const { 
    campaigns, 
    levels, 
    userLevels,
    sitemaps, 
    setCampaigns, 
    setLevels, 
    setSitemaps, 
    isLoading: isDataLoading 
  } = useDungeonData();

  // --- Campaign & Admin State ---
  const [activeCampaign, setActiveCampaign] = useState<CampaignData | null>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [sitemap, setSitemap] = useState<SitemapData | null>(null);
  const [activeSitemapScreen, setActiveSitemapScreen] = useState<SitemapScreen | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adminTab, setAdminTab] = useState<'campaigns' | 'levels' | 'sitemaps'>('campaigns');
  const [playTime, setPlayTime] = useState(0);
  const [monsters, setMonsters] = useState<{ 
    id: string, 
    type: TileType, 
    x: number, 
    y: number,
    z: number,
    immobilizedUntil?: number,
    distractedUntil?: number,
    nextDistractionAt?: number,
    distractionDir?: { dx: number, dy: number }
  }[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [pendingClueText, setPendingClueText] = useState("Watch out!");
  const [isDarknessOn, setIsDarknessOn] = useState(false);
  const [darknessRadius, setDarknessRadius] = useState(4);
  const [hoveredTile, setHoveredTile] = useState<TileDefinition | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showArtefactModal, setShowArtefactModal] = useState(false);
  const [collectedArtefactType, setCollectedArtefactType] = useState<TileType | null>(null);
  const [purpose, setPurpose] = useState("");
  const [howTo, setHowTo] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isInitialArtefactSelection, setIsInitialArtefactSelection] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLevelName, setSaveLevelName] = useState('');
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing, isResizing]);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };
  const [showArtefactConfirmation, setShowArtefactConfirmation] = useState(false);
  const [levelTimeLimit, setLevelTimeLimit] = useState(120);
  const [timeLeft, setTimeLeft] = useState(120);
  const [history, setHistory] = useState<{tiles: TileData[], triggers: TriggerData[]}[]>([]);
  
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Firebase Auth ---
  // Handled by UserContext

  // --- Load Campaigns, Levels, Sitemaps ---
  // Handled by DungeonDataContext

  const handleLogin = async () => {
    if (!isFirebaseConfigured) {
      alert("Firebase is not configured. Please set the VITE_FIREBASE_API_KEY and other variables in your environment.");
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // --- Campaign Logic ---
  const handleSaveCampaign = async (campaign: Partial<CampaignData>) => {
    setIsSaving(true);
    try {
      if (campaign.id) {
        await updateDoc(doc(db, 'campaigns', campaign.id), sanitizeFirestoreData({
          ...campaign,
          updatedAt: serverTimestamp()
        }));
      } else {
        const newDocRef = doc(collection(db, 'campaigns'));
        await setDoc(newDocRef, sanitizeFirestoreData({
          ...campaign,
          id: newDocRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }
    } catch (error) {
      handleFirestoreError(error, campaign.id ? OperationType.UPDATE : OperationType.CREATE, `campaigns/${campaign.id || 'new'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadLevel = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const newDocRef = doc(collection(db, 'levels'));
        await setDoc(newDocRef, sanitizeFirestoreData({
          id: newDocRef.id,
          name: file.name.replace('.json', ''),
          data: data,
          createdAt: serverTimestamp()
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'levels');
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSitemap = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const screens = Array.isArray(data) ? data : (data.screens || []);
        const newDocRef = doc(collection(db, 'sitemaps'));
        await setDoc(newDocRef, sanitizeFirestoreData({
          id: newDocRef.id,
          name: file.name.replace('.json', ''),
          screens: screens,
          createdAt: serverTimestamp()
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'sitemaps');
      }
    };
    reader.readAsText(file);
  };

  const sitemapUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleUpdateSitemap = async (sitemap: SitemapData) => {
    // Optimistically update local state to keep UI responsive
    setSitemaps(prev => prev.map(s => s.id === sitemap.id ? sitemap : s));
    
    // Debounce the Firestore update
    if (sitemapUpdateTimeoutRef.current) {
      clearTimeout(sitemapUpdateTimeoutRef.current);
    }
    
    sitemapUpdateTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateDoc(doc(db, 'sitemaps', sitemap.id), sanitizeFirestoreData({
          ...sitemap,
          updatedAt: serverTimestamp()
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `sitemaps/${sitemap.id}`);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `campaigns/${id}`);
    }
  };

  const handleDeleteLevel = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'levels', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `levels/${id}`);
    }
  };

  const handleDeleteSitemap = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sitemaps', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sitemaps/${id}`);
    }
  };

  const resetGameState = useCallback((tilesOverride?: TileData[]) => {
    setIsGameOver(false);
    setIsWin(false);
    setHasArtefact(false);
    setHasShield(false);
    setHasRod(false);
    setHasCloak(false);
    setHasBoots(false);
    setHasJumper(false);
    setHasRunner(false);
    setSelectedArtefact(null);
    setIsArtefactActive(false);
    setArtefactTimeLeft(0);
    setArtefactReloadTime(0);
    setIsArtefactReloading(false);
    setShowArtefactMenu(false);
    setHiddenTileIds(new Set());
    setCollectedArtefactType(null);
    setIsPowerUpActive(false);
    setPowerUpTimeLeft(0);
    setHealth(100);
    setSpeedBoostTime(0);
    setJumpBoostTime(0);
    setLightTime(0);
    setSlowMonstersTime(0);
    setWebSlowTime(0);
    setWebPressCount(0);
    setIsThirdEyeActive(false);
    setThirdEyeTimeLeft(0);
    setIsFlashing(false);
    setIsPaused(false);
    setPlayTime(0);
    setMonsters([]);
    setTimeLeft(levelTimeLimit);
    setCurrentZ(0);
    
    const currentTiles = tilesOverride || tilesRef.current;
    const entrance = currentTiles.find(t => t.type === 'entrance');
    if (entrance) {
      setPlayerPos({ x: entrance.x, y: entrance.y, z: entrance.z || 0 });
    } else {
      setPlayerPos({ x: 0, y: 0, z: 0 });
    }

    // Spawn Teeth immediately
    const teethTiles = currentTiles.filter(t => t.type === 'teeth');
    if (teethTiles.length > 0) {
      setMonsters(teethTiles.map(m => ({ 
        ...m, 
        x: m.x, 
        y: m.y,
        z: m.z || 0,
        id: m.id
      })));
    }
  }, [levelTimeLimit]);

  const loadLevel = useCallback((levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (level) {
      setTiles(level.data.tiles);
      setTriggers(level.data.triggers);
      setDungeonName(level.data.name);
      setPurpose(level.data.purpose || "");
      setHowTo(level.data.howTo || "");
      setInstructions(level.data.instructions || "");
      setLevelTimeLimit(level.data.levelTimeLimit || 60);
      setPowerUpDuration(level.data.powerUpDuration || 15);
      resetGameState(level.data.tiles);
    }
  }, [levels, resetGameState]);

  // URL Parameter Handling for Embeds
  const embedProcessed = useRef(false);
  useEffect(() => {
    if (embedProcessed.current) return;
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === 'true') {
      embedProcessed.current = true;
      setMode('play');
      setSidebarOpen(false);
      const lvlId = params.get('levelId');
      if (lvlId) {
        // Wait for levels to load then set active
        const checkLevels = setInterval(() => {
          if (levels.length > 0) {
            const level = levels.find(l => l.id === lvlId);
            if (level) {
              loadLevel(lvlId);
              clearInterval(checkLevels);
            }
          }
        }, 500);
        setTimeout(() => clearInterval(checkLevels), 10000);
      }
    }
  }, [levels, loadLevel]);

  useEffect(() => {
    if (activeCampaign && activeCampaign.levelIds.length > 0) {
      const nextLevelId = activeCampaign.levelIds[currentLevelIndex];
      if (nextLevelId !== currentLevelId) {
        loadLevel(nextLevelId);
      }
    }
  }, [activeCampaign, currentLevelIndex, loadLevel, currentLevelId]);

  useEffect(() => {
    if (activeCampaign && activeCampaign.sitemapId) {
      const sm = sitemaps.find(s => s.id === activeCampaign.sitemapId);
      setSitemap(sm || null);
    }
  }, [activeCampaign, sitemaps]);

  // --- Campaign & Admin State ---

  const isWallBlocked = useCallback((tile: TileData, dir: string, px: number, py: number, isEntry: boolean = false) => {
    const r = tile.rotation;
    const { x: relX, y: relY } = getTileLocalCoords(tile, px, py);

    if (tile.size === 2) {
      switch (tile.type) {
        case 'rotating-wall-l':
          if (r === 0) {
            if (relY === 0 && relX === 0 && dir === 'right') return true;
            if (relY === 0 && relX === 1 && dir === 'left') return true;
            if (relX === 1 && relY === 0 && dir === 'down') return true;
            if (relX === 1 && relY === 1 && dir === 'up') return true;
          } else if (r === 90) {
            if (relX === 1 && relY === 0 && dir === 'down') return true;
            if (relX === 1 && relY === 1 && dir === 'up') return true;
            if (relY === 1 && relX === 1 && dir === 'left') return true;
            if (relY === 1 && relX === 0 && dir === 'right') return true;
          } else if (r === 180) {
            if (relY === 1 && relX === 1 && dir === 'left') return true;
            if (relY === 1 && relX === 0 && dir === 'right') return true;
            if (relX === 0 && relY === 1 && dir === 'up') return true;
            if (relX === 0 && relY === 0 && dir === 'down') return true;
          } else if (r === 270) {
            if (relX === 0 && relY === 1 && dir === 'up') return true;
            if (relX === 0 && relY === 0 && dir === 'down') return true;
            if (relY === 0 && relX === 0 && dir === 'right') return true;
            if (relY === 0 && relX === 1 && dir === 'left') return true;
          }
          break;
        case 'rotating-wall-i':
          if (r === 0 || r === 180) {
            if (relX === 0 && dir === 'right') return true;
            if (relX === 1 && dir === 'left') return true;
          } else {
            if (relY === 0 && dir === 'down') return true;
            if (relY === 1 && dir === 'up') return true;
          }
          break;
        case 'rotating-wall-plus':
          if (relX === 0 && dir === 'right') return true;
          if (relX === 1 && dir === 'left') return true;
          if (relY === 0 && dir === 'down') return true;
          if (relY === 1 && dir === 'up') return true;
          break;
      }
    } else {
      switch (tile.type) {
        case 'corridor':
        case 'corridor-x2':
        case 'corridor-x5': {
          const isHorizontal = r === 0 || r === 180;
          const isVertical = r === 90 || r === 270;
          if (isHorizontal) return dir === 'up' || dir === 'down';
          if (isVertical) return dir === 'left' || dir === 'right';
          return false;
        }
        case 'corner':
          if (r === 0) return dir === 'up' || dir === 'left';
          if (r === 90) return dir === 'up' || dir === 'right';
          if (r === 180) return dir === 'down' || dir === 'right';
          if (r === 270) return dir === 'down' || dir === 'left';
          return false;
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
        case 'rotating-wall':
          if (r === 0 || r === 180) return dir === 'left' || dir === 'right';
          return dir === 'up' || dir === 'down';
        case 'door':
          // One-way door: Red (outside) blocks entry, Green (inside) allows exit.
          // r=0: door at top. Entry from top (dir='up') is blocked.
          if (r === 0) return isEntry && dir === 'up';
          if (r === 90) return isEntry && dir === 'right';
          if (r === 180) return isEntry && dir === 'down';
          if (r === 270) return isEntry && dir === 'left';
          break;
      }
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
    if (mode === 'play' && !isPaused) {
      interval = setInterval(() => {
        if (isPowerUpActive && powerUpTimeLeft > 0) {
          setPowerUpTimeLeft(prev => Math.max(0, prev - 0.1));
          if (powerUpTimeLeft <= 0.1) setIsPowerUpActive(false);
        }
        if (speedBoostTime > 0) setSpeedBoostTime(prev => Math.max(0, prev - 0.1));
        if (jumpBoostTime > 0) setJumpBoostTime(prev => Math.max(0, prev - 0.1));
        if (lightTime > 0) setLightTime(prev => Math.max(0, prev - 0.1));
        if (slowMonstersTime > 0) setSlowMonstersTime(prev => Math.max(0, prev - 0.1));
        if (webSlowTime > 0) {
          setWebSlowTime(prev => {
            const next = Math.max(0, prev - 0.1);
            if (next === 0) setWebPressCount(0);
            return next;
          });
        }
        if (thirdEyeTimeLeft > 0) setThirdEyeTimeLeft(prev => Math.max(0, prev - 0.1));
        if (thirdEyeTimeLeft <= 0.1 && isThirdEyeActive) {
          setIsThirdEyeActive(false);
          // Portals disappear permanently after activation expires
          setTiles(prev => prev.filter(t => t.type !== 'portal'));
        }

        // Artefact Timer Logic
        if (isArtefactActive) {
          setArtefactTimeLeft(prev => {
            const next = Math.max(0, prev - 0.1);
            if (next === 0) {
              setIsArtefactActive(false);
              setIsArtefactReloading(true);
              setArtefactReloadTime(0);
            }
            return next;
          });
        }

        if (isArtefactReloading) {
          setArtefactReloadTime(prev => {
            const next = Math.min(15, prev + 0.1);
            if (next === 15) {
              setIsArtefactReloading(false);
            }
            return next;
          });
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPowerUpActive, powerUpTimeLeft, speedBoostTime, jumpBoostTime, lightTime, slowMonstersTime, mode, thirdEyeTimeLeft, isThirdEyeActive, webSlowTime, isArtefactActive, isArtefactReloading]);

  // Trapped check
  useEffect(() => {
    let interval: any;
    if (mode === 'play' && !isGameOver && !isWin && !isDying && !isPaused) {
      interval = setInterval(() => {
        const directions = [
          { dx: 0, dy: -1, name: 'up', opp: 'down' },
          { dx: 0, dy: 1, name: 'down', opp: 'up' },
          { dx: -1, dy: 0, name: 'left', opp: 'right' },
          { dx: 1, dy: 0, name: 'right', opp: 'left' }
        ];

        let canMove = false;
        let hasInactivePortal = false;

        for (const dir of directions) {
          const nx = playerPos.x + dir.dx;
          const ny = playerPos.y + dir.dy;

          if (nx < 0 || nx >= canvasWidth / gridSize || ny < 0 || ny >= canvasHeight / gridSize) continue;

          const currentTiles = tiles.filter(t => {
            if (t.size === 1) return t.x === playerPos.x && t.y === playerPos.y;
            return playerPos.x >= t.x && playerPos.x < t.x + 2 && playerPos.y >= t.y && playerPos.y < t.y + 2;
          });
          const nextTiles = tiles.filter(t => {
            if (t.size === 1) return t.x === nx && t.y === ny;
            return nx >= t.x && nx < t.x + 2 && ny >= t.y && ny < t.y + 2;
          });

          const blockedByWall = currentTiles.some(t => isWallBlocked(t, dir.name, playerPos.x, playerPos.y, false)) || nextTiles.some(t => isWallBlocked(t, dir.opp, nx, ny, true));
          const blockedByObstacle = nextTiles.some(t => t.type === 'column' || t.type === 'tree' || (t.type === 'obstacle-half-h' && playerAction !== 'jump') || (t.type === 'obstacle-above' && playerAction !== 'slide'));
          
          if (nextTiles.some(t => t.type === 'portal')) {
            if (isThirdEyeActive) {
              canMove = true;
            } else {
              hasInactivePortal = true;
            }
          } else if (!blockedByWall && !blockedByObstacle) {
            canMove = true;
          }
        }

        if (!canMove && hasInactivePortal) {
          setTrappedTime(prev => {
            if (prev >= 9) {
              setIsGameOver(true);
              setDeathCount(d => d + 1);
              return 0;
            }
            return prev + 1;
          });
        } else {
          setTrappedTime(0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, playerPos, tiles, isThirdEyeActive, isGameOver, isWin, isDying, playerAction, isWallBlocked]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (mode === 'play' && !isGameOver && !isWin && !isDying && !isInitialArtefactSelection && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, isGameOver, isWin, isDying, isInitialArtefactSelection, isPaused]);

  // Monster logic
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
      }, 500);
    }
    return () => clearInterval(interval);
  }, [mode, isGameOver, isWin, isDying, playTime, monsters.length, tiles, playerPos, hasShield, selectedArtefact, isArtefactActive, playerAction, hasCloak, isPaused]);

  // Screen Paging (Zelda Style)
  useEffect(() => {
    if (mode !== 'play' || isGameOver || isWin || isDying || containerSize.width === 0 || containerSize.height === 0) return;

    // Calculate current page based on player position
    // Stage coordinates of player:
    const px = playerPos.x * gridSize;
    const py = playerPos.y * gridSize;

    // Page size in stage coordinates (unscaled pixels)
    const pageSizeX = containerSize.width / stageScale;
    const pageSizeY = containerSize.height / stageScale;

    // Page index
    const pageX = Math.floor(px / pageSizeX);
    const pageY = Math.floor(py / pageSizeY);

    // Target stage position in screen pixels
    const targetX = -pageX * containerSize.width;
    const targetY = -pageY * containerSize.height;

    // Only update if different
    if (stagePos.x !== targetX || stagePos.y !== targetY) {
      setStagePos({ x: targetX, y: targetY });
    }
  }, [playerPos, mode, containerSize, stageScale, gridSize, isGameOver, isWin, isDying, stagePos.x, stagePos.y]);

  const addToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = [...prev, { tiles: JSON.parse(JSON.stringify(tiles)), triggers: JSON.parse(JSON.stringify(triggers)) }];
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
  }, [tiles, triggers]);

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setTiles(last.tiles);
    setTriggers(last.triggers);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleCanvasClick = (e: any) => {
    if (mode !== 'build') return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const worldX = (pointerPosition.x - stage.x()) / stage.scaleX();
    const worldY = (pointerPosition.y - stage.y()) / stage.scaleY();
    const x = Math.floor(worldX / gridSize);
    const y = Math.floor(worldY / gridSize);

    if (buildTool === 'delete') {
      const sortedTiles = [...tiles].sort((a, b) => {
        const defA = TILE_LIBRARY.find(t => t.type === a.type);
        const defB = TILE_LIBRARY.find(t => t.type === b.type);
        const catA = defA?.category || '';
        const catB = defB?.category || '';
        const priority = (cat: string) => {
          if (cat === 'artefact') return 5;
          if (cat === 'power-up') return 4;
          if (cat === 'monster') return 3;
          if (cat === 'items') return 2;
          return 1;
        };
        return priority(catB) - priority(catA);
      });

      const tileToDelete = sortedTiles.find(t => {
        if ((t.z || 0) !== currentZ) return false;
        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return x >= tx && x < tx + width && y >= ty && y < ty + height;
      });

      if (tileToDelete) {
        addToHistory();
        setTiles(tiles.filter(t => t.id !== tileToDelete.id));
        setTriggers(triggers.filter(tr => tr.targetId !== tileToDelete.id));
      } else {
        const triggerToDelete = triggers.find(tr => tr.x === x && tr.y === y && (tr.z || 0) === currentZ);
        if (triggerToDelete) {
          addToHistory();
          setTriggers(prev => prev.filter(tr => tr.id !== triggerToDelete.id));
        }
      }
      return;
    }

    if (buildTool === 'rotate') {
      const tileToRotate = tiles.find(t => {
        if ((t.z || 0) !== currentZ) return false;
        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return x >= tx && x < tx + width && y >= ty && y < ty + height;
      });
      if (tileToRotate) {
        addToHistory();
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

        const { width: mW, height: mH } = getTileBounds(movingTile);
        const isOccupied = tiles.some(t => {
          if (t.id === movingTileId) return false;
          if ((t.z || 0) !== currentZ) return false;
          const { x: tx, y: ty, width: tW, height: tH } = getTileBounds(t);
          const tX2 = tx + tW;
          const tY2 = ty + tH;
          const mX2 = x + mW;
          const mY2 = y + mH;
          return !(x >= tX2 || mX2 <= tx || y >= tY2 || mY2 <= ty);
        });

        if (!isOccupied) {
          addToHistory();
          setTiles(tiles.map(t => t.id === movingTileId ? { ...t, x, y } : t));
          setMovingTileId(null);
        }
      } else {
        const tileToMove = tiles.find(t => {
          if ((t.z || 0) !== currentZ) return false;
          const { x: tx, y: ty, width, height } = getTileBounds(t);
          return x >= tx && x < tx + width && y >= ty && y < ty + height;
        });
        if (tileToMove) {
          setMovingTileId(tileToMove.id);
        }
      }
      return;
    }

    const tileDef = TILE_LIBRARY.find(t => t.type === selectedTileType);
    if (!tileDef) return;

    const isItem = tileDef.category === 'items';
    const isPowerUp = tileDef.category === 'power-up';
    const isMonster = tileDef.category === 'monster';
    const isArtefact = tileDef.category === 'artefact';

    // Check if a tile of the SAME type is already there to rotate it
    const existingSameTypeIndex = tiles.findIndex(t => {
      if ((t.z || 0) !== currentZ) return false;
      const { x: tx, y: ty, width, height } = getTileBounds(t);
      return x >= tx && x < tx + width && y >= ty && y < ty + height && t.type === selectedTileType;
    });
    if (existingSameTypeIndex > -1) {
      addToHistory();
      const newTiles = [...tiles];
      if (selectedTileType === 'clue') {
        setTextEditModal({
          isOpen: true,
          tileId: newTiles[existingSameTypeIndex].id,
          text: newTiles[existingSameTypeIndex].clue || '',
          type: 'clue',
          mode: 'edit'
        });
      } else if (selectedTileType === 'message') {
        setTextEditModal({
          isOpen: true,
          tileId: newTiles[existingSameTypeIndex].id,
          text: newTiles[existingSameTypeIndex].message || '',
          type: 'message',
          mode: 'edit'
        });
      } else {
        newTiles[existingSameTypeIndex].rotation = (newTiles[existingSameTypeIndex].rotation + 90) % 360;
      }
      setTiles(newTiles);
      return;
    }

    // If it's NOT an item, power-up, monster, or artefact, check if the spot is occupied by another base tile
    if (!isItem && !isPowerUp && !isMonster && !isArtefact) {
      const isOccupiedByBase = tiles.some(t => {
        if ((t.z || 0) !== currentZ) return false;
        if (t.type === 'obstacle-half-w') return false;
        const tileDefT = TILE_LIBRARY.find(td => td.type === t.type);
        if (tileDefT?.category === 'items' || tileDefT?.category === 'power-up' || tileDefT?.category === 'monster' || tileDefT?.category === 'artefact') return false;
        
        const { x: tx, y: ty, width: tW, height: tH } = getTileBounds(t);
        const { width: mW, height: mH } = getTileBounds({ ...tileDef, rotation: currentRotation } as any);
        
        const tX2 = tx + tW;
        const tY2 = ty + tH;
        const mX2 = x + mW;
        const mY2 = y + mH;
        return !(x >= tX2 || mX2 <= tx || y >= tY2 || mY2 <= ty);
      });

      if (isOccupiedByBase) {
        const baseTileIndex = tiles.findIndex(t => {
          if ((t.z || 0) !== currentZ) return false;
          const tileDefT = TILE_LIBRARY.find(td => td.type === t.type);
          const { x: tx, y: ty, width, height } = getTileBounds(t);
          return tileDefT?.category !== 'items' && 
                 tileDefT?.category !== 'power-up' && 
                 tileDefT?.category !== 'monster' && 
                 tileDefT?.category !== 'artefact' && 
                 x >= tx && x < tx + width && y >= ty && y < ty + height;
        });
        if (baseTileIndex > -1) {
          addToHistory();
          const newTiles = [...tiles];
          newTiles[baseTileIndex] = {
            id: Math.random().toString(36).substr(2, 9),
            type: selectedTileType,
            x,
            y,
            z: currentZ,
            rotation: currentRotation,
            size: tileDef.size
          };
          setTiles(newTiles);
          return;
        }
      }
    }

    // Otherwise, just add it (layering)
    let clueText = undefined;
    if (selectedTileType === 'clue') {
      clueText = pendingClueText || "Tip";
    }

    const newTileId = Math.random().toString(36).substr(2, 9);
    addToHistory();
    const newTile: TileData = {
      id: newTileId,
      type: selectedTileType,
      x,
      y,
      z: currentZ,
      rotation: currentRotation,
      size: tileDef.size,
      width: tileDef.width,
      height: tileDef.height,
      clue: clueText
    };
    setTiles([...tiles, newTile]);
    
    if (selectedTileType === 'message' || selectedTileType === 'clue') {
      setTextEditModal({
        isOpen: true,
        tileId: newTileId,
        text: '',
        type: selectedTileType as 'message' | 'clue',
        mode: 'edit'
      });
    }

    // Add trigger for rotating quad tiles
    if (tileDef.category === 'quad' && tileDef.type.includes('rotating')) {
      setTriggers([...triggers, {
        id: Math.random().toString(36).substr(2, 9),
        targetId: newTileId,
        x: x + 2, // Place trigger nearby
        y: y,
        z: currentZ
      }]);
    }
  };

  const handleTriggerDrag = (id: string, e: any) => {
    const x = Math.floor(e.target.x() / gridSize);
    const y = Math.floor(e.target.y() / gridSize);
    setTriggers(triggers.map(t => t.id === id ? { ...t, x, y } : t));
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    if (mode !== 'build') return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const worldX = (pointerPosition.x - stage.x()) / stage.scaleX();
    const worldY = (pointerPosition.y - stage.y()) / stage.scaleY();
    const x = Math.floor(worldX / gridSize);
    const y = Math.floor(worldY / gridSize);

    const tileToDelete = tiles.find(t => {
      if ((t.z || 0) !== currentZ) return false;
      const { x: tx, y: ty, width, height } = getTileBounds(t);
      return x >= tx && x < tx + width && y >= ty && y < ty + height;
    });
    if (tileToDelete) {
      setTiles(tiles.filter(t => t.id !== tileToDelete.id));
      setTriggers(triggers.filter(tr => tr.targetId !== tileToDelete.id));
    }
    
    // Also allow deleting triggers directly
    setTriggers(prev => prev.filter(tr => (tr.x !== x || tr.y !== y) || (tr.z || 0) !== currentZ));
  };

  const getNextVersionName = (name: string) => {
    const match = name.match(/\.(\d+)$/);
    if (match) {
      const version = parseInt(match[1], 10);
      const baseName = name.substring(0, name.lastIndexOf('.'));
      return `${baseName}.${version + 1}`;
    } else {
      return `${name}.0`;
    }
  };

  const handleGlobalSave = async () => {
    if (!saveLevelName.trim()) return;
    setIsSaving(true);
    try {
      const isOverwrite = saveMode === 'overwrite' && currentLevelId;
      const levelId = isOverwrite ? currentLevelId : crypto.randomUUID();
      
      const levelData: LevelData = {
        id: levelId,
        name: saveLevelName,
        authorId: user?.uid,
        authorEmail: user?.email || undefined,
        data: {
          name: saveLevelName,
          tiles,
          triggers,
          gridSize,
          gridCellsX,
          gridCellsY,
          purpose,
          howTo,
          instructions,
          levelTimeLimit,
          powerUpDuration,
          darknessRadius
        },
        createdAt: isOverwrite ? (levels.find(l => l.id === currentLevelId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      };

      if (isOverwrite) {
        levelData.updatedAt = new Date().toISOString();
      }
      
      await setDoc(doc(db, 'levels', levelData.id), sanitizeFirestoreData(levelData));
      setShowSaveModal(false);
      setDungeonName(saveLevelName);
      setSaveLevelName('');
      setCurrentLevelId(levelData.id);
      alert(isOverwrite ? 'Level updated successfully!' : 'Level saved globally!');
    } catch (error) {
      console.error('Error saving level:', error);
      alert('Failed to save level.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const data: DungeonMap = {
      name: dungeonName,
      tiles,
      triggers,
      gridSize: gridSize,
      gridCellsX: gridCellsX,
      gridCellsY: gridCellsY,
      powerUpDuration,
      darknessRadius,
      purpose,
      howTo,
      instructions
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
        if (data.gridSize) {
          setGridSize(data.gridSize);
        }
        if (data.gridCellsX) {
          setGridCellsX(data.gridCellsX);
        }
        if (data.gridCellsY) {
          setGridCellsY(data.gridCellsY);
        }
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
        if (data.darknessRadius) {
          setDarknessRadius(data.darknessRadius);
        }
        if (data.purpose) setPurpose(data.purpose);
        if (data.howTo) setHowTo(data.howTo);
        if (data.instructions) setInstructions(data.instructions);
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  
  const handleLoadLevel = (level: LevelData) => {
    setGridSize(level.data.gridSize || 40);
    setGridCellsX(level.data.gridCellsX || 200);
    setGridCellsY(level.data.gridCellsY || 200);
    setTiles(level.data.tiles || []);
    setTriggers(level.data.triggers || []);
    setDungeonName(level.data.name || 'New Dungeon');
    setSaveLevelName(level.data.name || '');
    setPurpose(level.data.purpose || '');
    setHowTo(level.data.howTo || '');
    setLevelTimeLimit(level.data.levelTimeLimit || 120);
    setCurrentLevelId(level.id);
    setMode('build');
    alert(`Level "${level.name}" loaded successfully!`);
  };

  const clearDungeon = () => {
    setShowClearConfirmModal(true);
  };

  const handleConfirmClear = () => {
    setTiles([]);
    setTriggers([]);
    setDeathCount(0);
    setDungeonName("My Dungeon");
    setPurpose("");
    setHowTo("");
    setInstructions("");
    setCurrentLevelId(null);
    resetGameState();
    setShowClearConfirmModal(false);
  };

  const restartGame = () => {
    resetGameState();
  };

  // --- Play Mode Logic ---
  const prevModeRef = useRef<GameMode>(mode);

  useEffect(() => {
    if (mode === 'play' && prevModeRef.current !== 'play') {
      if (instructions) {
        setShowInstructionsModal(true);
      }
      resetGameState();
    } else if (mode === 'build' && prevModeRef.current !== 'build') {
      setIsInitialArtefactSelection(false);
      setShowArtefactMenu(false);
    }
    prevModeRef.current = mode;
  }, [mode, resetGameState, instructions]);

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
            } else {
              setPlayerPos({ x: 0, y: 0, z: 0 });
            }
            setMonsters([]);
            setPlayTime(0);
          }, 1000);
          break;
        }
      }

      // Web collision check
      const webTile = nextTiles.find(t => t.type === 'web');
      if (webTile) {
        setWebSlowTime(2); // Slow down for 2 seconds or next move
        setTiles(prev => prev.filter(t => t.id !== webTile.id));
      }

      // Speed power-up check
      const speedTile = nextTiles.find(t => t.type === 'speed');
      if (speedTile) {
        setSpeedBoostTime(10); // Boost for 10 seconds
        setTiles(prev => prev.filter(t => t.id !== speedTile.id));
      }

      // Message collision check
      const messageTile = nextTiles.find(t => t.type === 'message');
      if (messageTile && mode === 'play') {
        setIsPaused(true);
        setTextEditModal({
          isOpen: true,
          tileId: messageTile.id,
          text: messageTile.message || '',
          type: 'message',
          mode: 'view'
        });
      }

      // Wall collision check (Current tile exit)
      const currentTilesAtPos = tiles.filter(t => {
        if ((t.z || 0) !== finalZ) return false;
        const { x: tx, y: ty, width, height } = getTileBounds(t);
        return finalX >= tx && finalX < tx + width && finalY >= ty && finalY < ty + height;
      });
      if (currentTilesAtPos.some(t => isWallBlocked(t, direction, finalX, finalY, false))) break;

      // Wall collision check (Next tile entry)
      // Only check walls for tiles on the SAME Z-level
      if (nextTiles.filter(t => (t.z || 0) === finalZ).some(t => isWallBlocked(t, oppositeDir, nextX, nextY, true))) break;

      // Swerve check
      if (!isIntermediate && nextTiles.some(t => !t.isNeutralized && isSwerveBlocked(t, direction, effectiveAction === 'jump'))) break;
      
      if (!isIntermediate) {
        const canWalkOnLiquid = hasBoots || (selectedArtefact === 'artefact-boots' && isArtefactActive);
        const deathTile = nextTiles.find(t => (t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit') && !t.isNeutralized && !canWalkOnLiquid);
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
              setPlayerPos({ x: entrance.x, y: entrance.y, z: entrance.z || 0 });
            } else {
              setPlayerPos({ x: 0, y: 0, z: 0 });
            }
          }, 1000);
          break;
        }
      }

      // Other collisions
      if (nextTiles.some(t => t.type === 'column' || t.type === 'tree' || t.type === 'tree-single')) break;

      // Z-level transitions
      const stairsUpAtZ = nextTiles.find(t => t.type === 'stairs-up' && (t.z || 0) === finalZ);
      const stairsUpAtZMinus1 = nextTiles.find(t => t.type === 'stairs-up' && (t.z || 0) === finalZ - 1);
      
      if (stairsUpAtZ) {
        finalX = nextX;
        finalY = nextY;
        finalZ = finalZ + 1;
        break;
      } else if (stairsUpAtZMinus1) {
        finalX = nextX;
        finalY = nextY;
        finalZ = finalZ - 1;
        break;
      }

      const stairsDownAtZ = nextTiles.find(t => t.type === 'stairs-down' && (t.z || 0) === finalZ);
      const stairsDownAtZPlus1 = nextTiles.find(t => t.type === 'stairs-down' && (t.z || 0) === finalZ + 1);

      if (stairsDownAtZ) {
        finalX = nextX;
        finalY = nextY;
        finalZ = finalZ - 1;
        break;
      } else if (stairsDownAtZPlus1) {
        finalX = nextX;
        finalY = nextY;
        finalZ = finalZ + 1;
        break;
      }

      const holeAtZ = nextTiles.find(t => t.type === 'hole' && (t.z || 0) === finalZ);
      const holeAtZPlus1 = nextTiles.find(t => t.type === 'hole' && (t.z || 0) === finalZ + 1);

      if (holeAtZ) {
        finalX = nextX;
        finalY = nextY;
        finalZ = finalZ - 1;
      } else if (holeAtZPlus1) {
        // Falling from ceiling? Usually not possible unless we allow jumping up into holes.
      }

      if (finalZ < -10) { // Arbitrary limit for falling into void
        setIsDying(true);
        setIsFlashing(true);
        setDeathCount(prev => prev + 1);
        setHealth(0);
        setTimeout(() => {
          setIsDying(false);
          setIsFlashing(false);
          setHealth(100);
          const entrance = tiles.find(t => t.type === 'entrance');
          if (entrance) {
            setPlayerPos({ x: entrance.x, y: entrance.y, z: entrance.z || 0 });
          } else {
            setPlayerPos({ x: 0, y: 0, z: 0 });
          }
        }, 1000);
        break;
      }

      // Trampoline logic
      const trampolineTile = nextTiles.find(t => t.type === 'trampoline');
      if (trampolineTile) {
        if (effectiveAction === 'jump') {
          // Double jump length if jumping onto trampoline
          step += 2; 
        } else if (effectiveAction === 'normal') {
          // Push trampoline
          const tx = trampolineTile.x + dx;
          const ty = trampolineTile.y + dy;
          const destTiles = tiles.filter(t => {
             if ((t.z || 0) !== (trampolineTile.z || 0)) return false;
             if (t.size === 1) return t.x === tx && t.y === ty;
             return tx >= t.x && tx < t.x + 2 && ty >= t.y && ty < t.y + 2;
          });
          const isBlocked = destTiles.some(t => t.type === 'column' || t.type === 'tree' || t.type === 'tree-single' || t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit' || t.type === 'obstacle-half-h' || t.type === 'obstacle-above' || t.type === 'trampoline');
          const wallBlocked = isWallBlocked(trampolineTile, direction, trampolineTile.x, trampolineTile.y, false);
          
          if (!isBlocked && !wallBlocked && tx >= 0 && tx < canvasWidth / gridSize && ty >= 0 && ty < canvasHeight / gridSize) {
            setTiles(prev => prev.map(t => t.id === trampolineTile.id ? { ...t, x: tx, y: ty } : t));
          }
          break; // Stop player movement
        }
      }

      if (!isIntermediate && nextTiles.some(t => t.type === 'obstacle-half-h' && effectiveAction !== 'jump')) break;
      if (!isIntermediate && nextTiles.some(t => t.type === 'obstacle-above')) {
        // Cannot jump over 'slide' - only slide works
        if (effectiveAction !== 'slide') break;
      }

      // Artefact collection
      const artefactTile = nextTiles.find(t => {
        const def = TILE_LIBRARY.find(tl => tl.type === t.type);
        return def?.category === 'artefact' && !hiddenTileIds.has(t.id);
      });

      if (artefactTile) {
        setHasArtefact(true);
        setHiddenTileIds(prev => new Set(prev).add(artefactTile.id));
        setCollectedArtefactType(artefactTile.type);
        setShowArtefactModal(true);
        
        // Activate permanent powers if the artefact has them
        if (artefactTile.type === 'artefact-shield') setHasShield(true);
        if (artefactTile.type === 'artefact-rod') setHasRod(true);
        if (artefactTile.type === 'artefact-cloak') setHasCloak(true);
        if (artefactTile.type === 'artefact-boots') setHasBoots(true);
        if (artefactTile.type === 'artefact-jumper') setHasJumper(true);
        if (artefactTile.type === 'artefact-runner') setHasRunner(true);
      }

      // Power up collection
      const mushroomTile = nextTiles.find(t => t.type === 'mushroom' && !hiddenTileIds.has(t.id));
      if (mushroomTile) {
        setIsPowerUpActive(true);
        setPowerUpTimeLeft(powerUpDuration);
        setHiddenTileIds(prev => new Set(prev).add(mushroomTile.id));
      }

      const thirdEyeTile = nextTiles.find(t => t.type === 'third-eye' && !hiddenTileIds.has(t.id));
      if (thirdEyeTile) {
        setIsThirdEyeActive(true);
        setThirdEyeTimeLeft(powerUpDuration);
        setHiddenTileIds(prev => new Set(prev).add(thirdEyeTile.id));
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
      if (isThirdEyeActive && nextTiles.some(t => t.type === 'portal')) {
        const otherPortal = tiles.find(t => t.type === 'portal' && (t.x !== nextX || t.y !== nextY));
        if (otherPortal) {
          finalX = otherPortal.x;
          finalY = otherPortal.y;
          break;
        }
      }

      // Exit check
      if (nextTiles.some(t => t.type === 'exit')) {
        setIsWin(true);
        setIsFlashing(true);
        finalX = nextX;
        finalY = nextY;
        
        // Trigger sitemap success screen if available
        if (activeCampaign && activeCampaign.sitemapId) {
          const sm = sitemaps.find(s => s.id === activeCampaign.sitemapId);
          if (sm) {
            const currentLevelId = activeCampaign.levelIds[currentLevelIndex];
            const successScreen = sm.screens.find(scr => scr.type === 'success' && scr.levelId === currentLevelId);
            if (successScreen) {
              setActiveSitemapScreen(successScreen);
            } else {
              // Fallback to first success screen if no specific one found
              const firstSuccess = sm.screens.find(scr => scr.type === 'success');
              if (firstSuccess) {
                setActiveSitemapScreen(firstSuccess);
              }
            }
          }
        }
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

    setPlayerPos({ x: finalX, y: finalY, z: finalZ });
  }, [mode, playerPos, tiles, playerAction, isGameOver, isWin, isDying, triggers, hasArtefact, pressedKeys, isPowerUpActive, powerUpDuration, monsters, webSlowTime, hasShield, selectedArtefact, isArtefactActive, canvasWidth, canvasHeight, gridSize, hasBoots, hasJumper, hasRunner, isSwerveBlocked, isWallBlocked, jumpBoostTime, playTime, sitemaps, speedBoostTime]);

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

      if (mode !== 'play' || isPaused) return;

      const isMoveKey = ['w', 's', 'a', 'd', ' ', 'shift'].includes(key);
      if (webSlowTime > 0 && isMoveKey) {
        if (webPressCount === 0) {
          setWebPressCount(1);
          return;
        } else {
          setWebPressCount(0);
        }
      }

      switch (key) {
        case 't':
          if (selectedArtefact && !isArtefactActive && !isArtefactReloading) {
            setIsArtefactActive(true);
            setArtefactTimeLeft(15);
          }
          break;
        case 'w': movePlayer(0, -1); break;
        case 's': movePlayer(0, 1); break;
        case 'a': movePlayer(-1, 0); break;
        case 'd': movePlayer(1, 0); break;
        case ' ': 
          e.preventDefault();
          setPlayerAction('jump');
          movePlayer(lastDirection.dx, lastDirection.dy, 'jump');
          setTimeout(() => setPlayerAction('normal'), 500);
          break;
        case 'shift':
          setPlayerAction('slide');
          movePlayer(lastDirection.dx, lastDirection.dy, 'slide');
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
  }, [mode, movePlayer, webSlowTime, webPressCount, lastDirection]);

  const isEmbed = new URLSearchParams(window.location.search).get('embed') === 'true';

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 z-[200]">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full animate-spin border-t-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skull className="text-indigo-500 animate-pulse" size={32} />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Initializing Dungeon</h2>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest animate-pulse">
            {isAuthLoading ? 'Authenticating...' : 'Loading Cloud Data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={cn(
        "flex flex-col h-screen bg-[#141414] text-zinc-100 font-sans overflow-hidden",
        isEmbed && "bg-black"
      )}>
        {!isFirebaseConfigured && !isEmbed && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between z-50">
            <div className="flex items-center gap-3">
              <AlertCircle size={14} className="text-amber-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200">
                Firebase Not Configured: Cloud saving and authentication are disabled.
              </p>
            </div>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[9px] font-bold uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors underline underline-offset-4"
            >
              Setup Firebase
            </a>
          </div>
        )}
        
        {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirmModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Clear Canvas?</h3>
              <p className="text-zinc-400 text-sm mb-8">
                This will permanently delete all tiles and reset the level configuration. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmClear}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
                >
                  CLEAR ALL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructionsModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-indigo-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <Info size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4 tracking-tight uppercase tracking-widest">Briefing</h2>
              <div className="text-zinc-400 text-sm mb-8 leading-relaxed whitespace-pre-wrap">
                {instructions || "Welcome to the dungeon. Good luck."}
              </div>
              <button
                onClick={() => setShowInstructionsModal(false)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                UNDERSTOOD
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {isGameOver && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-red-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                <Skull size={40} className="text-red-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight uppercase">
                Time has Run Out
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                The celestial cycle has completed. The dungeon has claimed another soul.
              </p>
              <button
                onClick={restartGame}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                RETRY MISSION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purpose Modal */}
      <AnimatePresence>
        {showPurposeModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen size={14} /> Level Purpose
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {purpose || "No purpose defined for this level."}
              </p>
              <button
                onClick={() => setShowPurposeModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* How-to Modal */}
      <AnimatePresence>
        {showHowToModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <HelpCircle size={14} /> Solution Guide
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {howTo || "No solution guide available."}
              </p>
              <button
                onClick={() => setShowHowToModal(false)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Library Tooltip */}
      <AnimatePresence>
        {hoveredTile && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="fixed z-50 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredTile.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">{hoveredTile.label}</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">{hoveredTile.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Artefact Celebration Modal */}
      <AnimatePresence>
        {showArtefactModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-zinc-900 border border-amber-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(251,191,36,0.2)]"
            >
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
                {collectedArtefactType === 'artefact-shield' ? <Shield size={40} className="text-amber-400 animate-pulse" /> :
                 collectedArtefactType === 'artefact-rod' ? <Compass size={40} className="text-amber-400 animate-pulse" /> :
                 collectedArtefactType === 'artefact-cloak' ? <Ghost size={40} className="text-amber-400 animate-pulse" /> :
                 collectedArtefactType === 'artefact-boots' ? <Footprints size={40} className="text-amber-400 animate-pulse" /> :
                 collectedArtefactType === 'artefact-jumper' ? <ArrowUp size={40} className="text-amber-400 animate-pulse" /> :
                 collectedArtefactType === 'artefact-runner' ? <Wind size={40} className="text-amber-400 animate-pulse" /> :
                 <Zap size={40} className="text-amber-400 animate-pulse" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight uppercase">
                {collectedArtefactType === 'artefact-shield' ? 'Shield' :
                 collectedArtefactType === 'artefact-rod' ? 'Rod' :
                 collectedArtefactType === 'artefact-cloak' ? 'Cloak' :
                 collectedArtefactType === 'artefact-boots' ? 'Walking Boots' :
                 collectedArtefactType === 'artefact-jumper' ? 'Jumper' :
                 collectedArtefactType === 'artefact-runner' ? 'Runner' :
                 'Artefact'} Collected!
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                {collectedArtefactType === 'artefact-shield' ? 'The Aegis protects you. You are now immune to monster attacks until you escape.' :
                 collectedArtefactType === 'artefact-rod' ? 'The Divining Rod pulses. It will guide you to the exit.' :
                 collectedArtefactType === 'artefact-cloak' ? 'The Shadow Cloak drapes over you. Monsters can no longer see you.' :
                 collectedArtefactType === 'artefact-boots' ? 'The Walking Boots allow you to tread safely over lava and water.' :
                 collectedArtefactType === 'artefact-jumper' ? 'The Jumping Pole doubles your jump distance permanently.' :
                 collectedArtefactType === 'artefact-runner' ? 'The Swift Wings double your movement speed permanently.' :
                 'The ancient power flows through you. The exit is now open. Find your way out of the dungeon!'}
              </p>
              <button
                onClick={() => setShowArtefactModal(false)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all active:scale-95"
              >
                CONTINUE MISSION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Initial Artefact Confirmation Modal */}
      <AnimatePresence>
        {showArtefactConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-cyan-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.2)]"
            >
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/30 rotate-12">
                {selectedArtefact === 'artefact-shield' && <Shield size={32} className="text-cyan-400" />}
                {selectedArtefact === 'artefact-rod' && <Compass size={32} className="text-cyan-400" />}
                {selectedArtefact === 'artefact-cloak' && <Ghost size={32} className="text-cyan-400" />}
                {selectedArtefact === 'artefact-boots' && <Footprints size={32} className="text-cyan-400" />}
                {selectedArtefact === 'artefact-jumper' && <ArrowUp size={32} className="text-cyan-400" />}
                {selectedArtefact === 'artefact-runner' && <Wind size={32} className="text-cyan-400" />}
                {!selectedArtefact && <X size={32} className="text-zinc-500" />}
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">
                {selectedArtefact ? "ARTEFACT EQUIPPED" : "STARTING EMPTY"}
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                {selectedArtefact 
                  ? `You have chosen the ${selectedArtefact.split('-')[1]}. Use its power wisely to survive the dungeon.`
                  : "You have chosen to enter the dungeon without a starting artefact. Good luck, you'll need it."}
              </p>
              <button
                onClick={() => {
                  setShowArtefactConfirmation(false);
                  setIsInitialArtefactSelection(false);
                }}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
              >
                ENTER DUNGEON
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      {!isEmbed && (
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md z-40 shrink-0">
          <div className="flex items-center gap-6">
            {/* LOGO */}
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tighter">DUNGEON ARCHITECT</h1>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">v1.0.4-alpha</p>
            </div>

            <div className="h-8 w-px bg-white/10" />

            {/* Mode Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/5">
              {isAdminUser && (
                <button
                  onClick={() => {
                    setMode('admin');
                    setActiveCampaign(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                    mode === 'admin' ? "bg-amber-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Settings size={14} />
                  Manage
                </button>
              )}
              <button
                onClick={() => {
                  setMode('build');
                  setActiveCampaign(null);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === 'build' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Hammer size={14} />
                Build
              </button>
              <button
                onClick={() => {
                  setMode('play');
                  resetGameState();
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                  mode === 'play' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Play size={14} />
                Play
              </button>
            </div>

            {/* Play Mode Controls */}
            {mode === 'play' && (
              <>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-white/5">
                  <div className="flex items-center gap-1 px-3 border-r border-white/10 mr-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mr-2">Floor</span>
                    <span className="text-xs font-bold text-indigo-400">
                      {(playerPos.z || 0) === 0 ? 'B1' : (playerPos.z || 0) > 0 ? `F${playerPos.z}` : `B${Math.abs(playerPos.z || 0) + 1}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                      isPaused ? "bg-amber-600 text-white shadow-lg" : "text-zinc-300 hover:text-white"
                    )}
                  >
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button 
                    onClick={restartGame}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    <RotateCw size={12} />
                    Restart
                  </button>
                </div>
              </>
            )}

            {/* Floor Selector (Build Mode Only) */}
            {mode === 'build' && (
              <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-white/5">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2">Floor</span>
                <div className="flex items-center gap-1">
                  {(() => {
                    const zLevels = tiles.map(t => t.z || 0);
                    const minZ = Math.min(...zLevels, -1, currentZ - 1);
                    const maxZ = Math.max(...zLevels, 1, currentZ + 1);
                    const range = [];
                    for (let z = minZ; z <= maxZ; z++) range.push(z);
                    return range.map(z => (
                      <button
                        key={z}
                        onClick={() => setCurrentZ(z)}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-md text-[10px] font-bold transition-all",
                          currentZ === z 
                            ? "bg-indigo-600 text-white shadow-lg" 
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        )}
                      >
                        {z === 0 ? 'B1' : z > 0 ? `F${z}` : `B${Math.abs(z) + 1}`}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Level Management Trigger */}
            {mode === 'build' && user && (
              <button
                onClick={() => setShowLevelMgmtModal(true)}
                className="w-10 h-10 flex items-center justify-center bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-500 hover:bg-amber-600/30 transition-all shadow-lg shadow-amber-900/10 group"
                title="Level Management"
              >
                <div className="relative">
                  <LibraryIcon size={20} />
                  <ArrowRight size={10} className="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full p-0.5 border border-zinc-900" />
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Settings */}
            <div className="flex items-center gap-3 bg-zinc-950 p-1 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2">Settings</span>
              <button 
                onClick={() => setIsDarknessOn(!isDarknessOn)}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all px-3 py-1.5 rounded-md border",
                  isDarknessOn 
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]" 
                    : "bg-zinc-800/50 border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                {isDarknessOn ? <Moon size={14} /> : <Sun size={14} />}
                {isDarknessOn ? "Light Off" : "Light On"}
              </button>
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all px-3 py-1.5 rounded-md border",
                  isRunning 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                    : "bg-zinc-800/50 border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                {isRunning ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                {isRunning ? "Run" : "Walk"}
              </button>
            </div>

            {/* Help */}
            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-white/5">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2">Help</span>
              <button
                onClick={() => setShowPurposeModal(true)}
                className="p-1.5 bg-zinc-800/50 border border-white/10 rounded-md text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                title="Level Purpose"
              >
                <BookOpen size={14} />
              </button>
              <button
                onClick={() => setShowHowToModal(true)}
                className="p-1.5 bg-zinc-800/50 border border-white/10 rounded-md text-zinc-400 hover:text-cyan-500 hover:bg-cyan-500/10 transition-all"
                title="How to Solve"
              >
                <HelpCircle size={14} />
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={cn(
                  "p-1.5 border rounded-md transition-all",
                  showDebug ? "bg-amber-500/20 border-amber-500/50 text-amber-500" : "bg-zinc-800/50 border-white/10 text-zinc-400 hover:text-white"
                )}
                title="Debugging"
              >
                <Settings size={14} />
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-zinc-400 font-medium">{user.displayName || user.email}</span>
                    {isAdminUser && <span className="text-[8px] text-amber-500 font-bold uppercase tracking-tighter">Admin</span>}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  <LogIn size={14} />
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isEmbed && (
          <div 
            className={cn(
              "bg-zinc-900 border-r border-white/10 flex flex-col relative",
              sidebarOpen ? "" : "w-0 overflow-hidden border-none"
            )}
            style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          >
        <div className="flex border-b border-white/10">
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
          <button onClick={() => setSidebarOpen(false)} className="px-3 hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {sidebarTab === 'library' ? (
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
          ) : (
            <>
              {/* Select Level */}
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

              {/* Level Management */}
              {/* Moved to Top Bar Modal */}

              {/* Narrative */}
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

              {/* Level Settings */}
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

                    {selectedTileType === 'clue' && (
                      <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl space-y-2">
                        <p className="text-[9px] text-pink-400 leading-relaxed font-medium">
                          Clue text is now managed via a modal. Click the tile on the canvas to edit its content.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono">SYSTEM READY</span>
          </div>
        </div>
        {sidebarOpen && (
          <div 
            onMouseDown={startResizing}
            className="absolute right-0 top-0 w-1 hover:w-1.5 bg-white/5 hover:bg-indigo-500/50 cursor-col-resize transition-all z-50 h-full"
          />
        )}
      </div>
      )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          {!isEmbed && !sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="absolute left-4 top-4 z-[60] w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all active:scale-95 group"
              title="Open Library"
            >
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {mode === 'build' && (
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
              <button
                onClick={() => {
                  setStageScale(1);
                  setStagePos({ x: 0, y: 0 });
                }}
                className="p-2 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors flex items-center gap-1 shadow-lg"
                title="Reset View"
              >
                <Layout size={18} />
                <span className="text-[10px] font-bold uppercase">Reset View</span>
              </button>
            </div>
          )}

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:20px_20px] relative">
          {/* Floating Build Modal */}
          <AnimatePresence>
            {(mode === 'build' || mode === 'play') && (
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
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{mode === 'build' ? 'Build Tools' : 'Debug Tools'}</span>
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
                    {mode === 'build' && (
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
                    )}

                    <div className={cn("pt-2 flex gap-2", mode === 'build' && "border-t border-white/5")}>
                      {mode === 'build' && (
                        <button
                          onClick={undo}
                          disabled={history.length === 0}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider",
                            history.length > 0 ? "bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white" : "opacity-30 cursor-not-allowed border-transparent text-zinc-600"
                          )}
                        >
                          <RotateCw size={12} className="-scale-x-100" />
                          Undo
                        </button>
                      )}
                      <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={cn(
                          "px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                          mode === 'play' ? "flex-1" : "",
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
            )}
          </AnimatePresence>

          <div 
            ref={containerRef}
            className="flex-1 relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 rounded-lg overflow-hidden bg-[#09090b]"
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
            {/* Debug Panel */}
            <AnimatePresence>
              {showDebug && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-6 left-6 z-40 w-64 bg-zinc-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
                >
                  <div className="bg-amber-500/10 px-3 py-2 border-b border-amber-500/20 flex items-center gap-2">
                    <Settings size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Debug Inspector</span>
                  </div>
                  <div className="p-3 space-y-2 font-mono text-[9px]">
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
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <div className="text-zinc-500 uppercase mb-1">Movement Check</div>
                      {['up', 'down', 'left', 'right'].map(d => {
                        const dx = d === 'left' ? -1 : d === 'right' ? 1 : 0;
                        const dy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
                        const nx = playerPos.x + dx;
                        const ny = playerPos.y + dy;
                        const opp = d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
                        
                        const curTiles = tiles.filter(t => {
                          const { x: tx, y: ty, width, height } = getTileBounds(t);
                          return playerPos.x >= tx && playerPos.x < tx + width && playerPos.y >= ty && playerPos.y < ty + height;
                        });
                        const nxtTiles = tiles.filter(t => {
                          const { x: tx, y: ty, width, height } = getTileBounds(t);
                          return nx >= tx && nx < tx + width && ny >= ty && ny < ty + height;
                        });
                        
                        const exitBlocked = curTiles.find(t => isWallBlocked(t, d, playerPos.x, playerPos.y, false));
                        const entryBlocked = nxtTiles.find(t => isWallBlocked(t, opp, nx, ny, true));
                        const obstacleBlocked = nxtTiles.find(t => t.type === 'column' || t.type === 'tree');
                        
                        const isBlocked = exitBlocked || entryBlocked || obstacleBlocked;
                        
                        return (
                          <div key={d} className="flex justify-between items-center">
                            <span className="text-zinc-500 uppercase">{d}</span>
                            {isBlocked ? (
                              <span className="text-red-400 flex items-center gap-1">
                                <X size={8} />
                                {exitBlocked ? `Exit:${exitBlocked.type}` : entryBlocked ? `Entry:${entryBlocked.type}` : 'Obstacle'}
                              </span>
                            ) : (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={8} />
                                Open
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Narrative Buttons Moved to Top Menu */}

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
              style={{ backgroundColor: '#09090b' }} 
            >
              <Layer>
                {/* Dungeon Floor Background */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fill="#09090b" // zinc-950
                />

                {/* Grid Lines */}
                {[...Array(Math.ceil(canvasWidth / gridSize) + 1)].map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * gridSize, 0, i * gridSize, canvasHeight]}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    opacity={0.05}
                  />
                ))}
                {[...Array(Math.ceil(canvasHeight / gridSize) + 1)].map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * gridSize, canvasWidth, i * gridSize]}
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
                    
                    // Z-level filtering
                    const targetZ = mode === 'play' ? playerPos.z : currentZ;
                    const tz = t.z || 0;
                    
                    // Show stairs from adjacent levels in play mode
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
                    if (catA === 'corridor' && catB !== 'corridor') return -1;
                    if (catA !== 'corridor' && catB === 'corridor') return 1;
                    if (catA === 'items' && catB === 'monster') return -1;
                    if (catA === 'monster' && catB === 'items') return 1;
                    return 0;
                  })
                  .map((tile) => (
                    <Group key={tile.id}>
                      <TileRenderer 
                        tile={tile} 
                        hasArtefact={hasArtefact} 
                        isPowerUpActive={isPowerUpActive} 
                        isThirdEyeActive={isThirdEyeActive}
                        thirdEyeTimeLeft={thirdEyeTimeLeft}
                        powerUpTimeLeft={powerUpTimeLeft}
                        powerUpDuration={powerUpDuration}
                        tick={tick} 
                        mode={mode}
                        targetZ={mode === 'play' ? playerPos.z : currentZ}
                        gridSize={gridSize}
                      />
                      {movingTileId === tile.id && (
                        <Rect
                          x={tile.x * gridSize}
                          y={tile.y * gridSize}
                          width={tile.size * gridSize}
                          height={tile.size * gridSize}
                          stroke="#6366f1"
                          strokeWidth={2}
                          dash={[5, 5]}
                          opacity={0.8}
                        />
                      )}
                    </Group>
                  ))}

                {/* Active Monsters */}
                {mode === 'play' && monsters
                  .filter(m => (m.z || 0) === playerPos.z)
                  .map(m => (
                    <TileRenderer 
                      key={m.id}
                      tile={{ ...m, rotation: 0, size: 1 }} 
                      hasArtefact={false} 
                      isPowerUpActive={false} 
                      isThirdEyeActive={false}
                      thirdEyeTimeLeft={0}
                      powerUpTimeLeft={0} 
                      powerUpDuration={powerUpDuration} 
                      tick={tick} 
                      mode={mode} 
                      gridSize={gridSize}
                    />
                  ))}

                {/* Triggers */}
                {triggers
                  .filter(t => {
                    const targetZ = mode === 'play' ? playerPos.z : currentZ;
                    return (t.z || 0) === targetZ;
                  })
                  .map((trigger) => (
                  <Rect
                    key={trigger.id}
                    x={trigger.x * gridSize + 10}
                    y={trigger.y * gridSize + 10}
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
                    x={playerPos.x * gridSize + gridSize/2} 
                    y={playerPos.y * gridSize + gridSize/2}
                    scaleX={playerAction === 'slide' ? 0.8 : 1}
                    scaleY={playerAction === 'slide' ? 0.6 : 1}
                    opacity={isFlashing ? (tick % 2 === 0 ? 0.5 : 1) : 1}
                  >
                    {isDying ? (
                      <Group y={-5}>
                        <Circle radius={gridSize/4} fill="#ef4444" />
                        <Text text="💀" fontSize={16} x={-8} y={-8} />
                      </Group>
                    ) : (
                      <>
                        {lightTime > 0 && (
                          <Circle 
                            radius={gridSize * 2} 
                            fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                            fillRadialGradientStartRadius={0}
                            fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                            fillRadialGradientEndRadius={gridSize * 2}
                            fillRadialGradientColorStops={[0, 'rgba(254, 240, 138, 0.3)', 1, 'rgba(254, 240, 138, 0)']}
                          />
                        )}
                        <Circle 
                          radius={gridSize/4} 
                          fill={(hasCloak || (selectedArtefact === 'artefact-cloak' && isArtefactActive)) ? "rgba(99, 102, 241, 0.4)" : "#6366f1"} 
                          stroke="white" 
                          strokeWidth={2}
                          shadowBlur={playerAction === 'jump' ? 20 : 5}
                          shadowColor="#6366f1"
                          y={playerAction === 'jump' ? -10 : 0}
                        />
                        {hasShield && (
                          <Circle 
                            radius={gridSize/3} 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            dash={[2, 2]}
                            y={playerAction === 'jump' ? -10 : 0}
                          />
                        )}
                        {selectedArtefact === 'artefact-shield' && isArtefactActive && (
                          <Circle 
                            radius={gridSize/2.5} 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            opacity={0.6}
                            y={playerAction === 'jump' ? -10 : 0}
                          />
                        )}
                        {(hasRod || (selectedArtefact === 'artefact-rod' && isArtefactActive)) && (
                          <Group y={-25}>
                            {(() => {
                              const exit = tiles.find(t => t.type === 'exit');
                              if (!exit) return null;
                              const angle = Math.atan2(exit.y - playerPos.y, exit.x - playerPos.x) * (180 / Math.PI);
                              return (
                                <Group rotation={angle}>
                                  <Line points={[0, 0, 15, 0]} stroke="#10b981" strokeWidth={2} />
                                  <Line points={[10, -4, 15, 0, 10, 4]} stroke="#10b981" strokeWidth={2} />
                                </Group>
                              );
                            })()}
                          </Group>
                        )}
                        <Circle 
                          radius={gridSize/8} 
                          fill="white" 
                          opacity={0.5}
                          x={-5}
                          y={playerAction === 'jump' ? -15 : -5}
                        />
                      </>
                    )}
                  </Group>
                )}

                {/* Darkness Layer */}
                {isDarknessOn && mode === 'play' && (
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={canvasHeight}
                    fillRadialGradientStartPoint={{ 
                      x: playerPos.x * gridSize + gridSize/2, 
                      y: playerPos.y * gridSize + gridSize/2 
                    }}
                    fillRadialGradientStartRadius={0}
                    fillRadialGradientEndPoint={{ 
                      x: playerPos.x * gridSize + gridSize/2, 
                      y: playerPos.y * gridSize + gridSize/2 
                    }}
                    fillRadialGradientEndRadius={lightTime > 0 ? darknessRadius * gridSize * 1.6 : darknessRadius * gridSize}
                    fillRadialGradientColorStops={[
                      0, 'rgba(0,0,0,0)', 
                      0.4, 'rgba(0,0,0,0)',
                      0.8, 'rgba(0,0,0,1)',
                      1, 'rgba(0,0,0,1)'
                    ]}
                    listening={false}
                  />
                )}

                {/* Score / Deaths */}
                <Group x={canvasWidth - 20} y={60}>
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
                  <Group x={canvasWidth / 2 - 100} y={20}>
                    <Rect width={200} height={30} fill="rgba(0,0,0,0.5)" cornerRadius={5} />
                    
                    {/* Health Bar Removed from here */}

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
                    
                    {/* Trapped Warning */}
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

            {/* Win State Overlay (HTML for fixed positioning) */}
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
                        
                        {/* Active Glow */}
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
                {/* Controls Note */}
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-2">
                  Press Tab to Focus
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-sm px-3 py-1.5 rounded border border-white/5 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  WASD: MOVE | SPACE: JUMP | SHIFT: SLIDE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Dashboard */}
      {mode === 'admin' && (
        <AdminDashboard 
          onClose={() => setMode('build')}
          levels={levels}
          userLevels={userLevels}
          sitemaps={sitemaps}
          campaigns={campaigns}
          isSaving={isSaving}
          onSaveCampaign={handleSaveCampaign}
          onUploadLevel={handleUploadLevel}
          onUploadSitemap={handleUploadSitemap}
          onDeleteCampaign={handleDeleteCampaign}
          onDeleteLevel={handleDeleteLevel}
          onDeleteSitemap={handleDeleteSitemap}
          onUpdateSitemap={handleUpdateSitemap}
          onExport={handleExport}
          onImport={handleImport}
          onLoadLevel={handleLoadLevel}
          onPlayCampaign={(campaign) => {
            setActiveCampaign(campaign);
            setCurrentLevelIndex(0);
            setMode('play');
            if (campaign.levelIds && campaign.levelIds.length > 0) {
              loadLevel(campaign.levelIds[0]);
            }
            const sm = sitemaps.find(s => s.id === campaign.sitemapId);
            if (sm && sm.screens.length > 0) {
              setActiveSitemapScreen(sm.screens[0]);
            }
          }}
        />
      )}

      {/* Sitemap Overlay */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <Save size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase text-center">
                Save Level Globally
              </h2>
              <p className="text-zinc-400 text-xs mb-6 text-center">
                This will save your current dungeon to the cloud, making it accessible to all users.
              </p>
              
              <div className="space-y-4">
                {currentLevelId && (
                  <div className="flex bg-zinc-950 rounded-xl p-1 gap-1 border border-white/5">
                    <button
                      onClick={() => {
                        if (saveMode === 'new') {
                          setSaveLevelName(dungeonName);
                        }
                        setSaveMode('overwrite');
                      }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                        saveMode === 'overwrite' ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Overwrite
                    </button>
                    <button
                      onClick={() => {
                        if (saveMode === 'overwrite') {
                          setSaveLevelName(getNextVersionName(saveLevelName));
                        }
                        setSaveMode('new');
                      }}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider",
                        saveMode === 'new' ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      Save as New
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Level Name</label>
                  <input 
                    type="text"
                    value={saveLevelName}
                    onChange={(e) => setSaveLevelName(e.target.value)}
                    placeholder="Enter level name..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleGlobalSave}
                    disabled={isSaving || !saveLevelName.trim()}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {isSaving ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Text Edit Modal (Messages & Clues) */}
      <AnimatePresence>
        {textEditModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "bg-zinc-900 border rounded-3xl p-8 max-w-md w-full shadow-2xl",
                textEditModal.type === 'clue' ? "border-pink-500/30" : "border-amber-500/30"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6",
                textEditModal.type === 'clue' ? "bg-pink-500/20" : "bg-amber-500/20"
              )}>
                {textEditModal.type === 'clue' ? <Info className="text-pink-500" size={32} /> : <BookOpen className="text-amber-500" size={32} />}
              </div>
              
              <h2 className={cn(
                "text-2xl font-black text-center mb-6 tracking-tight uppercase italic",
                textEditModal.type === 'clue' ? "text-pink-100" : "text-amber-100"
              )}>
                {textEditModal.mode === 'edit' 
                  ? `Edit ${textEditModal.type === 'clue' ? 'Clue' : 'Message'}` 
                  : `Ancient ${textEditModal.type === 'clue' ? 'Clue' : 'Message'}`}
              </h2>

              {textEditModal.mode === 'edit' ? (
                <textarea
                  value={textEditModal.text}
                  onChange={(e) => setTextEditModal(prev => ({ ...prev, text: e.target.value }))}
                  placeholder={`Enter ${textEditModal.type === 'clue' ? 'clue' : 'message'} here...`}
                  className={cn(
                    "w-full h-32 bg-zinc-950 border rounded-xl p-4 text-white text-sm focus:outline-none transition-all resize-none mb-6",
                    textEditModal.type === 'clue' ? "border-pink-500/20 focus:border-pink-500/50" : "border-amber-500/20 focus:border-amber-500/50"
                  )}
                  autoFocus
                />
              ) : (
                <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-6 mb-8">
                  <p className="text-zinc-300 text-center leading-relaxed italic font-serif">
                    "{textEditModal.text || (textEditModal.type === 'clue' ? 'The clue is unreadable...' : 'The scroll is blank...')}"
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (textEditModal.mode === 'edit' && textEditModal.tileId) {
                    setTiles(prev => prev.map(t => {
                      if (t.id === textEditModal.tileId) {
                        return textEditModal.type === 'clue' 
                          ? { ...t, clue: textEditModal.text } 
                          : { ...t, message: textEditModal.text };
                      }
                      return t;
                    }));
                  }
                  setTextEditModal(prev => ({ ...prev, isOpen: false }));
                  setIsPaused(false);
                }}
                className={cn(
                  "w-full py-4 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg",
                  textEditModal.type === 'clue' 
                    ? "bg-pink-600 hover:bg-pink-500 shadow-pink-900/20" 
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-900/20"
                )}
              >
                {textEditModal.mode === 'edit' ? 'Save Changes' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Management Modal */}
      <AnimatePresence>
        {showLevelMgmtModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Settings className="text-amber-500" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Level Management</h2>
                </div>
                <button 
                  onClick={() => setShowLevelMgmtModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={() => {
                    setSaveMode(currentLevelId ? 'overwrite' : 'new');
                    setSaveLevelName(dungeonName);
                    setShowSaveModal(true);
                    setShowLevelMgmtModal(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
                >
                  <Save size={24} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-emerald-400 tracking-widest">Save Level</span>
                </button>
                <button
                  onClick={() => {
                    setShowClearConfirmModal(true);
                    setShowLevelMgmtModal(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                >
                  <Plus size={24} className="text-zinc-500 group-hover:text-red-500" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-red-400 tracking-widest">New Canvas</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowLevelMgmtModal(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                >
                  <Upload size={24} className="text-indigo-500" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-indigo-400 tracking-widest">Import JSON</span>
                </button>
                <button
                  onClick={() => {
                    handleExport();
                    setShowLevelMgmtModal(false);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                >
                  <Download size={24} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400 group-hover:text-amber-400 tracking-widest">Download JSON</span>
                </button>
              </div>

              <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl">
                <p className="text-[9px] text-zinc-500 leading-relaxed text-center uppercase tracking-widest">
                  Manage your dungeon blueprints here. <br/>
                  Blueprints are stored in the ancient cloud.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sitemap Overlay */}
      <AnimatePresence>
        {activeSitemapScreen && (
          <SitemapOverlay 
            screen={activeSitemapScreen}
            onClose={() => setActiveSitemapScreen(null)}
            onAction={(action, levelId, nextScreenId) => {
              if (action === 'next_screen' && nextScreenId) {
                const nextScreen = sitemap?.screens.find(s => s.id === nextScreenId);
                if (nextScreen) {
                  setActiveSitemapScreen(nextScreen);
                } else {
                  setActiveSitemapScreen(null);
                }
                return;
              }
              if (action === 'load_level' && levelId) {
                loadLevel(levelId);
                setActiveSitemapScreen(null);
                return;
              }
              if (action === 'next_level') {
                if (levelId) {
                  loadLevel(levelId);
                  setActiveSitemapScreen(null);
                  return;
                }
                if (nextScreenId) {
                  const nextScreen = sitemap?.screens.find(s => s.id === nextScreenId);
                  if (nextScreen) {
                    setActiveSitemapScreen(nextScreen);
                  } else {
                    setActiveSitemapScreen(null);
                  }
                  return;
                }
                const nextIndex = currentLevelIndex + 1;
                if (activeCampaign && nextIndex < activeCampaign.levelIds.length) {
                  setCurrentLevelIndex(nextIndex);
                  setActiveSitemapScreen(null);
                } else {
                  // Campaign complete!
                  setActiveSitemapScreen({
                    id: 'campaign-complete',
                    title: "Campaign Complete!",
                    content: "You have conquered all levels in this campaign. You are a true Dungeon Master.",
                    type: "success"
                  });
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        className="hidden" 
        accept=".json"
      />
      </div>
      </div>
    </ErrorBoundary>
  );
}
