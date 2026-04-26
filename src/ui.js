import * as THREE from 'three';
import {
  FURNITURE_PRESETS,
  DESIGN_PRESETS,
  createFurniture,
  deserializeFurniture,
  serializeFurniture,
} from './furniture.js';
import { WALLPAPER_PRESETS, FLOOR_PRESETS, ROOM_SHAPES } from './room.js';
import { saveLayout, loadLayout, clearLayout } from './storage.js';
import { showNpcSpeech, startNpcDialog, advanceNpcDialog, isNpcDialogActive, closeNpcDialog, getCurrentDialogNpc } from './npc.js';
import { toggleInteraction } from './interactions.js';
import { updateWallHoles } from './wallHoles.js';

function disposeFurniture(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

// 0.6秒かけてカメラとターゲットをアニメーション移動
function animateCamera(camera, orbit, toPos, toTarget, duration = 600) {
  const fromPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const fromTarget = { x: orbit.target.x, y: orbit.target.y, z: orbit.target.z };
  const t0 = performance.now();
  function step() {
    const t = Math.min(1, (performance.now() - t0) / duration);
    // ease-in-out
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.x = fromPos.x + (toPos.x - fromPos.x) * e;
    camera.position.y = fromPos.y + (toPos.y - fromPos.y) * e;
    camera.position.z = fromPos.z + (toPos.z - fromPos.z) * e;
    orbit.target.x = fromTarget.x + (toTarget.x - fromTarget.x) * e;
    orbit.target.y = fromTarget.y + (toTarget.y - fromTarget.y) * e;
    orbit.target.z = fromTarget.z + (toTarget.z - fromTarget.z) * e;
    orbit.update();
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

function spawnPositionFor(type, room) {
  if (type === 'door' || type === 'door2' || type === 'door3') {
    return { position: [0, 0, room.depth / 2 - 0.06], rotationY: Math.PI };
  }
  if (type === 'window') {
    // 窓下端=0.9mを基本（従来デフォルトと同じ高さ）。fixedYでY位置スライダーが下げられるよう管理
    return { position: [room.width / 2 - 0.06, 0.9, 0], rotationY: -Math.PI / 2, fixedY: 0.9 };
  }
  if (type === 'passWindow') {
    // 掃き出し窓は床から立ち上げる(Y=0)。壁面に貼り付ける向きで右壁にスポーン。
    return { position: [room.width / 2 - 0.06, 0, 0], rotationY: -Math.PI / 2, fixedY: 0 };
  }
  if (type === 'wall') {
    return { position: [0, 0, 0], rotationY: Math.PI / 2 };
  }
  if (type === 'trackLight') {
    // 天井直下に配置（Yはfixed）
    return { position: [0, room.height, 0], rotationY: 0, fixedY: room.height };
  }
  if (type === 'floatShelf') {
    // 吊り下げ棚: 板の上端を床1.7mに、ワイヤーは天井まで
    const y = Math.max(0.5, Math.min(room.height - 0.3, 1.7));
    return { position: [0, y, 0], rotationY: 0, fixedY: y };
  }
  if (type === 'laptop' || type === 'monitor' || type === 'book') {
    // デスク(0.75m)の上に置く前提
    return { position: [0, 0.76, 0], rotationY: 0, fixedY: 0.76 };
  }
  if (type === 'whiteboard') {
    return { position: [0, 1.2, 0], rotationY: 0, fixedY: 1.2 };
  }
  if (type === 'aircon') {
    const y = Math.max(1.5, room.height - 0.4);
    return { position: [0, y, 0], rotationY: 0, fixedY: y };
  }
  if (type === 'lamp') {
    return { position: [0, 0.76, 0], rotationY: 0, fixedY: 0.76 };
  }
  if (type === 'curtain') {
    // 窓のそばに配置する想定。デフォルトは中央
    return { position: [0, 0, 0], rotationY: 0 };
  }
  if (type === 'painting') {
    // 壁掛け想定、高さ1.4m
    return { position: [0, 1.4, 0], rotationY: 0, fixedY: 1.4 };
  }
  if (type === 'mirror') {
    // 壁掛け想定、下端を床から40cmに置き、高さ方向に約1.28m伸びる
    return { position: [0, 0.40, 0], rotationY: 0, fixedY: 0.40 };
  }
  return { position: [0, 0, 0], rotationY: 0 };
}

// 内壁はwallpaperと連動させるため部屋の共有マテリアルに差し替える
function applyWallpaperToWall(obj, room) {
  obj.traverse((child) => {
    if (child.isMesh && child.userData.isWallBody) {
      child.material = room.wallMaterial;
    }
  });
}

export function setupUI({ scene, room, furnitureList, selector, setStatus, camera, orbit, walkMode }) {
  // --- 家具パレット
  const palette = document.getElementById('palette');
  for (const [type, preset] of Object.entries(FURNITURE_PRESETS)) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      const obj = createFurniture(type);
      const spawn = spawnPositionFor(type, room);
      obj.position.set(...spawn.position);
      obj.rotation.y = spawn.rotationY;
      if (spawn.fixedY != null) obj.userData.fixedY = spawn.fixedY;
      scene.add(obj);
      furnitureList.push(obj);
      selector.select(obj);
      setStatus(`${preset.label} を追加しました`);
    });
    palette.appendChild(btn);
  }

  // --- 構造（内壁・ドア・窓・照明など）パレット
  const designPalette = document.getElementById('design-palette');
  for (const [type, preset] of Object.entries(DESIGN_PRESETS)) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      const obj = createFurniture(type);
      if (type === 'wall') applyWallpaperToWall(obj, room);
      const spawn = spawnPositionFor(type, room);
      obj.position.set(...spawn.position);
      obj.rotation.y = spawn.rotationY;
      if (spawn.fixedY != null) obj.userData.fixedY = spawn.fixedY;
      scene.add(obj);
      furnitureList.push(obj);
      selector.select(obj);
      // 内壁/通り抜け窓枠を追加したら穴を再計算
      if (type === 'wall' || type === 'passWindow') updateWallHoles(furnitureList);
      setStatus(`${preset.label} を追加しました`);
    });
    designPalette.appendChild(btn);
  }

  // --- 壁紙（柄パターン）パレット
  const wallpaperPalette = document.getElementById('wallpaper-palette');
  const swatchButtons = {};
  for (const [key, preset] of Object.entries(WALLPAPER_PRESETS)) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.title = preset.label;
    btn.addEventListener('click', () => {
      room.setWallpaper(key);
      for (const b of Object.values(swatchButtons)) b.classList.remove('active');
      btn.classList.add('active');
      setStatus(`壁紙を「${preset.label}」に変更`);
    });
    swatchButtons[key] = btn;
    wallpaperPalette.appendChild(btn);
  }
  // 初期選択
  swatchButtons[room.currentWallpaper]?.classList.add('active');

  // --- 床パレット
  const floorPalette = document.getElementById('floor-palette');
  const floorButtons = {};
  if (floorPalette) {
    for (const [key, preset] of Object.entries(FLOOR_PRESETS)) {
      const btn = document.createElement('button');
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        room.setFloor(key);
        for (const b of Object.values(floorButtons)) b.classList.remove('active');
        btn.classList.add('active');
        setStatus(`床を「${preset.label}」に変更`);
      });
      floorButtons[key] = btn;
      floorPalette.appendChild(btn);
    }
    floorButtons[room.currentFloor]?.classList.add('active');
  }

  // --- 壁の色カスタムピッカー（全壁一括）
  const wallColorEl = document.getElementById('wall-color');
  document.getElementById('wall-color-apply')?.addEventListener('click', () => {
    const hex = wallColorEl.value;
    // テクスチャを剥がし、純粋にピッカーの色を使う（掛け算で濁るのを防ぐ）
    room.wallMaterial.map = null;
    room.wallMaterial.color.set(hex);
    room.wallMaterial.needsUpdate = true;
    for (const b of Object.values(swatchButtons)) b.classList.remove('active');
    // 個別オーバーライドもリセット（全壁揃える意図のため）
    room.clearAllWallColorOverrides();
    rebuildWallColorPer();
    setStatus(`壁の色: ${hex}`);
  });

  // --- 壁ごとの色UI（形状変更に追従して再構築）
  const wallColorPer = document.getElementById('wall-color-per');
  const wallLabelForRect = ['奥', '右', '手前', '左']; // 長方形の時のラベル
  const wallRowMap = new Map(); // index → row element（クリックハイライト用）
  let focusedWallIndex = null;
  const highlightWallRow = (i) => {
    // 既存ハイライトをクリア
    for (const row of wallRowMap.values()) {
      row.style.outline = '';
      row.style.background = '';
    }
    const row = wallRowMap.get(i);
    if (row) {
      row.style.outline = '2px solid #e8d06a';
      row.style.background = 'rgba(232,208,106,0.08)';
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    focusedWallIndex = i;
  };
  const rebuildWallColorPer = () => {
    if (!wallColorPer) return;
    wallColorPer.innerHTML = '';
    wallRowMap.clear();
    const n = room._polygon.length;
    for (let i = 0; i < n; i++) {
      const label = (n === 4 && room.shape === 'rect') ? wallLabelForRect[i] : `壁${i + 1}`;
      const current = room.wallColorOverrides[i] || '#ebe5d8';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:6px;align-items:center;font-size:12px;padding:2px 4px;border-radius:4px;transition:outline 0.12s, background 0.12s;';
      row.innerHTML = `
        <span class="wall-label" style="min-width:32px;color:#9ab;font-weight:600;">${label}</span>
        <input type="color" value="${current}" style="width:36px;height:26px;border:1px solid #3a3f48;border-radius:4px;background:transparent;cursor:pointer;" />
        <button style="flex:1;padding:4px;background:#3a6ea5;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;">反映</button>
        <button style="padding:4px 6px;background:#555;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;" title="この壁の個別色を解除">×</button>
      `;
      const [picker, applyBtn, resetBtn] = row.querySelectorAll('input,button');
      applyBtn.addEventListener('click', () => {
        room.setWallColorForIndex(i, picker.value);
        highlightWallRow(i); // 変更の直後もハイライト継続
        setStatus(`${label}壁: ${picker.value}`);
      });
      resetBtn.addEventListener('click', () => {
        room.clearWallColorOverride(i);
        rebuildWallColorPer();
        setStatus(`${label}壁の個別色を解除`);
      });
      wallColorPer.appendChild(row);
      wallRowMap.set(i, row);
    }
    // 再構築後も、焦点が残っていればそのまま視覚化
    if (focusedWallIndex != null && focusedWallIndex < n) {
      highlightWallRow(focusedWallIndex);
    }
  };
  rebuildWallColorPer();
  // NPCをクリックしたら吹き出し表示(通常視点時)
  const canvasWrap = document.getElementById('canvas-wrap');
  selector.onNpcSelect = (npc) => {
    if (!canvasWrap) return;
    // 一人称視点中は別のVNダイアログ(walkModeの_onClickが呼ぶ)なのでここでは出さない
    if (walkMode?.enabled) return;
    showNpcSpeech(npc, canvasWrap, 4500);
  };

  // 一人称視点でNPCをクリック: ビジュアルノベル風ダイアログ + NPCがこちらを向く
  // 同じNPCを再クリック→次のセリフ / 別NPCクリック→切替 / NPC以外→終了
  if (walkMode && camera) {
    walkMode.onNpcClick = (npc) => {
      if (!canvasWrap) return;
      // 同じNPCをクリックしたなら次のセリフへ
      if (isNpcDialogActive() && getCurrentDialogNpc() === npc) {
        advanceNpcDialog();
        return;
      }
      // 別のNPC or 最初のクリック: 新規ダイアログ開始
      startNpcDialog(npc, canvasWrap, camera);
    };
    walkMode.onEmptyClick = () => {
      // NPC以外(空間 or 家具)をクリックしたら喋るのやめて吹き出しも消す
      if (isNpcDialogActive()) closeNpcDialog();
    };
    // インタラクティブ家具(カーテン/蛇口など)のクリック
    walkMode.onInteract = (group) => {
      toggleInteraction(group);
    };
    // walk終了時に残っているダイアログを閉じる
    const prevOnExit = walkMode.onExit;
    walkMode.onExit = () => {
      closeNpcDialog();
      prevOnExit?.();
    };
  }

  // 3D上の壁クリックを拾ってサイドバーの対応ラベルをハイライト
  selector.onWallClick = (i) => {
    // 部屋のデザインパネルが閉じていたら開く（見えないとハイライトの意味がないため）
    const panel = wallColorPer?.closest('details.panel');
    if (panel && !panel.open) panel.open = true;
    highlightWallRow(i);
    const n = room._polygon.length;
    const label = (n === 4 && room.shape === 'rect') ? wallLabelForRect[i] : `壁${i + 1}`;
    setStatus(`${label}壁を選択中`);
  };
  document.getElementById('wall-color-reset-all')?.addEventListener('click', () => {
    room.clearAllWallColorOverrides();
    rebuildWallColorPer();
    setStatus('すべての壁の個別色を解除');
  });

  // --- 天井色ピッカー
  const ceilingColorEl = document.getElementById('ceiling-color');
  document.getElementById('ceiling-color-apply')?.addEventListener('click', () => {
    const hex = ceilingColorEl.value;
    room.setCeilingColor(hex);
    setStatus(`天井の色: ${hex}`);
  });
  document.getElementById('ceiling-visible')?.addEventListener('change', (e) => {
    room.setCeilingVisible(e.target.checked);
    setStatus(e.target.checked ? '天井を表示' : '天井を非表示');
  });

  // --- 選択中家具の色変更
  const furnColorEl = document.getElementById('furn-color');
  document.getElementById('furn-color-apply')?.addEventListener('click', () => {
    if (!selector.selected) { setStatus('家具を選択してからどうぞ'); return; }
    const hex = furnColorEl.value;
    let count = 0;
    selector.selected.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.userData.noTint) return; // 鏡のReflector等、特殊マテリアルは保護
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          // 共有マテリアル(壁紙等)は影響を広げないためクローン
          const mNew = m.clone();
          if (mNew.color) mNew.color.set(hex);
          if (mNew.map) { mNew.map = null; mNew.needsUpdate = true; }
          child.material = mNew;
          count++;
        }
      }
    });
    // 保存/読込時に復元できるよう、色オーバーライドを記録
    selector.selected.userData.colorOverride = hex;
    setStatus(`家具の色を ${hex} に変更（${count}面）`);
    console.log('[furn-color] applied', hex, count, 'meshes');
  });

  // --- 選択中オブジェクトの寸法スライダー（幅・高さ・奥行き）
  const sizeXEl = document.getElementById('size-x');
  const sizeYEl = document.getElementById('size-y');
  const sizeZEl = document.getElementById('size-z');
  const sizeXVal = document.getElementById('size-x-val');
  const sizeYVal = document.getElementById('size-y-val');
  const sizeZVal = document.getElementById('size-z-val');
  const sizeResetBtn = document.getElementById('size-reset');
  const sizeLockBtn = document.getElementById('size-lock');
  if (sizeXEl) {
    let ratioLock = false;

    const basePresetSize = (obj) => {
      const t = obj?.userData?.furnitureType;
      if (!t) return null;
      return FURNITURE_PRESETS[t]?.size || DESIGN_PRESETS[t]?.size || null;
    };

    const posYEl = document.getElementById('pos-y');
    const posYVal = document.getElementById('pos-y-val');

    const syncSizeUI = () => {
      const sel = selector.selected;
      const base = sel ? basePresetSize(sel) : null;
      if (!sel || !base) {
        sizeXVal.textContent = '-';
        sizeYVal.textContent = '-';
        sizeZVal.textContent = '-';
        if (posYVal) posYVal.textContent = '-';
        return;
      }
      const cmX = Math.round(base[0] * sel.scale.x * 100);
      const cmY = Math.round(base[1] * sel.scale.y * 100);
      const cmZ = Math.round(base[2] * sel.scale.z * 100);
      sizeXEl.value = cmX; sizeXVal.textContent = cmX;
      sizeYEl.value = cmY; sizeYVal.textContent = cmY;
      sizeZEl.value = cmZ; sizeZVal.textContent = cmZ;
      if (posYEl && posYVal) {
        const cmPosY = Math.round(sel.position.y * 100);
        posYEl.value = cmPosY;
        posYVal.textContent = cmPosY;
      }
    };
    const origOnChange = selector.onChange;
    selector.onChange = () => {
      origOnChange?.();
      syncSizeUI();
    };

    const applyAxis = (axis, cm) => {
      const sel = selector.selected;
      if (!sel) { setStatus('家具・内壁を選択してからスライドしてください'); return; }
      const base = basePresetSize(sel);
      if (!base) return;
      const baseMeters = base[axis === 'x' ? 0 : axis === 'y' ? 1 : 2];
      const newScale = (cm / 100) / baseMeters;
      if (ratioLock) {
        const oldScale = sel.scale[axis];
        const ratio = oldScale > 0 ? newScale / oldScale : 1;
        sel.scale.x *= ratio;
        sel.scale.y *= ratio;
        sel.scale.z *= ratio;
      } else {
        sel.scale[axis] = newScale;
      }
      selector.refreshBox();
      syncSizeUI();
      const t = sel.userData?.furnitureType;
      if (t === 'wall' || t === 'passWindow') updateWallHoles(furnitureList);
    };

    sizeXEl.addEventListener('input', () => {
      const cm = parseInt(sizeXEl.value, 10);
      sizeXVal.textContent = cm;
      applyAxis('x', cm);
    });
    sizeYEl.addEventListener('input', () => {
      const cm = parseInt(sizeYEl.value, 10);
      sizeYVal.textContent = cm;
      applyAxis('y', cm);
    });
    sizeZEl.addEventListener('input', () => {
      const cm = parseInt(sizeZEl.value, 10);
      sizeZVal.textContent = cm;
      applyAxis('z', cm);
    });

    // Y位置(高さ) スライダー: 机の上(76cm)や棚の上に乗せるのに使う
    posYEl?.addEventListener('input', () => {
      const cm = parseInt(posYEl.value, 10);
      posYVal.textContent = cm;
      const sel = selector.selected;
      if (!sel) { setStatus('対象を選択してください'); return; }
      const y = cm / 100;
      sel.position.y = y;
      // fixedY を設定することで、以降の水平ドラッグでもこの高さを維持
      sel.userData.fixedY = y;
      selector.refreshBox();
    });

    sizeResetBtn?.addEventListener('click', () => {
      const sel = selector.selected;
      if (!sel) { setStatus('対象を選択してください'); return; }
      sel.scale.set(1, 1, 1);
      selector.refreshBox();
      syncSizeUI();
      setStatus('標準サイズに戻しました');
    });
    sizeLockBtn?.addEventListener('click', () => {
      ratioLock = !ratioLock;
      sizeLockBtn.textContent = ratioLock ? '🔗比率固定 ON' : '🔗比率固定 OFF';
      sizeLockBtn.style.background = ratioLock ? '#c98a3a' : '#3a6ea5';
    });
    document.getElementById('snap-right-angle')?.addEventListener('click', () => {
      if (!selector.selected) { setStatus('対象を選択してください'); return; }
      selector.snapRotationToRightAngle();
      setStatus('回転を最も近い90°にスナップしました');
    });
  }

  // --- 部屋形状セレクト
  const shapeEl = document.getElementById('room-shape');
  const notchRows = document.querySelectorAll('.notch-only');
  const rectOnlyRows = document.querySelectorAll('.rect-only');

  const updateNotchVisibility = () => {
    const usesNotch = ROOM_SHAPES[room.shape]?.usesNotch;
    for (const row of notchRows) row.style.display = usesNotch ? '' : 'none';
    // 片側広げUIは長方形だけ表示
    const isRect = room.shape === 'rect';
    for (const row of rectOnlyRows) row.style.display = isRect ? '' : 'none';
  };

  shapeEl.addEventListener('change', () => {
    room.setShape(shapeEl.value);
    updateNotchVisibility();
    for (const m of furnitureList) room.clampInside(m);
    selector.refreshBox();
    rebuildWallColorPer();
    setStatus(`部屋を「${ROOM_SHAPES[shapeEl.value]?.label}」に変更`);
  });

  // --- 部屋サイズスライダー
  const wEl = document.getElementById('room-w');
  const dEl = document.getElementById('room-d');
  const hEl = document.getElementById('room-h');
  const nwEl = document.getElementById('notch-w');
  const ndEl = document.getElementById('notch-d');
  const wVal = document.getElementById('w-val');
  const dVal = document.getElementById('d-val');
  const hVal = document.getElementById('h-val');
  const nwVal = document.getElementById('nw-val');
  const ndVal = document.getElementById('nd-val');

  // 片側広げスライダー
  const ezmEl = document.getElementById('exp-z-minus');
  const ezpEl = document.getElementById('exp-z-plus');
  const exmEl = document.getElementById('exp-x-minus');
  const expEl = document.getElementById('exp-x-plus');
  const ezmVal = document.getElementById('ezm-val');
  const ezpVal = document.getElementById('ezp-val');
  const exmVal = document.getElementById('exm-val');
  const expVal = document.getElementById('exp-val');

  const applyRoom = () => {
    const w = parseFloat(wEl.value);
    const d = parseFloat(dEl.value);
    const h = parseFloat(hEl.value);
    const nw = parseFloat(nwEl.value);
    const nd = parseFloat(ndEl.value);
    const ezm = parseFloat(ezmEl?.value || 0);
    const ezp = parseFloat(ezpEl?.value || 0);
    const exm = parseFloat(exmEl?.value || 0);
    const exp = parseFloat(expEl?.value || 0);
    wVal.textContent = w.toFixed(1);
    dVal.textContent = d.toFixed(1);
    hVal.textContent = h.toFixed(1);
    nwVal.textContent = nw.toFixed(1);
    ndVal.textContent = nd.toFixed(1);
    if (ezmVal) ezmVal.textContent = ezm.toFixed(1);
    if (ezpVal) ezpVal.textContent = ezp.toFixed(1);
    if (exmVal) exmVal.textContent = exm.toFixed(1);
    if (expVal) expVal.textContent = exp.toFixed(1);
    room.setNotch(nw, nd);
    room.wallExpand.zMinus = ezm;
    room.wallExpand.zPlus = ezp;
    room.wallExpand.xMinus = exm;
    room.wallExpand.xPlus = exp;
    room.setSize(w, d, h); // updateGeometry を呼ぶので wallExpand も反映される
    for (const m of furnitureList) room.clampInside(m);
    selector.refreshBox();
  };
  wEl.addEventListener('input', applyRoom);
  dEl.addEventListener('input', applyRoom);
  hEl.addEventListener('input', applyRoom);
  nwEl.addEventListener('input', applyRoom);
  ndEl.addEventListener('input', applyRoom);
  ezmEl?.addEventListener('input', applyRoom);
  ezpEl?.addEventListener('input', applyRoom);
  exmEl?.addEventListener('input', applyRoom);
  expEl?.addEventListener('input', applyRoom);

  updateNotchVisibility();

  // UIを room の現在値と同期させる（読み込みやプリセット後に呼ぶ）
  const syncRoomUI = () => {
    shapeEl.value = room.shape;
    wEl.value = room.width;
    dEl.value = room.depth;
    hEl.value = room.height;
    nwEl.value = room.notchW;
    ndEl.value = room.notchD;
    if (ezmEl) ezmEl.value = room.wallExpand?.zMinus ?? 0;
    if (ezpEl) ezpEl.value = room.wallExpand?.zPlus ?? 0;
    if (exmEl) exmEl.value = room.wallExpand?.xMinus ?? 0;
    if (expEl) expEl.value = room.wallExpand?.xPlus ?? 0;
    updateNotchVisibility();
    applyRoom();
    rebuildWallColorPer();
    // 天井のUIも現在値に合わせる
    const cv = document.getElementById('ceiling-visible');
    if (cv) cv.checked = room.ceiling.visible;
    const cc = document.getElementById('ceiling-color');
    if (cc) cc.value = '#' + room.ceilingMaterial.color.getHexString();
  };

  // --- 保存・読込・リセット
  document.getElementById('save-btn').addEventListener('click', () => {
    saveLayout(room, furnitureList);
    setStatus('レイアウトを保存しました');
  });

  document.getElementById('load-btn').addEventListener('click', () => {
    const data = loadLayout();
    if (!data) { setStatus('保存データがありません'); return; }
    applyLayout(data, { scene, room, furnitureList, selector, swatchButtons });
    syncRoomUI();
    setStatus('レイアウトを読み込みました');
  });

  // --- 視点切替
  if (camera && orbit) {
    document.getElementById('view-3d').addEventListener('click', () => {
      // 3Dパースペクティブに戻す
      animateCamera(camera, orbit, { x: 5, y: 4, z: 6 }, { x: 0, y: 1, z: 0 });
      orbit.maxPolarAngle = Math.PI / 2 - 0.02;
      setStatus('3D視点に切替');
    });
    document.getElementById('view-top').addEventListener('click', () => {
      // 上から見下ろす
      const roomMax = Math.max(room.width, room.depth);
      animateCamera(camera, orbit, { x: 0, y: roomMax * 1.5 + 3, z: 0.01 }, { x: 0, y: 0, z: 0 });
      orbit.maxPolarAngle = Math.PI / 2 - 0.02;
      setStatus('上から見る視点に切替（Rで家具回転）');
    });

    // 背景色ローテーション
    const backgrounds = [0x1a1a1a, 0x2a3040, 0xb8c4d9, 0xf4efe6, 0x0a0a12];
    const bgNames = ['ダーク', 'ミッドナイト', 'スカイ', 'クリーム', 'ほぼ黒'];
    let bgIdx = 0;
    document.getElementById('view-bg-toggle').addEventListener('click', () => {
      bgIdx = (bgIdx + 1) % backgrounds.length;
      scene.background = new THREE.Color(backgrounds[bgIdx]);
      setStatus(`背景: ${bgNames[bgIdx]}`);
    });

    // 一人称視点
    if (walkMode) {
      const walkBtn = document.getElementById('view-walk');
      const quickWalkBtn = document.getElementById('quick-walk-btn');
      const walkInd = document.getElementById('walk-indicator');
      const crossHair = document.getElementById('walk-crosshair');
      const enterWalk = () => {
        // 選択中の家具があると操作競合するので解除
        selector.deselect();
        walkMode.enable();
        if (walkInd) walkInd.style.display = 'block';
        if (crossHair) crossHair.style.display = 'block';
        if (quickWalkBtn) quickWalkBtn.style.display = 'none';
        // カフェBGM開始(ボタンクリックがuser gestureなのでAudioContextがresumeできる)
        walkMode.bgm?.start();
        setStatus('一人称視点: WASDで移動 / クリックでNPC / Esc で終了');
      };
      walkBtn?.addEventListener('click', enterWalk);
      quickWalkBtn?.addEventListener('click', enterWalk);
      const origOnExit = walkMode.onExit;
      walkMode.onExit = () => {
        if (walkInd) walkInd.style.display = 'none';
        if (crossHair) crossHair.style.display = 'none';
        if (quickWalkBtn) quickWalkBtn.style.display = '';
        origOnExit?.();
      };
    }
  }

  document.getElementById('preset-office').addEventListener('click', () => {
    applyPhotoPreset({ scene, room, furnitureList, selector, swatchButtons });
    syncRoomUI();
    setStatus('写真の部屋を再現しました');
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    const wallMatNoMap = room.wallMaterial && !room.wallMaterial.map;
    const wallColor = wallMatNoMap ? '#' + room.wallMaterial.color.getHexString() : null;
    const payload = {
      room: { shape: room.shape, width: room.width, depth: room.depth, height: room.height,
              notchW: room.notchW, notchD: room.notchD, wallpaper: room.currentWallpaper,
              floor: room.currentFloor, wallColor,
              wallColorOverrides: { ...room.wallColorOverrides },
              wallExpand: { ...room.wallExpand },
              ceilingColor: '#' + room.ceilingMaterial.color.getHexString(),
              ceilingVisible: room.ceiling.visible },
      // export は serializeFurniture に統一(quaternion込みで向きの精度を保つ)
      furniture: furnitureList.map(serializeFurniture),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room_layout_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setStatus('JSONファイルを書き出しました');
  });

  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      applyLayout(data, { scene, room, furnitureList, selector, swatchButtons });
      syncRoomUI();
      setStatus(`${file.name} を読み込みました`);
    } catch (err) {
      setStatus('読込エラー: ' + err.message);
    }
    e.target.value = ''; // 同じファイルを再選択可能にする
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('全ての家具・ドア・窓を削除します。よろしいですか？')) return;
    selector.deselect();
    for (const m of [...furnitureList]) {
      scene.remove(m);
      disposeFurniture(m);
    }
    furnitureList.length = 0;
    clearLayout();
    setStatus('全部消しました');
  });

  // --- 起動時復元
  // 優先順位: localStorageの保存 > バンドルされたdefault_layout.json > 空
  // default_layout.json は管理者がエクスポートしたJSONを public/ に置く想定
  (async () => {
    const existing = loadLayout();
    if (existing) {
      applyLayout(existing, { scene, room, furnitureList, selector, swatchButtons });
      syncRoomUI();
      setStatus('前回のレイアウトを復元しました');
      return;
    }
    try {
      const res = await fetch('default_layout.json', { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      applyLayout(data, { scene, room, furnitureList, selector, swatchButtons });
      syncRoomUI();
      setStatus('デフォルトのオフィスを読み込みました');
    } catch (e) {
      // default_layout.json が無い or 不正 → 空の部屋のまま起動
      console.info('No default_layout.json found, starting empty.');
    }
  })();

  return { applyRoom };
}

// 手書き間取り図の再現: 7m × 3.5m の長方形、中央にタンス、上下に仕切り壁、右壁にドア
function applyPhotoPreset({ scene, room, furnitureList, selector, swatchButtons }) {
  const H = 2.7;
  // 座標系: x=左右(-3.5〜+3.5)、z=前後(-1.75〜+1.75)、画面上=-z(奥)、画面下=+z(手前)
  const layout = {
    room: { shape: 'rect', width: 7.0, depth: 3.5, height: H, wallpaper: 'plain', floor: 'plank' },
    furniture: [
      // --- 中央のタンス（縦向きに立ち、部屋を軽く仕切る）
      // shelfサイズ [0.8, 1.8, 0.35] をそのまま、z軸方向に長く見えるよう配置
      { type: 'shelf', position: [-0.2, 0, 0], rotationY: Math.PI / 2, scale: [1.2, 1, 1] },

      // --- 上側（奥、-z側）の仕切り壁: タンスの上端から奥の壁に向かって伸びる
      // wallサイズ [3.0, 2.7, 0.1] を scale 0.5 ≒ 1.5m に
      { type: 'wall', position: [-0.2, 0, -1.05], rotationY: 0, scale: [0.47, 1, 1] },

      // --- 下側（手前、+z側）の仕切り壁: タンスの下端から手前の壁に向かって伸びる
      { type: 'wall', position: [-0.2, 0, 1.05], rotationY: 0, scale: [0.47, 1, 1] },

      // --- 右壁のドア（3m50の短辺、上寄り）
      { type: 'door', position: [3.44, 0, -1.1], rotationY: -Math.PI / 2, scale: [1, 1, 1] },

      // --- 参考家具（写真から推定: 左半分に作業スペース、右半分にリビング）
      // 左上エリア(A): デスク
      { type: 'desk',  position: [-3.0, 0, -1.3], rotationY: 0, scale: [1, 1, 1] },
      { type: 'chair', position: [-3.0, 0, -0.7], rotationY: Math.PI, scale: [1, 1, 1] },
      { type: 'monitor', position: [-3.0, 0.76, -1.45], rotationY: 0, scale: [1, 1, 1], fixedY: 0.76 },
      // 左下エリア(C): デスク
      { type: 'desk',  position: [-3.0, 0, 1.3], rotationY: Math.PI, scale: [1, 1, 1] },
      { type: 'chair', position: [-3.0, 0, 0.7], rotationY: 0, scale: [1, 1, 1] },
      { type: 'laptop', position: [-3.0, 0.76, 1.45], rotationY: Math.PI, scale: [1, 1, 1], fixedY: 0.76 },

      // 右エリア(E): リビング
      { type: 'sofa',  position: [1.8, 0, 1.2], rotationY: Math.PI, scale: [1, 1, 1] },
      { type: 'table', position: [1.8, 0, 0.2], rotationY: 0, scale: [1, 1, 1] },
      { type: 'tv',    position: [1.8, 0.5, -1.6], rotationY: 0, scale: [1, 1, 1] },
      { type: 'rug',   position: [1.8, 0, 0.5], rotationY: 0, scale: [0.9, 1, 0.9] },
      { type: 'plant', position: [3.1, 0, 1.4], rotationY: 0, scale: [1, 1, 1] },

      // 天井照明
      { type: 'trackLight', position: [-2.0, H, 0], rotationY: 0, scale: [1, 1, 1], fixedY: H },
      { type: 'trackLight', position: [ 1.5, H, 0], rotationY: 0, scale: [1, 1, 1], fixedY: H },
      // エアコン
      { type: 'aircon', position: [0, 2.3, -1.69], rotationY: 0, scale: [1, 1, 1], fixedY: 2.3 },
    ],
  };
  applyLayout(layout, { scene, room, furnitureList, selector, swatchButtons });
}

function applyLayout(data, { scene, room, furnitureList, selector, swatchButtons }) {
  selector.deselect();
  for (const m of [...furnitureList]) {
    scene.remove(m);
    disposeFurniture(m);
  }
  furnitureList.length = 0;

  if (data.room) {
    if (data.room.shape) room.shape = data.room.shape;
    if (data.room.notchW != null) room.notchW = data.room.notchW;
    if (data.room.notchD != null) room.notchD = data.room.notchD;
    if (data.room.wallExpand) {
      Object.assign(room.wallExpand, data.room.wallExpand);
    } else {
      // 旧データには wallExpand が無いので 0 にリセット
      room.wallExpand = { xMinus: 0, xPlus: 0, zMinus: 0, zPlus: 0 };
    }
    room.setSize(data.room.width, data.room.depth, data.room.height);
    if (data.room.wallpaper && WALLPAPER_PRESETS[data.room.wallpaper]) {
      room.setWallpaper(data.room.wallpaper);
      if (swatchButtons) {
        for (const b of Object.values(swatchButtons)) b.classList.remove('active');
        swatchButtons[data.room.wallpaper]?.classList.add('active');
      }
    }
    if (data.room.floor && FLOOR_PRESETS[data.room.floor]) {
      room.setFloor(data.room.floor);
    }
    // カスタム壁色が保存されていれば復元（テクスチャを剥がして単色化）
    if (data.room.wallColor) {
      room.wallMaterial.map = null;
      room.wallMaterial.color.set(data.room.wallColor);
      room.wallMaterial.needsUpdate = true;
      if (swatchButtons) {
        for (const b of Object.values(swatchButtons)) b.classList.remove('active');
      }
    }
    // 壁ごとの個別色オーバーライド
    if (data.room.wallColorOverrides) {
      room.wallColorOverrides = { ...data.room.wallColorOverrides };
      room.updateGeometry();
    }
    if (data.room.ceilingColor) room.setCeilingColor(data.room.ceilingColor);
    if (data.room.ceilingVisible === false) room.setCeilingVisible(false);
    else if (data.room.ceilingVisible === true) room.setCeilingVisible(true);
  }
  for (const f of data.furniture || []) {
    try {
      const obj = deserializeFurniture(f);
      // 内壁は通常 room.wallMaterial を共有(壁紙連動)するが、個別色オーバーライドが
      // 設定されているときは専用マテリアルを残すためここで置換しない。
      if (f.type === 'wall' && !f.colorOverride) applyWallpaperToWall(obj, room);
      scene.add(obj);
      furnitureList.push(obj);
    } catch (e) {
      console.warn('skipping unknown furniture', f, e);
    }
  }
  // 全家具配置後に内壁の穴を計算
  updateWallHoles(furnitureList);
}
