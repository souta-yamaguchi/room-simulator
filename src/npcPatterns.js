// 訪問者入室時の NPC 配置パターン管理
// 管理者モードで複数パターンを保存しておき、訪問者がオフィスに入るたびランダム選択する。
import { deserializeFurniture, serializeFurniture } from './furniture.js';

export const NPC_TYPES = ['middleAgedMan', 'middleAgedManSit', 'youngMan', 'youngManSit'];

const STORAGE_KEY = 'room_npc_patterns_v1';

export function isNpcType(type) {
  return NPC_TYPES.includes(type);
}

export function loadPatterns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePatterns(patterns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch (e) {
    console.warn('NPCパターン保存に失敗', e);
  }
}

// localStorage が空のとき default_layout.json 由来のパターンを初期化用にコピー
export function seedPatternsIfEmpty(initialPatterns) {
  if (!Array.isArray(initialPatterns) || initialPatterns.length === 0) return;
  if (loadPatterns().length > 0) return;
  savePatterns(initialPatterns);
}

export function pickRandomPattern(patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return null;
  const i = Math.floor(Math.random() * patterns.length);
  return patterns[i];
}

// 現在シーン上の NPC を抽出してパターン形式に変換
export function extractCurrentNpcsAsPattern(furnitureList, name) {
  const npcs = furnitureList
    .filter((o) => isNpcType(o.userData?.furnitureType))
    .map((o) => {
      const s = serializeFurniture(o);
      // パターンには colorOverride などは含めない（位置・向きのみ意味がある）
      return {
        type: s.type,
        position: s.position,
        rotationY: s.rotationY,
        quaternion: s.quaternion,
        scale: s.scale,
        ...(s.fixedY != null ? { fixedY: s.fixedY } : {}),
      };
    });
  return { name: name || `パターン${Date.now()}`, npcs };
}

// シーン/リスト上の NPC を全削除（dispose は呼び出し側で）
export function removeNpcsFromScene(scene, furnitureList, dispose) {
  const remaining = [];
  for (const o of furnitureList) {
    if (isNpcType(o.userData?.furnitureType)) {
      scene.remove(o);
      if (typeof dispose === 'function') dispose(o);
    } else {
      remaining.push(o);
    }
  }
  furnitureList.length = 0;
  furnitureList.push(...remaining);
}

// パターンを適用：パターン内の各 NPC をシーンに追加
export function applyNpcPattern(scene, furnitureList, pattern) {
  if (!pattern || !Array.isArray(pattern.npcs)) return;
  for (const f of pattern.npcs) {
    try {
      const obj = deserializeFurniture(f);
      scene.add(obj);
      furnitureList.push(obj);
    } catch (e) {
      console.warn('NPCパターンの一部をスキップ', f, e);
    }
  }
}
