import * as THREE from 'three';
import { IS_TOUCH } from './mobileControls.js';

// NPCに話しかけたときの吹き出し管理。
// DOMオーバーレイ方式: 3Dの頭上ワールド座標を毎フレーム画面座標へ射影して div を貼る。

const activeBubbles = new Map(); // npcObject → { element, hideAt }
const tmpVec = new THREE.Vector3();

function createBubbleElement(text) {
  const el = document.createElement('div');
  el.className = 'npc-bubble';
  el.style.cssText = [
    'position:absolute',
    'transform:translate(-50%,-100%)',
    'background:#ffffff',
    'color:#1a1a1a',
    'padding:10px 14px',
    'border-radius:10px',
    'border:2px solid #2a2a2a',
    'font-family:"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3",Meiryo,sans-serif',
    'font-size:13px',
    'line-height:1.4',
    'max-width:240px',
    'min-width:80px',
    'pointer-events:none',
    'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
    'white-space:pre-wrap',
    'word-break:break-word',
    'z-index:20',
  ].join(';');
  el.textContent = text;
  // 吹き出しの尻尾(下向き三角)
  const arrow = document.createElement('div');
  arrow.style.cssText = [
    'position:absolute',
    'left:50%',
    'bottom:-10px',
    'transform:translateX(-50%)',
    'width:0',
    'height:0',
    'border-left:9px solid transparent',
    'border-right:9px solid transparent',
    'border-top:10px solid #2a2a2a',
  ].join(';');
  const arrowInner = document.createElement('div');
  arrowInner.style.cssText = [
    'position:absolute',
    'left:50%',
    'bottom:-6px',
    'transform:translateX(-50%)',
    'width:0',
    'height:0',
    'border-left:7px solid transparent',
    'border-right:7px solid transparent',
    'border-top:8px solid #ffffff',
  ].join(';');
  el.appendChild(arrow);
  el.appendChild(arrowInner);
  return el;
}

function pickDialogueText(npc) {
  const d = npc.userData.dialogue;
  if (Array.isArray(d) && d.length > 0) {
    // ランダムに選ぶ。連続で同じセリフにならないよう直前のインデックスを避ける
    const lastIdx = npc.userData.lastDialogueIndex ?? -1;
    let idx;
    if (d.length > 1) {
      do {
        idx = Math.floor(Math.random() * d.length);
      } while (idx === lastIdx);
    } else {
      idx = 0;
    }
    npc.userData.lastDialogueIndex = idx;
    return d[idx];
  }
  if (typeof d === 'string') return d;
  return 'こんにちは！';
}

// 配列をシャッフルした新しい配列を返す(Fisher–Yates)
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// NPCをクリックしたときの吹き出し表示
export function showNpcSpeech(npc, containerEl, duration = 4500) {
  const text = pickDialogueText(npc);
  // 既存のバブルを消して入れ替え
  const existing = activeBubbles.get(npc);
  if (existing) existing.element.remove();
  const el = createBubbleElement(text);
  containerEl.appendChild(el);
  activeBubbles.set(npc, {
    element: el,
    hideAt: performance.now() + duration,
  });
}

// animate ループから毎フレーム呼び出し: 各吹き出しの画面位置を更新
export function updateBubbles(camera, containerEl) {
  if (activeBubbles.size === 0) return;
  const now = performance.now();
  const rect = containerEl.getBoundingClientRect();
  for (const [npc, state] of activeBubbles) {
    if (now > state.hideAt) {
      state.element.remove();
      activeBubbles.delete(npc);
      continue;
    }
    // 頭上(身長+少し上)のワールド座標。ペットは低めに
    npc.getWorldPosition(tmpVec);
    if (npc.userData?.isPet) {
      tmpVec.y += npc.userData.petKind === 'dog' ? 0.70 : 0.50;
    } else {
      tmpVec.y += 1.95;
    }
    tmpVec.project(camera);
    // カメラの後ろ、または裏側にあるなら隠す
    if (tmpVec.z > 1) {
      state.element.style.display = 'none';
      continue;
    }
    state.element.style.display = 'block';
    const x = (tmpVec.x * 0.5 + 0.5) * rect.width;
    const y = (-tmpVec.y * 0.5 + 0.5) * rect.height;
    state.element.style.left = `${x}px`;
    state.element.style.top = `${y}px`;
  }
}

export function clearAllBubbles() {
  for (const state of activeBubbles.values()) state.element.remove();
  activeBubbles.clear();
}

// ---- ビジュアルノベル風ダイアログ (一人称視点でNPCをクリックしたとき) -----
let vnState = null; // { npc, lines, index, wrap }

