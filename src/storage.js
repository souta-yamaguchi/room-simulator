import { serializeFurniture } from './furniture.js';

const KEY = 'room_simulator.layout.v1';

export function saveLayout(room, furnitureList) {
  // 壁材質がテクスチャ無し(色ピッカー適用済み)なら色を保存
  const wallMatNoMap = room.wallMaterial && !room.wallMaterial.map;
  const wallColor = wallMatNoMap ? '#' + room.wallMaterial.color.getHexString() : null;
  const payload = {
    room: {
      shape: room.shape,
      width: room.width,
      depth: room.depth,
      height: room.height,
      notchW: room.notchW,
      notchD: room.notchD,
      wallpaper: room.currentWallpaper,
      floor: room.currentFloor,
      wallColor,
      wallColorOverrides: { ...room.wallColorOverrides },
      ceilingColor: '#' + room.ceilingMaterial.color.getHexString(),
      ceilingVisible: room.ceiling.visible,
    },
    furniture: furnitureList.map(serializeFurniture),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function loadLayout() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearLayout() {
  localStorage.removeItem(KEY);
}
