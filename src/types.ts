export type TileType = 
  | 'corridor' 
  | 'corner' 
  | 't-junction' 
  | 'open-floor' 
  | 'one-side'
  | 'cul-de-sac'
  | 'entrance'
  | 'lava'
  | 'water'
  | 'bridge'
  | 'stairs'
  | 'column'
  | 'door'
  | 'rotating-wall'
  | 'obstacle-half-w'
  | 'obstacle-half-h'
  | 'obstacle-above'
  | 'patio'
  | 'tree'
  | 'rotating-wall-l'
  | 'rotating-wall-i'
  | 'rotating-wall-plus'
  | 'tile-above'
  | 'tile-below'
  | 'trigger'
  | 'artefact'
  | 'exit'
  | 'portal'
  | 'mushroom'
  | 'orc'
  | 'teeth'
  | 'spider'
  | 'health-potion'
  | 'firefly'
  | 'magic-tile'
  | 'trampoline'
  | 'lever';

export interface TriggerData {
  id: string;
  targetId: string;
  x: number;
  y: number;
}

export interface TileData {
  id: string;
  type: TileType;
  x: number; // grid x
  y: number; // grid y
  rotation: number; // 0, 90, 180, 270
  size: 1 | 2; // 1x1 or 2x2
  isNeutralized?: boolean;
}

export interface DungeonMap {
  name: string;
  tiles: TileData[];
  triggers: TriggerData[];
  gridSize: number;
  powerUpDuration?: number;
}

export type GameMode = 'build' | 'play';
