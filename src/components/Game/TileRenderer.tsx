import React from 'react';
import { Rect, Line, Circle, Group, Text, Ellipse, Stage, Layer } from 'react-konva';
import { TileData, TileType, GameMode } from '../../types';
import { TILE_LIBRARY } from '../../constants';
import { getTileBounds } from '../../lib/gameUtils';

export const TileRenderer = ({ 
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
      case 'void':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Rect width={drawSize} height={drawSize} fill="#000000" />
            <Circle 
              x={drawCenter} 
              y={drawCenter} 
              radius={drawSize/2.5} 
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={drawSize/2}
              fillRadialGradientColorStops={[0, '#000000', 0.8, '#1e293b', 1, '#334155']}
              opacity={0.8}
            />
            <Text 
              text="VOID" 
              fontSize={6} 
              fill="#ef4444" 
              x={2} 
              y={2} 
              fontStyle="bold"
              opacity={0.5}
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
      case 'artefact-runner':
        return (
          <Group x={drawOffset} y={drawOffset}>
            {/* Wings */}
            <Ellipse x={drawCenter - 6} y={drawCenter} radiusX={8} radiusY={4} fill="#06b6d4" rotation={-30} opacity={0.6} />
            <Ellipse x={drawCenter + 6} y={drawCenter} radiusX={8} radiusY={4} fill="#06b6d4" rotation={30} opacity={0.6} />
            <Circle x={drawCenter} y={drawCenter} radius={4} fill="#22d3ee" />
          </Group>
        );
      case 'artefact-jumper':
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Line points={[drawCenter, drawCenter - 10, drawCenter, drawCenter + 10]} stroke="#fbbf24" strokeWidth={4} />
            <Line points={[drawCenter - 6, drawCenter - 4, drawCenter, drawCenter - 10, drawCenter + 6, drawCenter - 4]} stroke="#fbbf24" strokeWidth={2} />
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
        const glowPulse = 10 + Math.sin(tick * 0.2) * 5;
        const opacityPulse = 0.7 + Math.sin(tick * 0.2) * 0.3;
        return (
          <Group x={drawOffset} y={drawOffset}>
            <Circle 
              x={drawCenter} 
              y={drawCenter} 
              radius={drawSize/4} 
              fill="#fef08a" 
              shadowBlur={glowPulse} 
              shadowColor="#fef08a" 
              opacity={opacityPulse}
            />
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

export const TileIcon = ({ type, rotation, color }: { type: TileType, rotation: number, color: string }) => {
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
