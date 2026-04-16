import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ArrowRight,
  Share2,
  Save,
  Trophy,
  Layers,
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
  isSwerveBlocked
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
  const [sidebarTab, setSidebarTab] = useState<'library' | 'level' | 'debug' | 'help'>('library');
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLevelName, setSaveLevelName] = useState('');
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 });
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

  // Sync sidebar tabs with mode
  useEffect(() => {
    if (mode === 'play') {
      if (sidebarTab !== 'debug' && sidebarTab !== 'help') {
        setSidebarTab('help');
      }
    } else if (mode === 'build') {
      if (sidebarTab !== 'library' && sidebarTab !== 'level') {
        setSidebarTab('library');
      }
    }
  }, [mode, sidebarTab]);

  const centerDungeon = useCallback((cx?: number, cy?: number) => {
    if (containerSize.width <= 100) return;

    const targetX = cx !== undefined ? cx : gridCellsX;
    const targetY = cy !== undefined ? cy : gridCellsY;

    // Calculate the center of the grid in stage coordinates (unscaled pixels)
    const gridCenterX = (targetX * gridSize) / 2;
    const gridCenterY = (targetY * gridSize) / 2;

    // Calculate the stage position to put the grid center at the container center
    // StagePos = (ContainerCenter) - (GridCenter * Scale)
    const newX = (containerSize.width / 2) - (gridCenterX * stageScale);
    const newY = (containerSize.height / 2) - (gridCenterY * stageScale);

    if (!isNaN(newX) && !isNaN(newY)) {
      setStagePos({ x: newX, y: newY });
    }
  }, [containerSize.width, containerSize.height, gridSize, stageScale, gridCellsX, gridCellsY]);

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
      
      // Auto-center after a short delay to ensure state is updated
      setTimeout(() => centerDungeon(gx, gy), 50);
    }
  }, [levels, resetGameState, centerDungeon]);

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
    isPowerUpActive
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
    jumpBoostTime,
    hasJumper,
    selectedArtefact,
    isArtefactActive,
    speedBoostTime,
    hasRunner,
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
    isWallBlocked
  });

  // Auto-center on initial load once container size is ready
  const hasAutoCentered = useRef(false);
  useEffect(() => {
    if (containerSize.width > 100 && !hasAutoCentered.current) {
      const timer = setTimeout(() => {
        centerDungeon();
        hasAutoCentered.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [containerSize.width, centerDungeon]);

  // When entering Play mode, snap camera to player and ensure scale is reasonable
  useEffect(() => {
    if (mode === 'play' && containerSize.width > 0 && containerSize.height > 0) {
      let currentScale = stageScale;
      if (stageScale < 0.5) {
        setStageScale(1);
        currentScale = 1;
      }
      const px = playerPos.x * gridSize + gridSize / 2;
      const py = playerPos.y * gridSize + gridSize / 2;
      const targetX = (containerSize.width / 2) - (px * currentScale);
      const targetY = (containerSize.height / 2) - (py * currentScale);
      
      if (stageRef.current) {
        stageRef.current.to({
          x: targetX,
          y: targetY,
          duration: 0.5,
          easing: Konva.Easings.EaseInOut
        });
        setStagePos({ x: targetX, y: targetY });
      } else {
        setStagePos({ x: targetX, y: targetY });
      }
    }
  }, [mode]);

  // Camera Follow logic (Smooth Follow in Play mode)
  useEffect(() => {
    if (mode !== 'play' || isGameOver || isWin || isDying || containerSize.width === 0 || containerSize.height === 0) return;

    // Smoothly follow the player, keeping them centered
    const px = playerPos.x * gridSize + gridSize / 2;
    const py = playerPos.y * gridSize + gridSize / 2;

    const targetX = (containerSize.width / 2) - (px * stageScale);
    const targetY = (containerSize.height / 2) - (py * stageScale);

    if (stageRef.current) {
      // Use a shorter duration for more responsive following
      stageRef.current.to({
        x: targetX,
        y: targetY,
        duration: 0.15,
        easing: Konva.Easings.EaseInOut
      });
      // We still update state so other components (like debug) know where we are
      // but we do it without triggering a full re-render of the Stage if possible
      // Actually, setStagePos is needed for the Stage component's x/y props
      setStagePos({ x: targetX, y: targetY });
    } else {
      setStagePos({ x: targetX, y: targetY });
    }
  }, [playerPos, mode, containerSize, stageScale, gridSize, isGameOver, isWin, isDying]);

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
        <div className="flex-1 relative bg-[#09090b]">
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
              jumpBoostTime={jumpBoostTime}
              lightTime={lightTime}
              slowMonstersTime={slowMonstersTime}
              trappedTime={trappedTime}
              isWin={isWin}
              isGameOver={isGameOver}
              isDying={isDying}
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
            />





















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
