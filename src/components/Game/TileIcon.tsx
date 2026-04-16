import React from 'react';
import { Stage, Layer } from 'react-konva';
import { TileType, TileData } from '../../types';
import { TileRenderer } from './TileRenderer';

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
