import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group, Text, Ellipse } from 'react-konva';
import Konva from 'konva';
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
  Heart,
  Timer,
  ArrowRight,
  Share2,
  Save,
  Trophy,
  Layers,
  FolderOpen,
  Library as LibraryIcon
} from 'lucide-react';
import { cn } from './lib/utils';
import { TileType, TileData, GameMode, DungeonMap, TriggerData, CampaignData, LevelData, SitemapData, SitemapScreen, MonsterData } from './types';
import { TILE_LIBRARY, TileDefinition, ARTEFACTS, DEFAULT_GRID_SIZE, DEFAULT_GRID_CELLS_X, DEFAULT_GRID_CELLS_Y } from './constants';
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
import { 
  sanitizeFirestoreData, 
  getTileBounds, 
  getTileLocalCoords,
  isWallBlocked,
  isSwerveBlocked,
  getLevelBounds
} from './lib/gameUtils';
import { useUser } from './contexts/UserContext';
import { useDungeonData } from './contexts/DungeonDataContext';
import { useMonsterLogic } from './hooks/useMonsterLogic';
import { usePlayerMovement } from './hooks/usePlayerMovement';
import { saveLevel as saveLevelToFirebase } from './services/firebaseService';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { BuildModal } from './components/Layout/BuildModal';
import { PlayerHUD } from './components/HUD/PlayerHUD';
import { MoonTimer } from './components/HUD/MoonTimer';
import { TileRenderer } from './components/Game/TileRenderer';
import { TileIcon } from './components/Game/TileIcon';
import { GameView } from './components/Game/GameView';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { SitemapOverlay } from './components/HUD/SitemapOverlay';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Components ---

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
  const [sidebarTab, setSidebarTab] = useState<'library' | 'level' | 'help'>('library');
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
  const [hasRunner, setHasRunner] = useState(false);
  const [hasJumper, setHasJumper] = useState(false);
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
  const [bumpEffect, setBumpEffect] = useState<{ x: number, y: number, tick: number } | null>(null);
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
  const [isFalling, setIsFalling] = useState(false);
  const [fallingProgress, setFallingProgress] = useState(1);
  const [showDebug, setShowDebug] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [isModalCollapsed, setIsModalCollapsed] = useState(false);
  const [modalPos, setModalPos] = useState({ x: 24, y: 24 });
  const [tick, setTick] = useState(0);
  const [textEditModal, setTextEditModal] = useState<{
    isOpen: boolean;
    tileId: string | null;
    text: string;
    type: 'message' | 'clue';
    mode: 'edit' | 'view';
    autoCloseAt?: number | null;
  }>({ isOpen: false, tileId: null, text: '', type: 'message', mode: 'view', autoCloseAt: null });

  // Auto-close messages after 6 seconds in play mode
  useEffect(() => {
    if (textEditModal.isOpen && textEditModal.autoCloseAt && mode === 'play') {
      const timer = setInterval(() => {
        if (Date.now() >= (textEditModal.autoCloseAt || 0)) {
          setTextEditModal(prev => ({ ...prev, isOpen: false, autoCloseAt: null }));
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [textEditModal.isOpen, textEditModal.autoCloseAt, mode]);
  const [showLevelMgmtModal, setShowLevelMgmtModal] = useState(false);
  const [cameraMode, setCameraMode] = useState<'follow' | 'screen'>('screen');

  // Viewport Insets for Screen Mode (Zelda-style camera)
  const viewportInsets = useMemo(() => ({
    top: 80,
    right: 48,
    bottom: 80,
    left: sidebarOpen ? sidebarWidth : 24
  }), [sidebarOpen, sidebarWidth]);

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

  // Alphabetical sorting for level lists
  const sortedLevels = useMemo(() => {
    return [...levels].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [levels]);

  const sortedUserLevels = useMemo(() => {
    return [...userLevels].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [userLevels]);

  // --- Campaign & Admin State ---
  const [activeCampaign, setActiveCampaign] = useState<CampaignData | null>(null);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [sitemap, setSitemap] = useState<SitemapData | null>(null);
  const [activeSitemapScreen, setActiveSitemapScreen] = useState<SitemapScreen | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adminTab, setAdminTab] = useState<'campaigns' | 'levels' | 'sitemaps'>('campaigns');
  const [playTime, setPlayTime] = useState(0);
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
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
  const [spawnProtectionTime, setSpawnProtectionTime] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLevelName, setSaveLevelName] = useState('');
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [containerSize, setContainerSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1000, 
    height: typeof window !== 'undefined' ? window.innerHeight : 800 
  });
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
  }, [isAuthLoading, isDataLoading]);

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
    if (e.evt) e.evt.preventDefault();
    else if (e.preventDefault) e.preventDefault();
    
    const scaleBy = 1.1;
    let oldScale, pointer, stageX, stageY;

    if (e.target && typeof e.target.getStage === 'function') {
      const stage = e.target.getStage();
      oldScale = stage.scaleX();
      pointer = stage.getPointerPosition();
      if (!pointer) return;
      stageX = stage.x();
      stageY = stage.y();
    } else {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      oldScale = stageScale;
      pointer = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      stageX = stagePos.x;
      stageY = stagePos.y;
    }

    const mousePointTo = {
      x: (pointer.x - stageX) / oldScale,
      y: (pointer.y - stageY) / oldScale,
    };

    const deltaY = e.evt ? e.evt.deltaY : e.deltaY;
    const newScale = deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
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
    setHasRunner(false);
    setHasJumper(false);
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
    setIsDying(false);
    setIsFalling(false);
    setFallingProgress(1);
    setPlayTime(0);
    setSpawnProtectionTime(1.2); // Faster settling but still safe
    setMonsters([]);
    setPlayerAction('normal');
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

  // Sync sidebar tabs with mode
  useEffect(() => {
    if (mode === 'play') {
      if (sidebarTab !== 'help') {
        setSidebarTab('help');
      }
    } else if (mode === 'build') {
      if (sidebarTab !== 'library' && sidebarTab !== 'level') {
        setSidebarTab('library');
      }
    }
  }, [mode, sidebarTab]);

  const centerDungeon = useCallback((cx?: number, cy?: number, overrideTiles?: TileData[]) => {
    if (containerSize.width <= 100) return;

    let gridCenterX: number;
    let gridCenterY: number;

    const targetTiles = overrideTiles || tiles;

    const entrance = targetTiles.find(t => t.type === 'entrance');
    if (entrance) {
      gridCenterX = entrance.x * gridSize + gridSize / 2;
      gridCenterY = entrance.y * gridSize + gridSize / 2;
    } else if (targetTiles.length > 0) {
      const randomTile = targetTiles[Math.floor(Math.random() * targetTiles.length)];
      gridCenterX = randomTile.x * gridSize + gridSize / 2;
      gridCenterY = randomTile.y * gridSize + gridSize / 2;
    } else {
      const targetX = cx !== undefined ? cx : gridCellsX;
      const targetY = cy !== undefined ? cy : gridCellsY;
      gridCenterX = (targetX * gridSize) / 2;
      gridCenterY = (targetY * gridSize) / 2;
    }

    // Calculate the stage position to put the grid center at the container center
    // StagePos = (ContainerCenter) - (GridCenter * Scale)
    const newX = (containerSize.width / 2) - (gridCenterX * stageScale);
    const newY = (containerSize.height / 2) - (gridCenterY * stageScale);

    if (!isNaN(newX) && !isNaN(newY)) {
      setStagePos({ x: newX, y: newY });
      if (stageRef.current) {
        stageRef.current.position({ x: newX, y: newY });
      }
    }
  }, [containerSize.width, containerSize.height, gridSize, stageScale, gridCellsX, gridCellsY, tiles]);

  const loadLevel = useCallback((levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (level) {
      const gx = level.data.gridCellsX || 200;
      const gy = level.data.gridCellsY || 200;
      
      setTiles(level.data.tiles);
      setTriggers(level.data.triggers);
      setDungeonName(level.data.name);
      setPurpose(level.data.purpose || "");
      setHowTo(level.data.howTo || "");
      setInstructions(level.data.instructions || "");
      setLevelTimeLimit(level.data.levelTimeLimit || 60);
      setPowerUpDuration(level.data.powerUpDuration || 15);
      setGridCellsX(gx);
      setGridCellsY(gy);
      resetGameState(level.data.tiles);
      
      // Center immediately with provided tiles to ensure focus
      setStageScale(1);
      centerDungeon(gx, gy, level.data.tiles);
    }
  }, [levels, resetGameState, centerDungeon, setStageScale]);

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

  useEffect(() => {
    if (bumpEffect) {
      const timer = setTimeout(() => {
        setBumpEffect(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [bumpEffect]);

  useEffect(() => {
    let interval: any;
    if (isFalling) {
      interval = setInterval(() => {
        setFallingProgress(p => {
          if (p <= 0.05) {
            clearInterval(interval);
            return 0;
          }
          return p - 0.05;
        });
      }, 50);
    } else {
      setFallingProgress(1);
    }
    return () => clearInterval(interval);
  }, [isFalling]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.add('lmb');
          return next;
        });
        if (mode === 'play') setPlayerAction('slide');
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.delete('lmb');
          return next;
        });
        if (mode === 'play') setPlayerAction('normal');
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mode]);

  // --- Campaign & Admin State ---

  useEffect(() => {
    let interval: any;
    if (mode === 'play' && !isPaused) {
      interval = setInterval(() => {
        setTick(t => t + 1);
      }, 50);
    } else if (isFlashing) {
      interval = setInterval(() => {
        setTick(t => t + 1);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [mode, isPaused, isFlashing]);

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
  }, [isPowerUpActive, powerUpTimeLeft, speedBoostTime, lightTime, slowMonstersTime, mode, thirdEyeTimeLeft, isThirdEyeActive, webSlowTime, isArtefactActive, isArtefactReloading]);

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
          const blockedByObstacle = nextTiles.some(t => t.type === 'column' || t.type === 'tree' || t.type === 'obstacle-half-h' || (t.type === 'obstacle-above' && playerAction !== 'slide'));
          
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

  // --- Hooks ---
  useMonsterLogic({
    mode,
    isGameOver,
    isWin,
    isDying,
    isInitialArtefactSelection,
    isPaused,
    slowMonstersTime,
    playTime,
    setPlayTime,
    monsters,
    setMonsters,
    tiles,
    setTiles,
    playerPos,
    setPlayerPos,
    canvasWidth,
    canvasHeight,
    gridSize,
    isWallBlocked,
    hasShield,
    selectedArtefact,
    isArtefactActive,
    playerAction,
    hasCloak,
    setIsDying,
    setIsFlashing,
    setDeathCount,
    isPowerUpActive,
    spawnProtectionTime
  });

  const { movePlayer } = usePlayerMovement({
    mode,
    isGameOver,
    isWin,
    isDying,
    isInitialArtefactSelection,
    isPaused,
    playerPos,
    setPlayerPos,
    tiles,
    setTiles,
    monsters,
    setMonsters,
    gridSize,
    canvasWidth,
    canvasHeight,
    speedBoostTime,
    jumpBoostTime,
    selectedArtefact,
    isArtefactActive,
    hasRunner,
    hasJumper,
    setBumpEffect,
    tick,
    setIsFalling,
    isFalling,
    hasBoots,
    webSlowTime,
    setWebSlowTime,
    setWebPressCount,
    webPressCount,
    playTime,
    hasShield,
    setIsDying,
    setIsFlashing,
    setDeathCount,
    setHealth,
    setLastDirection,
    lastDirection,
    setPlayerAction,
    playerAction,
    isWallBlocked,
    pressedKeys,
    setPressedKeys,
    setTextEditModal,
    spawnProtectionTime
  });

  // Auto-center on initial load once container size is ready and data is loaded
  const hasAutoCentered = useRef(false);
  useEffect(() => {
    if (containerSize.width > 100 && !hasAutoCentered.current && !isDataLoading) {
      const timer = setTimeout(() => {
        centerDungeon();
        hasAutoCentered.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [containerSize.width, centerDungeon, isDataLoading]);

  // Camera & viewport tracking
  const isFirstPlayFrame = useRef(true);
  useEffect(() => {
    if (mode !== 'play') {
      isFirstPlayFrame.current = true;
      return;
    }

    if (isGameOver || isWin || isDying || containerSize.width === 0 || containerSize.height === 0) return;

    const px = playerPos.x * gridSize + gridSize / 2;
    const py = playerPos.y * gridSize + gridSize / 2;

    let targetX, targetY;

    if (cameraMode === 'follow') {
      targetX = (containerSize.width / 2) - (px * stageScale);
      targetY = (containerSize.height / 2) - (py * stageScale);
    } else {
      // Screen Mode with Insets (Zelda-style)
      const effectiveW = containerSize.width - viewportInsets.left - viewportInsets.right;
      const effectiveH = containerSize.height - viewportInsets.top - viewportInsets.bottom;
      
      const roomW = effectiveW / stageScale;
      const roomH = effectiveH / stageScale;
      
      const sX = Math.floor(px / roomW);
      const sY = Math.floor(py / roomH);
      
      targetX = (-sX * roomW * stageScale) + viewportInsets.left;
      targetY = (-sY * roomH * stageScale) + viewportInsets.top;
    }

    if (stageRef.current) {
      if (isFirstPlayFrame.current) {
        let initialScale = stageScale;
        if (stageScale > 0.6) {
          setStageScale(0.6);
          initialScale = 0.6;
        }

        let snapX, snapY;
        if (cameraMode === 'follow') {
          snapX = (containerSize.width / 2) - (px * initialScale);
          snapY = (containerSize.height / 2) - (py * initialScale);
        } else {
          // Snap with Insets
          const effectiveW = containerSize.width - viewportInsets.left - viewportInsets.right;
          const effectiveH = containerSize.height - viewportInsets.top - viewportInsets.bottom;
          const roomW = effectiveW / initialScale;
          const roomH = effectiveH / initialScale;
          const sX = Math.floor(px / roomW);
          const sY = Math.floor(py / roomH);
          snapX = (-sX * roomW * initialScale) + viewportInsets.left;
          snapY = (-sY * roomH * initialScale) + viewportInsets.top;
        }

        stageRef.current.position({ x: snapX, y: snapY });
        stageRef.current.scale({ x: initialScale, y: initialScale });
        setStagePos({ x: snapX, y: snapY });
        isFirstPlayFrame.current = false;
      } else {
        const currentX = stageRef.current.x();
        const currentY = stageRef.current.y();
        const isJumpSnap = cameraMode === 'screen' && (Math.abs(currentX - targetX) > 10 || Math.abs(currentY - targetY) > 10);
        const duration = (playerAction === 'jump' || isJumpSnap) ? 0.4 : 0.15;
        
        stageRef.current.to({
          x: targetX,
          y: targetY,
          duration: duration,
          easing: Konva.Easings.EaseInOut,
          onFinish: () => {
            setStagePos({ x: targetX, y: targetY });
          }
        });
      }
    } else {
      setStagePos({ x: targetX, y: targetY });
    }
  }, [playerPos, mode, containerSize, stageScale, gridSize, isGameOver, isWin, isDying, cameraMode, playerAction, viewportInsets]);

  // Spawn protection timer
  useEffect(() => {
    if (mode === 'play' && spawnProtectionTime > 0 && !isPaused) {
      const timer = setInterval(() => {
        setSpawnProtectionTime(prev => Math.max(0, prev - 0.1));
      }, 100);
      return () => clearInterval(timer);
    }
  }, [mode, spawnProtectionTime, isPaused]);

  // 3. Central Death & Fall Handler
  useEffect(() => {
    if ((isDying || isFalling) && mode === 'play') {
      const timer = setTimeout(() => {
        setIsDying(false);
        setIsFalling(false);
        setIsFlashing(false);
        setHealth(100);
        resetGameState();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isDying, isFalling, mode, resetGameState]);

  // Player Interaction (Items, Traps, Win condition)
  useEffect(() => {
    if (mode !== 'play' || isGameOver || isWin || isDying || isFalling || isInitialArtefactSelection || isPaused) return;

    const currentZ = playerPos.z || 0;
    const currentTiles = tiles.filter(t => {
      if ((t.z || 0) !== currentZ) return false;
      const { x, y, width, height } = getTileBounds(t);
      // Perfect grid alignment check
      const px = Math.round(playerPos.x);
      const py = Math.round(playerPos.y);
      return px >= x && px < x + width && py >= y && py < y + height;
    });

    // 1. Win Condition
    if (currentTiles.some(t => t.type === 'exit')) {
      setIsWin(true);
      return;
    }

  // 1.5 Void Check (Standing on nothing)
  // We only trigger this if NOT under spawn protection
  if (currentTiles.length === 0 && spawnProtectionTime <= 0) {
    setDeathCount(prev => prev + 1);
    setHealth(0);
    setIsFalling(true);
    return;
  }

  // 2. Traps
  const trap = currentTiles.find(t => (t.type === 'lava' || t.type === 'water' || t.type === 'spike-pit') && !t.isNeutralized);
  if (trap && spawnProtectionTime <= 0) {
    const hasBootsActive = hasBoots || (selectedArtefact === 'artefact-boots' && isArtefactActive);
    if (!hasBootsActive) {
      setDeathCount(prev => prev + 1);
      setHealth(0);
      setIsDying(true);
      setIsFlashing(true);
      return;
    }
  }

    // 3. Items & Artefacts (Pickable entries)
    const collectable = currentTiles.find(t => {
      const def = TILE_LIBRARY.find(td => td.type === t.type);
      // Clues are no longer eaten
      return def?.category === 'power-up' && t.type !== 'clue' || def?.category === 'artefact';
    });

    if (collectable) {
      const def = TILE_LIBRARY.find(td => td.type === collectable.type);
      if (def?.category === 'power-up') {
        setIsPowerUpActive(true);
        setPowerUpTimeLeft(powerUpDuration);
        
        if (collectable.type === 'magic-tile' || collectable.type === 'speed') {
          setSpeedBoostTime(powerUpDuration);
        } else if (collectable.type === 'lever') {
          setSlowMonstersTime(powerUpDuration);
        } else if (collectable.type === 'firefly') {
          setLightTime(powerUpDuration);
        } else if (collectable.type === 'health-potion') {
          setHealth(h => Math.min(100, h + 25));
        } else if (collectable.type === 'third-eye') {
          setIsThirdEyeActive(true);
          setThirdEyeTimeLeft(powerUpDuration);
        } else if (collectable.type === 'mushroom' || collectable.type === 'clue') {
          // These might show hidden clue tiles? 
          // Previous logic used them to activate isPowerUpActive which HUD uses
        }
        
        setTiles(prev => prev.filter(t => t.id !== collectable.id));
      } else if (def?.category === 'artefact') {
        setHasArtefact(true);
        setCollectedArtefactType(collectable.type);
        setShowArtefactModal(true);
        if (collectable.type === 'artefact-shield') setHasShield(true);
        if (collectable.type === 'artefact-rod') setHasRod(true);
        if (collectable.type === 'artefact-cloak') setHasCloak(true);
        if (collectable.type === 'artefact-boots') setHasBoots(true);
        if (collectable.type === 'artefact-runner') setHasRunner(true);
        if (collectable.type === 'artefact-jumper') setHasJumper(true);
        setTiles(prev => prev.filter(t => t.id !== collectable.id));
      }
    }

    // 4. Triggers (for rotating tiles)
    const trigger = triggers.find(tr => tr.x === playerPos.x && tr.y === playerPos.y && (tr.z || 0) === currentZ);
    if (trigger) {
      setTiles(prev => prev.map(t => {
        if (t.id === trigger.targetId) {
          // Only rotate if it was a rotating quad tile
          const def = TILE_LIBRARY.find(td => td.type === t.type);
          if (def?.category === 'quad' && def.type.includes('rotating')) {
            return { ...t, rotation: (t.rotation + 90) % 360 };
          }
        }
        return t;
      }));
      // Remove trigger after use? Or keep it? Previous logic kept it I believe.
      // But we should probably prevent firing it every frame if we are standing on it.
      // Let's only fire if we just entered the tile? 
      // For now let's just make it fire.
    }

    // 5. Message / Clues (Read-only interaction)
    const infoTile = currentTiles.find(t => t.type === 'message' || t.type === 'clue');
    if (infoTile && infoTile.message && mode === 'play') {
      if (!textEditModal.isOpen || textEditModal.tileId !== infoTile.id) {
        setTextEditModal({
          isOpen: true,
          tileId: infoTile.id,
          text: infoTile.message,
          type: infoTile.type as 'message' | 'clue',
          mode: 'view',
          autoCloseAt: Date.now() + 6000
        });
      }
    }

  }, [playerPos, mode, tiles, triggers, isGameOver, isWin, isDying, isInitialArtefactSelection, isPaused, hasBoots, selectedArtefact, isArtefactActive, playerAction, powerUpDuration, resetGameState, setHealth, setIsWin, setTiles, setCollectedArtefactType, setShowArtefactModal, setHasArtefact, setHasShield, setHasRod, setHasCloak, setHasBoots, setHasRunner, setHasJumper, setIsPowerUpActive, setPowerUpTimeLeft, setSpeedBoostTime, setJumpBoostTime, setLightTime, setSlowMonstersTime, setIsThirdEyeActive, setThirdEyeTimeLeft, textEditModal.isOpen, textEditModal.tileId, setTextEditModal, textEditModal.autoCloseAt]);

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

  const getEventWorldPos = (e: any) => {
    if (e.target && typeof e.target.getStage === 'function') {
      const stage = e.target.getStage();
      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return null;
      return {
        worldX: (pointerPosition.x - stage.x()) / stage.scaleX(),
        worldY: (pointerPosition.y - stage.y()) / stage.scaleY()
      };
    } else {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      return {
        worldX: (localX - stagePos.x) / stageScale,
        worldY: (localY - stagePos.y) / stageScale
      };
    }
  };

  const handleCanvasClick = (e: any) => {
    if (mode === 'play') {
      if (isGameOver || isWin || isDying || isInitialArtefactSelection || isPaused || isFalling) return;
      // Trigger a move in the last direction with slide action
      movePlayer(lastDirection.dx, lastDirection.dy, 'slide');
      return;
    }

    if (mode !== 'build') return;

    const pos = getEventWorldPos(e);
    if (!pos) return;
    const { worldX, worldY } = pos;

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
        const tileToMove = [...tiles].reverse().find(t => {
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
    if (e.evt) e.evt.preventDefault();
    else if (e.preventDefault) e.preventDefault();
    
    if (mode !== 'build') return;

    const pos = getEventWorldPos(e);
    if (!pos) return;
    const { worldX, worldY } = pos;
    
    const x = Math.floor(worldX / gridSize);
    const y = Math.floor(worldY / gridSize);

    const tileToDelete = [...tiles].reverse().find(t => {
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
      
      await saveLevelToFirebase(levelData);
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
        
        // Center the dungeon (on entrance if possible) after a short delay
        setTimeout(() => centerDungeon(), 300);
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
    
    // Reset view (scale and centering)
    setStageScale(1);
    setTimeout(() => centerDungeon(level.data.gridCellsX, level.data.gridCellsY, level.data.tiles), 300);
    
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
    
    // Center the dungeon after clearing
    setTimeout(() => centerDungeon(), 300);
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

      {/* Victory Modal */}
      <AnimatePresence>
        {isWin && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-emerald-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <Trophy size={40} className="text-emerald-500 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight uppercase">
                Dungeon Escaped
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                You have successfully navigated the depths and emerged into the light.
              </p>
              <button
                onClick={restartGame}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                PLAY AGAIN
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
                 collectedArtefactType === 'artefact-runner' ? <Wind size={40} className="text-amber-400 animate-pulse" /> :
                 <Zap size={40} className="text-amber-400 animate-pulse" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight uppercase">
                {collectedArtefactType === 'artefact-shield' ? 'Shield' :
                 collectedArtefactType === 'artefact-rod' ? 'Rod' :
                 collectedArtefactType === 'artefact-cloak' ? 'Cloak' :
                 collectedArtefactType === 'artefact-boots' ? 'Walking Boots' :
                 collectedArtefactType === 'artefact-runner' ? 'Runner' :
                 'Artefact'} Collected!
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                {collectedArtefactType === 'artefact-shield' ? 'The Aegis protects you. You are now immune to monster attacks until you escape.' :
                 collectedArtefactType === 'artefact-rod' ? 'The Divining Rod pulses. It will guide you to the exit.' :
                 collectedArtefactType === 'artefact-cloak' ? 'The Shadow Cloak drapes over you. Monsters can no longer see you.' :
                 collectedArtefactType === 'artefact-boots' ? 'The Walking Boots allow you to tread safely over lava and water.' :
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
                  resetGameState();
                  setTimeout(() => centerDungeon(), 100);
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
                  setTimeout(() => centerDungeon(), 100);
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
                className="w-10 h-10 flex items-center justify-center bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 hover:bg-amber-500/20 transition-all shadow-lg group"
                title="Level Management"
              >
                <div className="relative">
                  <FolderOpen size={20} className="fill-amber-500/20" />
                  <ArrowRight size={10} className="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full p-0.5 border border-zinc-900" />
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Settings */}
            {mode === 'play' && (
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
            )}

            {/* Help */}
            {mode === 'play' && (
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
              </div>
            )}

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

      <div 
        className={cn(
          "flex-1 flex overflow-hidden",
          mode === 'play' && "cursor-crosshair"
        )}
        onMouseDown={(e) => {
          if (mode === 'play' && e.button === 0) {
            setPressedKeys(prev => {
              const next = new Set(prev);
              next.add('lmb');
              return next;
            });
            setPlayerAction('slide');
          }
        }}
        onMouseUp={(e) => {
          if (mode === 'play' && e.button === 0) {
            setPressedKeys(prev => {
              const next = new Set(prev);
              next.delete('lmb');
              return next;
            });
            if (playerAction === 'slide') setPlayerAction('normal');
          }
        }}
      >
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
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                    <span>LMB</span> <span className="text-zinc-300 text-right">SLIDE</span>
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
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-zinc-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] text-zinc-400 font-mono">SYSTEM READY</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDebugModal(true);
            }}
            className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-amber-500 transition-all"
            title="Dungeon Console"
          >
            <Settings size={14} />
          </button>
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
                  centerDungeon();
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
        <div className="flex-1 relative bg-[#121214]">
          {/* Outer Room Dots Background (Global) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:20px_20px]" />
          
          {/* Floating Build Modal */}
          <AnimatePresence>
            {mode === 'build' && (
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
                        disabled={history.length === 0}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-wider",
                          history.length > 0 ? "bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white" : "opacity-30 cursor-not-allowed border-transparent text-zinc-600"
                        )}
                      >
                        <RotateCw size={12} className="-scale-x-100" />
                        Undo
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            ref={containerRef}
            className="absolute inset-0 overflow-hidden"
          >
            <GameView 
              containerRef={containerRef}
              stageRef={stageRef}
              containerSize={containerSize}
              mode={mode}
              stageScale={stageScale}
              stagePos={stagePos}
              setStagePos={setStagePos}
              gridSize={gridSize}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              tiles={tiles}
              monsters={monsters}
              triggers={triggers}
              playerPos={playerPos}
              health={health}
              deathCount={deathCount}
              timeLeft={timeLeft}
              levelTimeLimit={levelTimeLimit}
              dungeonName={dungeonName}
              isPowerUpActive={isPowerUpActive}
              isThirdEyeActive={isThirdEyeActive}
              powerUpTimeLeft={powerUpTimeLeft}
              powerUpDuration={powerUpDuration}
              thirdEyeTimeLeft={thirdEyeTimeLeft}
              speedBoostTime={speedBoostTime}
              lightTime={lightTime}
              slowMonstersTime={slowMonstersTime}
              trappedTime={trappedTime}
              isWin={isWin}
              isGameOver={isGameOver}
              isDying={isDying}
              isFalling={isFalling}
              fallingProgress={fallingProgress}
              isPaused={isPaused}
              hiddenTileIds={hiddenTileIds}
              currentZ={currentZ}
              tick={tick}
              pressedKeys={pressedKeys}
              activeCampaign={activeCampaign}
              sitemaps={sitemaps}
              currentLevelIndex={currentLevelIndex}
              activeSitemapScreen={activeSitemapScreen}
              isInitialArtefactSelection={isInitialArtefactSelection}
              selectedArtefact={selectedArtefact}
              isArtefactActive={isArtefactActive}
              isArtefactReloading={isArtefactReloading}
              showArtefactMenu={showArtefactMenu}
              setShowArtefactMenu={setShowArtefactMenu}
              setSelectedArtefact={setSelectedArtefact}
              setShowArtefactConfirmation={setShowArtefactConfirmation}
              restartGame={restartGame}
              handleCanvasClick={handleCanvasClick}
              handleRightClick={handleRightClick}
              handleWheel={handleWheel}
              undo={undo}
              history={history}
              showDebug={showDebug}
              setShowDebug={setShowDebug}
              buildTool={buildTool}
              selectedTileType={selectedTileType}
              movingTileId={movingTileId}
              viewportInsets={viewportInsets}
              cameraMode={cameraMode}
              isDarknessOn={isDarknessOn}
              darknessRadius={darknessRadius}
              bumpEffect={bumpEffect}
              spawnProtectionTime={spawnProtectionTime}
              playerAction={playerAction}
            />





















          </div>

        </div>
      </div>

      {/* Dungeon Debug Console (Modal Approach) */}
      <AnimatePresence>
        {showDebugModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowDebugModal(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-all transition-transform active:scale-95"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                  <Settings className="text-amber-500" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-amber-100 italic tracking-tight uppercase">System Console</h2>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Maintenance & Debugging</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Camera Mode Selection */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-[10px] font-bold uppercase text-indigo-400 tracking-widest">Camera Method</h3>
                      <p className="text-[8px] text-zinc-500">How the lens follows you</p>
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => setCameraMode('follow')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                          cameraMode === 'follow' ? "bg-indigo-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Follow
                      </button>
                      <button
                        onClick={() => setCameraMode('screen')}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                          cameraMode === 'screen' ? "bg-amber-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Screen
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                    <p className="text-[10px] text-zinc-400 italic font-serif leading-relaxed text-center">
                      {cameraMode === 'follow' 
                        ? "\"The camera stays centered on you at all times for a fluid, modern feel.\""
                        : "\"The camera stays static until you reach the screen edge, then jumps to the next room.\""
                      }
                    </p>
                  </div>
                </div>

                {/* Inspector Toggle */}
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 transition-all hover:bg-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      showDebug ? "bg-amber-500/20 text-amber-500" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Visual Inspector</h3>
                      <p className="text-[9px] text-zinc-500">Show performance data & coordinates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                      showDebug ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "bg-transparent border-white/10 text-zinc-500 hover:text-white"
                    )}
                  >
                    {showDebug ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      setHealth(100);
                      setShowDebugModal(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl hover:bg-pink-500/20 transition-all group"
                  >
                    <Heart className="text-pink-500 group-hover:scale-110 transition-transform mb-2" size={20} />
                    <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Restore Health</span>
                  </button>
                  <button 
                    onClick={() => {
                      setTimeLeft(levelTimeLimit);
                      setShowDebugModal(false);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl hover:bg-cyan-500/20 transition-all group"
                  >
                    <Timer className="text-cyan-500 group-hover:scale-110 transition-transform mb-2" size={20} />
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Reset Timer</span>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="px-12 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs rounded-2xl transition-all uppercase tracking-widest border border-white/5"
                >
                  CLOSE CONSOLE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard */}
      {mode === 'admin' && (
        <AdminDashboard 
          onClose={() => setMode('build')}
          levels={sortedLevels}
          userLevels={sortedUserLevels}
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
          <div className={cn(
            "fixed z-[250] flex p-6 transition-all duration-500",
            (mode === 'play' && textEditModal.mode === 'view') 
              ? "bottom-10 left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none" 
              : "inset-0 items-center justify-center bg-black/60 backdrop-blur-sm"
          )}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              className={cn(
                "bg-zinc-900 border rounded-2xl p-6 shadow-2xl pointer-events-auto relative",
                (mode === 'play' && textEditModal.mode === 'view') ? "max-w-lg w-auto border-2 px-8" : "max-w-sm w-full",
                textEditModal.type === 'clue' ? "border-pink-500/50" : "border-amber-500/50"
              )}
            >
              <button
                onClick={() => setTextEditModal(prev => ({ ...prev, isOpen: false }))}
                className="absolute top-2 right-2 p-2 text-zinc-400 hover:text-white transition-colors z-10"
              >
                <X size={18} />
              </button>

              <div className="flex-1 min-w-0">
                {textEditModal.mode === 'edit' ? (
                  <>
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                      Edit {textEditModal.type === 'clue' ? 'Clue' : 'Message'}
                    </h3>
                    <textarea
                      value={textEditModal.text}
                      onChange={(e) => setTextEditModal(prev => ({ ...prev, text: e.target.value }))}
                      placeholder={`Enter ${textEditModal.type === 'clue' ? 'clue' : 'message'} here...`}
                      className={cn(
                        "w-full h-24 bg-zinc-950 border rounded-xl p-3 text-white text-sm focus:outline-none transition-all resize-none mb-4",
                        textEditModal.type === 'clue' ? "border-pink-500/20 focus:border-pink-500/50" : "border-amber-500/20 focus:border-amber-500/50"
                      )}
                      autoFocus
                    />
                  </>
                ) : (
                  <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 mb-2 max-h-[250px] overflow-y-auto">
                    <p className="text-zinc-100 text-base leading-relaxed italic font-serif">
                      "{textEditModal.text || (textEditModal.type === 'clue' ? 'The clue is unreadable...' : 'The scroll is blank...')}"
                    </p>
                  </div>
                )}

                {(textEditModal.mode === 'edit' || (mode !== 'play')) && (
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
                  )}
                  
                  {mode === 'play' && textEditModal.mode === 'view' && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50">
                      <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
                      Vanishing...
                    </div>
                  )}
                </div>
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

              {/* Select Level Dropdown inside Modal - NOW AT THE TOP */}
              <div className="mb-8 p-4 bg-zinc-950/50 border border-white/5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase text-amber-500 tracking-widest">Switch Level</h3>
                  <span className="text-[8px] text-zinc-500 font-mono">{levels.length} Blueprints</span>
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
                    setShowLevelMgmtModal(false);
                  }}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white focus:border-amber-500 outline-none font-bold uppercase tracking-widest cursor-pointer hover:bg-zinc-800 transition-all shadow-inner"
                >
                  <option value="">+ Create New / Current</option>
                  {sortedLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
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