function createVnBox() {
  const wrap = document.createElement('div');
  // モバイルは下にジョイスティックがあるので、ダイアログは画面上部に出す。
  const positionStyle = IS_TOUCH ? 'top:8%' : 'bottom:5%';
  wrap.style.cssText = [
    'position:absolute',
    'left:50%',
    positionStyle,
    'transform:translateX(-50%)',
    'width:min(82%,820px)',
    'pointer-events:none',
    'z-index:30',
    'font-family:"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3",Meiryo,sans-serif',
    'user-select:none',
  ].join(';');
  // 名前ラベル (ピンクグラデ)
  const nameEl = document.createElement('div');
  nameEl.style.cssText = [
    'display:inline-block',
    'background:linear-gradient(90deg,#e84a78 0%,#d0386a 100%)',
    'color:#fff',
    'padding:6px 22px 6px 18px',
    'border-radius:6px 6px 0 0',
    'font-size:14px',
    'font-weight:700',
    'margin-left:24px',
    'letter-spacing:0.04em',
    'box-shadow:0 2px 4px rgba(0,0,0,0.2)',
  ].join(';');
  // テキストボックス (白ラウンド)
  const textEl = document.createElement('div');
  textEl.style.cssText = [
    'background:rgba(255,255,255,0.97)',
    'color:#1a1a1a',
    'padding:18px 26px 22px',
    'border-radius:0 12px 12px 12px',
    'border:2px solid #cccccc',
    'font-size:17px',
    'line-height:1.7',
    'box-shadow:0 8px 24px rgba(0,0,0,0.4)',
    'min-height:70px',
    'white-space:pre-wrap',
  ].join(';');
  // 「次へ」インジケータ(右下の▼ 点滅)
  const nextIcon = document.createElement('div');
  nextIcon.textContent = '▼';
  nextIcon.style.cssText = [
    'position:absolute',
    'right:18px',
    'bottom:10px',
    'color:#e84a78',
    'font-size:14px',
    'animation:vnBlink 1s infinite',
  ].join(';');
  textEl.style.position = 'relative';
  textEl.appendChild(nextIcon);
  wrap.appendChild(nameEl);
  wrap.appendChild(textEl);
  // Blinkアニメ(styleタグを1度だけ挿入)
  if (!document.getElementById('vn-style')) {
    const st = document.createElement('style');
    st.id = 'vn-style';
    st.textContent = '@keyframes vnBlink{0%,100%{opacity:.25}50%{opacity:1}}';
    document.head.appendChild(st);
  }
  return { wrap, nameEl, textEl };
}

// NPCをカメラ方向に向かせる
function faceNpcToCamera(npc, camera) {
  const dx = camera.position.x - npc.position.x;
  const dz = camera.position.z - npc.position.z;
  // +Z 方向が「顔の前」なので、カメラへの向きに atan2(x,z) で回す
  npc.rotation.y = Math.atan2(dx, dz);
}

export function startNpcDialog(npc, containerEl, camera) {
  closeNpcDialog();
  faceNpcToCamera(npc, camera);
  const { wrap, nameEl, textEl } = createVnBox();
  containerEl.appendChild(wrap);
  // ダイアログ開始時にセリフの順番をシャッフル(NPCごとに毎回違う順で始まる)
  const baseLines = Array.isArray(npc.userData.dialogue) && npc.userData.dialogue.length > 0
    ? npc.userData.dialogue
    : ['こんにちは！'];
  const lines = shuffleArray(baseLines);
  nameEl.textContent = npc.userData.npcName || 'NPC';
  textEl.firstChild.nodeType === Node.TEXT_NODE
    ? (textEl.firstChild.nodeValue = lines[0])
    : (textEl.insertBefore(document.createTextNode(lines[0]), textEl.firstChild));
  vnState = { npc, lines, index: 0, wrap, nameEl, textEl };
}

// ダイアログがアクティブなら次行、なければfalseを返す
export function advanceNpcDialog() {
  if (!vnState) return false;
  vnState.index++;
  if (vnState.index >= vnState.lines.length) {
    closeNpcDialog();
    return false;
  }
  // 本文テキストノードを更新(▼インジケータは保持)
  const textEl = vnState.textEl;
  // 先頭のテキストノードを差し替え
  if (textEl.firstChild && textEl.firstChild.nodeType === Node.TEXT_NODE) {
    textEl.firstChild.nodeValue = vnState.lines[vnState.index];
  } else {
    textEl.insertBefore(document.createTextNode(vnState.lines[vnState.index]), textEl.firstChild);
  }
  return true;
}

export function closeNpcDialog() {
  if (!vnState) return;
  vnState.wrap.remove();
  vnState = null;
}

export function isNpcDialogActive() {
  return vnState !== null;
}

// 現在喋らせているNPCオブジェクトを返す(なければnull)
export function getCurrentDialogNpc() {
  return vnState ? vnState.npc : null;
}
