export type TileType = 
  | 'corridor' 
  | 'corridor-x2'
  | 'corridor-x5'
  | 'corridor-diag'
  | 'corner' 
  | 't-junction' 
  | 'open-floor' 
  | 'one-side'
  | 'cul-de-sac'
  | 'entrance'
  | 'lava'
  | 'water'
  | 'bridge'
  | 'column'
  | 'door'
  | 'rotating-wall'
  | 'obstacle-half-w'
  | 'obstacle-half-h'
  | 'obstacle-above'
  | 'patio'
  | 'tree'
  | 'tree-single'
  | 'rotating-wall-l'
  | 'rotating-wall-i'
  | 'rotating-wall-plus'
  | 'trigger'
  | 'artefact'
  | 'artefact-shield'
  | 'artefact-rod'
  | 'artefact-cloak'
  | 'artefact-boots'
  | 'artefact-runner'
  | 'artefact-jumper'
  | 'exit'
  | 'portal'
  | 'mushroom'
  | 'orc'
  | 'teeth'
  | 'spider'
  | 'web'
  | 'health-potion'
  | 'firefly'
  | 'magic-tile'
  | 'lever'
  | 'third-eye'
  | 'stairs-up'
  | 'stairs-down'
  | 'hole'
  | 'clue'
  | 'spike-pit'
  | 'speed'
  | 'key'
  | 'message'
  | 'void'
  | 'open-floor-x5';

export interface TriggerData {
  id: string;
  targetId: string;
  x: number;
  y: number;
  z?: number;
}

export interface TileData {
  id: string;
  type: TileType;
  x: number; // grid x
  y: number; // grid y
  z?: number; // grid z (floor level)
  rotation: number; // 0, 90, 180, 270
  size: number; // 1x1 or 2x2
  width?: number;
  height?: number;
  isNeutralized?: boolean;
  clue?: string;
  message?: string;
}

export interface DungeonMap {
  name: string;
  tiles: TileData[];
  triggers: TriggerData[];
  gridSize: number;
  gridCellsX?: number;
  gridCellsY?: number;
  levelTimeLimit?: number;
  powerUpDuration?: number;
  darknessRadius?: number;
  purpose?: string;
  howTo?: string;
  instructions?: string;
}

export type GameMode = 'build' | 'play' | 'admin';

export interface MonsterData {
  id: string;
  type: TileType;
  x: number;
  y: number;
  z: number;
  immobilizedUntil?: number;
  distractedUntil?: number;
  nextDistractionAt?: number;
  distractionDir?: { dx: number, dy: number };
}

export interface CampaignData {
  id: string;
  name: string;
  levelIds: string[];
  sitemapId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LevelData {
  id: string;
  name: string;
  authorId?: string;
  authorEmail?: string;
  data: DungeonMap;
  createdAt?: string;
  updatedAt?: string;
}

export interface SitemapScreen {
  id: string;
  title: string;
  content: string;
  type: 'modal' | 'overlay' | 'lore' | 'success' | 'gameover';
  levelId?: string;
  nextScreenId?: string;
}

export interface SitemapData {
  id: string;
  name: string;
  screens: SitemapScreen[];
  createdAt?: string;
}
