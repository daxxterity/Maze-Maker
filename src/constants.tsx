import { 
  Shield, 
  Compass, 
  Ghost, 
  Footprints, 
  ArrowUp, 
  Wind 
} from "lucide-react";
import { TileType } from "./types";

export interface TileDefinition {
  type: TileType;
  label: string;
  category: 'corridor' | 'items' | 'quad' | 'power-up' | 'monster' | 'artefact';
  size: number;
  width?: number;
  height?: number;
  color: string;
  description: string;
}

export const TILE_LIBRARY: TileDefinition[] = [
  // Corridors
  { type: 'corridor', label: 'Straight', category: 'corridor', size: 1, color: '#4b5563', description: 'Standard corridor' },
  { type: 'corridor-x2', label: 'Straight x2', category: 'corridor', size: 1, width: 2, height: 1, color: '#4b5563', description: '2 tiles long corridor' },
  { type: 'corridor-x5', label: 'Straight x5', category: 'corridor', size: 1, width: 5, height: 1, color: '#4b5563', description: '5 tiles long corridor' },
  { type: 'corridor-diag', label: 'Diagonal', category: 'corridor', size: 1, color: '#4b5563', description: '45 degree corridor' },
  { type: 'corner', label: 'Corner', category: 'corridor', size: 1, color: '#4b5563', description: '90 degree turn' },
  { type: 't-junction', label: 'T-Junction', category: 'corridor', size: 1, color: '#4b5563', description: 'Three-way intersection' },
  { type: 'open-floor', label: 'Open Floor', category: 'corridor', size: 1, color: '#6b7280', description: 'No walls' },
  { type: 'open-floor-x5', label: 'Open Floor x5', category: 'corridor', size: 1, width: 5, height: 5, color: '#6b7280', description: '5x5 open floor' },
  { type: 'one-side', label: 'One Wall', category: 'corridor', size: 1, color: '#4b5563', description: 'Single wall tile' },
  { type: 'cul-de-sac', label: 'Cul-de-sac', category: 'corridor', size: 1, color: '#4b5563', description: 'Dead end' },
  
  // Items
  { type: 'entrance', label: 'Entrance', category: 'items', size: 1, color: '#10b981', description: 'Starting point' },
  { type: 'lava', label: 'Lava', category: 'items', size: 1, color: '#ef4444', description: 'Dangerous terrain' },
  { type: 'spike-pit', label: 'Spike Pit', category: 'items', size: 1, color: '#94a3b8', description: 'Dangerous spikes' },
  { type: 'water', label: 'Water', category: 'items', size: 1, color: '#3b82f6', description: 'Impassable terrain' },
  { type: 'bridge', label: 'Bridge', category: 'items', size: 1, color: '#92400e', description: 'Cross over water/lava' },
  { type: 'column', label: 'Column', category: 'items', size: 1, color: '#1f2937', description: 'Solid obstacle' },
  { type: 'tree-single', label: 'Tree (S)', category: 'items', size: 1, color: '#065f46', description: 'Single tile tree' },
  { type: 'door', label: 'Door', category: 'items', size: 1, color: '#d97706', description: 'Passable barrier' },
  { type: 'rotating-wall', label: 'Rot. Wall', category: 'items', size: 1, color: '#6366f1', description: 'Moves on trigger' },
  { type: 'obstacle-half-w', label: 'Swerve', category: 'items', size: 1, color: '#f59e0b', description: 'Half-width obstacle' },
  { type: 'obstacle-above', label: 'Slide', category: 'items', size: 1, color: '#f59e0b', description: 'Obstacle above' },
  { type: 'portal', label: 'Portal', category: 'items', size: 1, color: '#a855f7', description: 'Teleport between portals' },
  { type: 'exit', label: 'Exit', category: 'items', size: 1, color: '#7dd3fc', description: 'Reach to win' },
  { type: 'message', label: 'Message', category: 'items', size: 1, color: '#fcd34d', description: 'Displays a message' },
  { type: 'void', label: 'Void', category: 'items', size: 1, color: '#000000', description: 'Deadly bottomless pit' },
  { type: 'web', label: 'Web', category: 'items', size: 1, color: '#ffffff', description: 'Sticky spider web' },
  { type: 'stairs-up', label: 'Stairs Up', category: 'items', size: 1, color: '#92400e', description: 'Go to floor above' },
  { type: 'stairs-down', label: 'Stairs Down', category: 'items', size: 1, color: '#78350f', description: 'Go to floor below' },
  { type: 'hole', label: 'Hole', category: 'items', size: 1, color: '#000000', description: 'Fall to floor below' },

  // Artefacts
  { type: 'artefact', label: 'Artefact', category: 'artefact', size: 1, color: '#fbbf24', description: 'Collect to open exit' },
  { type: 'artefact-shield', label: 'Shield', category: 'artefact', size: 1, color: '#3b82f6', description: 'Unkillable by monsters' },
  { type: 'artefact-rod', label: 'Rod', category: 'artefact', size: 1, color: '#10b981', description: 'Points to exit' },
  { type: 'artefact-cloak', label: 'Cloak', category: 'artefact', size: 1, color: '#6366f1', description: 'Invisible to monsters' },
  { type: 'artefact-boots', label: 'Boots', category: 'artefact', size: 1, color: '#f97316', description: 'Walk on water/lava' },
  { type: 'artefact-runner', label: 'Runner', category: 'artefact', size: 1, color: '#06b6d4', description: 'Wings: Speed x2' },
  { type: 'artefact-jumper', label: 'Jumper', category: 'artefact', size: 1, color: '#fbbf24', description: 'Jump: Dist x2' },
  { type: 'key', label: 'Key', category: 'artefact', size: 1, color: '#fbbf24', description: 'Collect to open doors' },

  // Power Ups
  { type: 'mushroom', label: 'Runes', category: 'power-up', size: 1, color: '#ec4899', description: 'See clues' },
  { type: 'third-eye', label: 'Third Eye', category: 'power-up', size: 1, color: '#a855f7', description: 'Activate portals' },
  { type: 'clue', label: 'Clue', category: 'power-up', size: 1, color: '#f472b6', description: 'Hidden tip' },
  { type: 'health-potion', label: 'Potion', category: 'power-up', size: 1, color: '#22c55e', description: '+25% Health' },
  { type: 'firefly', label: 'Firefly', category: 'power-up', size: 1, color: '#fef08a', description: 'Follow light' },
  { type: 'magic-tile', label: 'Magic', category: 'power-up', size: 1, color: '#6366f1', description: 'Speed x2' },
  { type: 'lever', label: 'Lever', category: 'power-up', size: 1, color: '#94a3b8', description: 'Slow monsters' },
  { type: 'speed', label: 'Speed', category: 'power-up', size: 1, color: '#06b6d4', description: 'Speed x2' },

  // Monsters
  { type: 'orc', label: 'Orc', category: 'monster', size: 1, color: '#1e3a8a', description: 'Moves towards player' },
  { type: 'teeth', label: 'Teeth', category: 'monster', size: 1, color: '#22c55e', description: 'Small and fast' },
  { type: 'spider', label: 'Spider', category: 'monster', size: 1, color: '#000000', description: 'Black asterisk' },

  // Quad
  { type: 'patio', label: 'Patio', category: 'quad', size: 2, color: '#6b7280', description: 'Large open area' },
  { type: 'tree', label: 'Tree', category: 'quad', size: 2, color: '#065f46', description: 'Nature obstacle' },
  { type: 'rotating-wall-l', label: 'Rot. L', category: 'quad', size: 2, color: '#4338ca', description: 'L-shaped rotating wall' },
  { type: 'rotating-wall-i', label: 'Rot. I', category: 'quad', size: 2, color: '#4338ca', description: 'I-shaped rotating wall' },
  { type: 'rotating-wall-plus', label: 'Rot. +', category: 'quad', size: 2, color: '#4338ca', description: '+-shaped rotating wall' },
];

export const ARTEFACTS = [
  { id: 'artefact-shield', label: 'Shield', icon: <Shield size={24} />, desc: 'Immune to monster attacks' },
  { id: 'artefact-rod', label: 'Rod', icon: <Compass size={24} />, desc: 'Points to the exit' },
  { id: 'artefact-cloak', label: 'Cloak', icon: <Ghost size={24} />, desc: 'Invisible to monsters' },
  { id: 'artefact-boots', label: 'Boots', icon: <Footprints size={24} />, desc: 'Walk on water/lava' },
  { id: 'artefact-runner', label: 'Runner', icon: <Wind size={24} />, desc: 'Wings: Speed x2' },
  { id: 'artefact-jumper', label: 'Jumper', icon: <ArrowUp size={24} />, desc: 'Jumping Pole: Jump x2' },
];

export const DEFAULT_GRID_SIZE = 64;
export const DEFAULT_GRID_CELLS_X = 500;
export const DEFAULT_GRID_CELLS_Y = 500;
