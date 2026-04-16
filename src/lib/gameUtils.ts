import { TileData } from '../types';

export function sanitizeFirestoreData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(v => sanitizeFirestoreData(v));
  } else if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
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

export const getTileBounds = (tile: { x: number, y: number, size: number, width?: number, height?: number, rotation: number }) => {
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
export const getTileLocalCoords = (tile: { x: number, y: number, rotation: number }, worldX: number, worldY: number) => {
  const relX = worldX - tile.x;
  const relY = worldY - tile.y;
  const r = tile.rotation;
  if (r === 0) return { x: relX, y: relY };
  if (r === 90) return { x: relY, y: -relX };
  if (r === 180) return { x: -relX, y: -relY };
  if (r === 270) return { x: -relY, y: relX };
  return { x: relX, y: relY };
};

export const isWallBlocked = (tile: TileData, dir: string, px: number, py: number, isEntry: boolean = false) => {
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
        if (r === 0) return isEntry && dir === 'up';
        if (r === 90) return isEntry && dir === 'right';
        if (r === 180) return isEntry && dir === 'down';
        if (r === 270) return isEntry && dir === 'left';
        break;
    }
  }
  return false;
};

export const isSwerveBlocked = (tile: TileData, moveDir: string, isJumping: boolean, pressedKeys: Set<string>, isOrc = false) => {
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
};
