import { TileType } from "./types";

export interface TileDefinition {
  type: TileType;
  label: string;
  category: 'corridor' | 'item' | 'quad' | 'power-up' | 'monster' | 'artefact';
  size: 1 | 2;
  color: string;
  description: string;
}

export const TILE_LIBRARY: TileDefinition[] = [
  // Corridors
  { type: 'corridor', label: 'Straight', category: 'corridor', size: 1, color: '#4b5563', description: 'Standard corridor' },
  { type: 'corner', label: 'Corner', category: 'corridor', size: 1, color: '#4b5563', description: '90 degree turn' },
  { type: 't-junction', label: 'T-Junction', category: 'corridor', size: 1, color: '#4b5563', description: 'Three-way intersection' },
  { type: 'open-floor', label: 'Open Floor', category: 'corridor', size: 1, color: '#6b7280', description: 'No walls' },
  { type: 'one-side', label: 'One Wall', category: 'corridor', size: 1, color: '#4b5563', description: 'Single wall tile' },
  { type: 'cul-de-sac', label: 'Cul-de-sac', category: 'corridor', size: 1, color: '#4b5563', description: 'Dead end' },
  
  // Items
  { type: 'entrance', label: 'Entrance', category: 'item', size: 1, color: '#10b981', description: 'Starting point' },
  { type: 'lava', label: 'Lava', category: 'item', size: 1, color: '#ef4444', description: 'Dangerous terrain' },
  { type: 'water', label: 'Water', category: 'item', size: 1, color: '#3b82f6', description: 'Impassable terrain' },
  { type: 'bridge', label: 'Bridge', category: 'item', size: 1, color: '#92400e', description: 'Cross over water/lava' },
  { type: 'stairs', label: 'Stairs', category: 'item', size: 1, color: '#78350f', description: 'Level transition' },
  { type: 'column', label: 'Column', category: 'item', size: 1, color: '#1f2937', description: 'Solid obstacle' },
  { type: 'door', label: 'Door', category: 'item', size: 1, color: '#d97706', description: 'Passable barrier' },
  { type: 'rotating-wall', label: 'Rot. Wall', category: 'item', size: 1, color: '#6366f1', description: 'Moves on trigger' },
  { type: 'obstacle-half-w', label: 'Swerve', category: 'item', size: 1, color: '#f59e0b', description: 'Half-width obstacle' },
  { type: 'obstacle-half-h', label: 'Jump', category: 'item', size: 1, color: '#f59e0b', description: 'Half-height obstacle' },
  { type: 'obstacle-above', label: 'Slide', category: 'item', size: 1, color: '#f59e0b', description: 'Obstacle above' },
  { type: 'portal', label: 'Portal', category: 'item', size: 1, color: '#a855f7', description: 'Teleport between portals' },
  { type: 'exit', label: 'Exit', category: 'item', size: 1, color: '#7dd3fc', description: 'Reach to win' },

  // Artefacts
  { type: 'artefact', label: 'Artefact', category: 'artefact', size: 1, color: '#fbbf24', description: 'Collect to open exit' },

  // Power Ups
  { type: 'mushroom', label: 'Runes', category: 'power-up', size: 1, color: '#ec4899', description: 'Reveal runes' },
  { type: 'health-potion', label: 'Potion', category: 'power-up', size: 1, color: '#22c55e', description: '+25% Health' },
  { type: 'firefly', label: 'Firefly', category: 'power-up', size: 1, color: '#fef08a', description: 'Follow light' },
  { type: 'magic-tile', label: 'Magic', category: 'power-up', size: 1, color: '#6366f1', description: 'Speed x2' },
  { type: 'trampoline', label: 'Trampolin', category: 'power-up', size: 1, color: '#f97316', description: 'Jump x2' },
  { type: 'lever', label: 'Lever', category: 'power-up', size: 1, color: '#94a3b8', description: 'Slow monsters' },

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
  { type: 'tile-above', label: 'Above', category: 'item', size: 1, color: '#d1d5db', description: 'Lighter tile' },
  { type: 'tile-below', label: 'Below', category: 'item', size: 1, color: '#374151', description: 'Darker tile' },
];
