import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Room } from './room.js';
import { Selector } from './selection.js';
import { setupUI } from './ui.js';
import { WalkMode } from './walk.js';
import { setMonitorRenderTexture } from './furniture.js';
import { updateLivings } from './livings.js';
import { updateBubbles, getCurrentDialogNpc, isNpcDialogActive } from './npc.js';
import { CafeBGM } from './bgm.js';
import { updateInteractions } from './interactions.js';
import { IS_TOUCH } from './mobileControls.js';
import { makeSkyTexture } from './textures.js';

// --- モード判定: ?admin=<ADMIN_KEY> 付きなら管理者モード、無ければ訪問者モード ---
// 本番公開時、このキーを知っている人だけが管理者UIを触れる。
// キーを変更したい場合はこの文字列を書き換えて再デプロイすること。
const ADMIN_KEY = 'oyoyo-office-admin-2026';
const urlParams = new URLSearchParams(window.location.search);
const IS_ADMIN_REQUESTED = urlParams.get('admin') === ADMIN_KEY;
// タッチデバイスでは管理者UIが事実上使えないので、自動的に訪問者扱いにする(警告は別途表示)
const IS_ADMIN = IS_ADMIN_REQUESTED && !IS_TOUCH;

const container = document.getElementById('canvas-wrap');
const statusEl = document.getElementById('status');

function setStatus(msg) {
  statusEl.textContent = msg;
  clearTimeout(setStatus._t);
  setStatus._t = setTimeout(() => (statusEl.textContent = ''), 2500);
}

const scene = new THREE.Scene();
// 空一面の背景: 窓やドア(透過するカーテン/ガラス)から外を見ると、
// 天空に浮かぶ部屋のように空が広がる。モバイルでもフル解像度で表示する。
scene.background = makeSkyTexture();

const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 200);
camera.position.set(5, 4, 6);

// パフォーマンス重視: アンチエイリアスは OFF (最近のブラウザは標準で十分滑らか)
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = false; // 室内に強い影が落ちると不自然なのでオフ
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xfff0dd, 1.1);
dir.position.set(4, 6, 3);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
dir.shadow.camera.left = -8;
dir.shadow.camera.right = 8;
dir.shadow.camera.top = 8;
dir.shadow.camera.bottom = -8;
dir.shadow.camera.near = 0.1;
dir.shadow.camera.far = 30;
dir.shadow.bias = -0.0005;
scene.add(dir);

const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.3);
scene.add(hemi);

const room = new Room(scene);

// --- モニター画面用のレンダーターゲット（部屋を上から見下ろすミニマップ）
const monitorRT = new THREE.WebGLRenderTarget(512, 288, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
});
monitorRT.texture.colorSpace = THREE.SRGBColorSpace;
setMonitorRenderTexture(monitorRT.texture);

const monitorCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 60);
// モニター用の仮想カメラを他の壁から拾わないよう、別レイヤーを使ってモニター画面自身は写さない
const MONITOR_LAYER = 1;
monitorCam.layers.enable(0);
monitorCam.layers.disable(MONITOR_LAYER); // モニター画面はこのカメラから隠す（無限再帰防止）

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1, 0);
orbit.enableDamping = true;
orbit.dampingFactor = 0.1;
orbit.maxPolarAngle = Math.PI / 2 - 0.02;
orbit.minDistance = 1;
orbit.maxDistance = 20;
orbit.update();

const furnitureList = [];

const selector = new Selector({
  scene, camera, renderer, orbitControls: orbit, room, furnitureList,
});

const cafeBgm = new CafeBGM();

const walkMode = new WalkMode({
  camera, renderer, room, orbitControls: orbit, furnitureList,
  onExit: () => {
    setStatus('一人称視点を終了しました');
    document.getElementById('walk-indicator')?.classList.remove('active');
    const walkHelp = document.getElementById('walk-help');
    if (walkHelp) walkHelp.style.display = 'none';
    cafeBgm.stop();
  },
});
// walk enable はui.jsのボタンハンドラ内で発火するので、そこでstartを呼ぶ必要がある。
// ここでは walkMode に BGM の参照を持たせておく。
walkMode.bgm = cafeBgm;

setupUI({ scene, room, furnitureList, selector, setStatus, camera, orbit, walkMode, isAdmin: IS_ADMIN });

// --- 訪問者モードではサイドバーを隠し、welcomeオーバーレイから一人称に直行
// タッチデバイスで?admin=...でアクセスされた場合、警告オーバーレイを表示
if (IS_ADMIN_REQUESTED && IS_TOUCH) {
  const warn = document.getElementById('mobile-admin-warn');
  if (warn) warn.style.display = 'block';
  document.getElementById('mobile-admin-continue')?.addEventListener('click', () => {
    if (warn) warn.style.display = 'none';
  });
}

if (!IS_ADMIN) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = 'none';
  // 訪問者モードでは右上のクイック一人称ボタンも不要(welcome画面から入場するため)
  const quickWalkBtn = document.getElementById('quick-walk-btn');
  if (quickWalkBtn) quickWalkBtn.style.display = 'none';
  // selector無効化(訪問者は家具を選択・移動できない)
  selector.readOnly = true;
  // OrbitControlsも常時無効化(3D視点やトップビュー操作を防ぐ)
  orbit.enabled = false;
  // スポーンマーカーは管理者用(訪問者からは見えないように)
  const hideSpawnMarkers = () => {
    for (const obj of furnitureList) {
      if (obj.userData?.spawnMarker) obj.visible = false;
    }
  };
  // 家具が追加されるたび(localStorage復元時など)に再チェック
  setTimeout(hideSpawnMarkers, 100);
  setTimeout(hideSpawnMarkers, 500);
  setTimeout(hideSpawnMarkers, 1500);

  // welcomeオーバーレイを挿入
  const welcome = document.createElement('div');
  welcome.id = 'visitor-welcome';
  welcome.style.cssText = [
    'position:absolute','top:0','left:0','right:0','bottom:0',
    'background:linear-gradient(135deg,#1a2a3a,#0a0a1a)',
    'display:flex','flex-direction:column','align-items:center','justify-content:center',
    'color:#fff','z-index:100',
    'font-family:"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3",Meiryo,sans-serif',
  ].join(';');
  welcome.innerHTML = `
    <h1 style="font-size:36px;margin:0 0 12px;letter-spacing:0.08em;">バーチャルオフィスへようこそ</h1>
    <p style="font-size:15px;color:#c8d4e0;margin:0 0 32px;">${IS_TOUCH ? '左下ジョイスティックで移動・画面ドラッグで視点・タップで話しかけ' : 'WASDで移動・マウスで視点・NPCに話しかけられます'}</p>
    <button id="enter-office-btn" style="font-size:18px;padding:14px 40px;background:linear-gradient(135deg,#e84a78,#d0386a);color:#fff;border:none;border-radius:8px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,0.4);letter-spacing:0.1em;">オフィスに入る</button>
    <p style="font-size:12px;color:#6a7890;margin:32px 0 0;">${IS_TOUCH ? '右上 ✕ で一旦外に出られます' : 'Escで一旦外に出られます'}</p>
  `;
  container.appendChild(welcome);

  const enterOffice = () => {
    welcome.style.display = 'none';
    walkMode.enable();
    // 初期位置の優先順位:
    // 1. 管理者が置いた spawnPoint があればそこ(矢印の向きで視線決定)
    // 2. 無ければ「出口」ドア(ドア1 = furnitureType==='door')から1.2m室内へ入った地点、室内方向を向く
    //    窓にも exitLink があるので、タイプで絞り込まないと窓前(カーテンのそば)にスポーンしてしまう
    // 3. それも無ければ walkMode のデフォルト(person または原点)
    const spawnPt = furnitureList.find(o => o.userData?.furnitureType === 'spawnPoint');
    const exitDoor = furnitureList.find(o => o.userData?.furnitureType === 'door');
    let spawnX, spawnZ, lookX, lookZ;
    if (spawnPt) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(spawnPt.quaternion);
      fwd.y = 0;
      if (fwd.lengthSq() > 1e-6) fwd.normalize();
      spawnX = spawnPt.position.x;
      spawnZ = spawnPt.position.z;
      lookX = spawnX + fwd.x * 5;
      lookZ = spawnZ + fwd.z * 5;
    } else if (exitDoor) {
      // ドア +Z 方向が「室内側」。ドアから1.2m室内に入り、さらに前方を見る
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(exitDoor.quaternion);
      fwd.y = 0;
      if (fwd.lengthSq() > 1e-6) fwd.normalize();
      const INSIDE_OFFSET = 1.2;
      spawnX = exitDoor.position.x + fwd.x * INSIDE_OFFSET;
      spawnZ = exitDoor.position.z + fwd.z * INSIDE_OFFSET;
      lookX = spawnX + fwd.x * 5;
      lookZ = spawnZ + fwd.z * 5;
    }
    if (spawnX != null) {
      camera.position.set(spawnX, 1.6, spawnZ);
      camera.lookAt(lookX, 1.6, lookZ);
    }
    // 入場直後に退出プロンプトが誤爆しないよう2秒クールダウン
    window.__setExitCooldown?.(2000);
    cafeBgm.start();
    const walkInd = document.getElementById('walk-indicator');
    const crossHair = document.getElementById('walk-crosshair');
    const walkHelp = document.getElementById('walk-help');
    if (walkInd) walkInd.style.display = 'block';
    if (crossHair) crossHair.style.display = 'block';
    // PC のみ操作ガイドを表示 (CSSで touch デバイスでは強制非表示)
    if (walkHelp && !IS_TOUCH) walkHelp.style.display = 'block';
    // モバイルUIの表示
    if (IS_TOUCH) {
      const js = document.getElementById('mobile-joystick');
      const exitBtn = document.getElementById('mobile-exit-btn');
      if (js) js.style.display = 'block';
      if (exitBtn) exitBtn.style.display = 'block';
    }
  };
  document.getElementById('enter-office-btn').addEventListener('click', enterOffice);
  // モバイル用: 退出ボタン
  document.getElementById('mobile-exit-btn')?.addEventListener('click', () => {
    if (walkMode.enabled) walkMode.disable();
  });

  // Esc等で walk mode を出たら、welcome画面を再表示して再入場可能に
  // ただし外部リンク遷移中はwelcomeのチラ見えを避けるため表示しない
  const prevOnExit = walkMode.onExit;
  walkMode.onExit = () => {
    prevOnExit?.();
    // モバイルUIを隠す
    const js = document.getElementById('mobile-joystick');
    const exitBtn = document.getElementById('mobile-exit-btn');
    if (js) js.style.display = 'none';
    if (exitBtn) exitBtn.style.display = 'none';
    if (!isNavigatingAway) welcome.style.display = 'flex';
  };
}

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + 'px';
  renderer.domElement.style.height = h + 'px';
  // モバイルも 1.5 で画質確保(端末によっては多少重くなる)
  const dprCap = 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  camera.aspect = w / h;
  // 縦長画面(スマホ縦持ち) は FOV を広めにして視野感を補う。
  // aspect < 0.8 (細長い縦) → 70°、それ以上 → 55°(PC) or タブレット相当 60°
  if (IS_TOUCH) {
    camera.fov = camera.aspect < 0.8 ? 70 : 60;
  } else {
    camera.fov = 55;
  }
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// --- 出口ドアへの近接判定 + 退出リンク処理 ---
const exitPrompt = document.getElementById('exit-prompt');
const exitPromptLabel = document.getElementById('exit-prompt-label');
const EXIT_RADIUS = 2.2;
let activeExitLink = null;
let exitCooldownUntil = 0;
const tmpExitVec = new THREE.Vector3();

// 訪問者入場時にクールダウンをセットする用の公開関数
window.__setExitCooldown = (ms) => { exitCooldownUntil = performance.now() + ms; };

const tmpCamDir = new THREE.Vector3();
const tmpCurtainVec = new THREE.Vector3();
const exitRaycaster = new THREE.Raycaster();

// --- NPC/ペットのホバーラベル ---
const hoverLabelEl = document.createElement('div');
hoverLabelEl.style.cssText = [
  'position:absolute',
  'transform:translate(-50%,-100%)',
  'background:rgba(28,28,38,0.88)',
  'color:#ffffff',
  'padding:5px 14px',
  'border-radius:6px',
  'font-size:13px',
  'font-weight:700',
  'pointer-events:none',
  'z-index:15',
  'display:none',
  'font-family:"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3",Meiryo,sans-serif',
  'white-space:nowrap',
  'box-shadow:0 3px 10px rgba(0,0,0,0.45)',
  'letter-spacing:0.04em',
  'border:1px solid rgba(255,255,255,0.15)',
].join(';');
container.appendChild(hoverLabelEl);

const hoverRaycaster = new THREE.Raycaster();
const pointerNDC = { x: 0, y: 0 };
renderer.domElement.addEventListener('mousemove', (e) => {
  if (walkMode.enabled) return; // 一人称中はクロスヘア=画面中央固定
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
});
const tmpHoverVec = new THREE.Vector3();

function updateHoverLabel() {
  // ダイアログ中はラベル重複回避
  if (isNpcDialogActive()) {
    hoverLabelEl.style.display = 'none';
    return;
  }
  const ndc = walkMode.enabled ? { x: 0, y: 0 } : pointerNDC;
  hoverRaycaster.setFromCamera(ndc, camera);
  const hits = hoverRaycaster.intersectObjects(furnitureList, true);
  // 最初に見つかる npcName 持ちオブジェクト(NPCまたはペット)を採用
  let targetNpc = null;
  for (const hit of hits) {
    let t = hit.object;
    while (t && !t.userData?.furnitureType && t.parent) t = t.parent;
    if (t?.userData?.npcName && (t.userData?.isNPC || t.userData?.isPet)) {
      targetNpc = t;
      break;
    }
  }
  if (!targetNpc) {
    hoverLabelEl.style.display = 'none';
    return;
  }
  // 頭上のワールド座標 → 画面座標
  targetNpc.getWorldPosition(tmpHoverVec);
  if (targetNpc.userData?.isPet) {
    // ペットの頭のすぐ上
    tmpHoverVec.y += targetNpc.userData?.petKind === 'dog' ? 0.60 : 0.42;
  } else {
    // 人型NPCの頭のすぐ上(座ってる場合も考慮して少し低め)
    const seated = targetNpc.userData?.furnitureType === 'middleAgedManSit' ||
                   targetNpc.userData?.furnitureType === 'youngManSit';
    tmpHoverVec.y += seated ? 1.45 : 1.78;
  }
  tmpHoverVec.project(camera);
  if (tmpHoverVec.z > 1) {
    hoverLabelEl.style.display = 'none';
    return;
  }
  const rect = container.getBoundingClientRect();
  const x = (tmpHoverVec.x * 0.5 + 0.5) * rect.width;
  const y = (-tmpHoverVec.y * 0.5 + 0.5) * rect.height;
  hoverLabelEl.textContent = targetNpc.userData.npcName;
  hoverLabelEl.style.left = `${x}px`;
  hoverLabelEl.style.top = `${y}px`;
  hoverLabelEl.style.display = 'block';
}

// 窓などカーテン越しに有効になるリンク: 近くにカーテン(phase>=0.6)があるか判定
function isCurtainOpenNear(windowPos) {
  for (const obj of furnitureList) {
    if (obj.userData?.interactionKind !== 'curtain') continue;
    const phase = obj.userData.animPhase ?? 0;
    if (phase < 0.6) continue;
    obj.getWorldPosition(tmpCurtainVec);
    const dx = tmpCurtainVec.x - windowPos.x;
    const dz = tmpCurtainVec.z - windowPos.z;
    if (dx * dx + dz * dz < 1.5 * 1.5) return true;
  }
  return false;
}
function updateExitPrompt() {
  if (!walkMode.enabled) {
    if (exitPrompt) exitPrompt.style.display = 'none';
    activeExitLink = null;
    return;
  }
  if (performance.now() < exitCooldownUntil) {
    if (exitPrompt) exitPrompt.style.display = 'none';
    activeExitLink = null;
    return;
  }

  // 画面中央のクロスヘアから raycast。最初にヒットしたオブジェクトを調べる
  exitRaycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = exitRaycaster.intersectObjects(furnitureList, true);
  let link = null;
  let label = null;
  if (hits.length > 0) {
    // 親を辿って furnitureType 持ちのグループを特定
    let target = hits[0].object;
    while (target && !target.userData?.furnitureType && target.parent) {
      target = target.parent;
    }
    const linkCandidate = target?.userData?.exitLink;
    if (linkCandidate) {
      target.getWorldPosition(tmpExitVec);
      const dx = tmpExitVec.x - camera.position.x;
      const dz = tmpExitVec.z - camera.position.z;
      const dist2 = dx * dx + dz * dz;
      if (dist2 <= EXIT_RADIUS * EXIT_RADIUS) {
        // 窓系: カーテンが開いている時だけ有効
        let allowed = true;
        if (target.userData?.requiresOpenCurtain) {
          allowed = isCurtainOpenNear(tmpExitVec);
        }
        if (allowed) {
          link = linkCandidate;
          label = target.userData?.exitLabel || '仮想オフィスを出る';
        }
      }
    }
  }

  activeExitLink = link;
  if (exitPrompt) {
    if (link) {
      if (exitPromptLabel) exitPromptLabel.textContent = label;
      exitPrompt.style.display = 'block';
    } else {
      exitPrompt.style.display = 'none';
    }
  }
}

let isNavigatingAway = false;
function triggerExitIfAvailable() {
  if (!activeExitLink) return false;
  isNavigatingAway = true;
  // body.ready を外す = CSS で opacity 0 に戻る → ページ全体が0.25秒で暗転
  document.body.classList.remove('ready');
  if (document.pointerLockElement) document.exitPointerLock();
  // 暗転待たず navigation 開始(ナビゲーション中に bfcache保存される状態は
  // 既に opacity 0 のCSSが効いている)
  window.location.href = activeExitLink;
  return true;
}

// 初回ロード & bfcache復帰時の両方で ready クラス付与 → フェードイン
window.addEventListener('pageshow', (event) => {
  isNavigatingAway = false;
  // body.ready が無ければ付ける(CSSで opacity 1 → フェードイン)
  // 初回ロード時はJS初期化完了後にこれが走るので、サイドバー表示もここで初めて発生する
  requestAnimationFrame(() => {
    document.body.classList.add('ready');
  });
  // bfcache復帰時、訪問者は welcome を再表示
  if (event.persisted && !IS_ADMIN) {
    const wel = document.getElementById('visitor-welcome');
    if (wel) wel.style.display = 'flex';
  }
});

// 喋り中のNPC/ペットをカメラ方向に向ける。座り版NPCは近くの椅子も一緒に回転。
const SEATED_TYPES = new Set(['middleAgedManSit', 'youngManSit']);
const CHAIR_TYPES = new Set(['gamingChair', 'chair']);
function findNearestChair(npc) {
  let nearest = null;
  let nearestDist = 0.8 * 0.8; // 0.8m以内で検索
  for (const obj of furnitureList) {
    if (!CHAIR_TYPES.has(obj.userData?.furnitureType)) continue;
    const dx = obj.position.x - npc.position.x;
    const dz = obj.position.z - npc.position.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < nearestDist) {
      nearestDist = d2;
      nearest = obj;
    }
  }
  return nearest;
}
function updateTalkingFacing() {
  const talking = getCurrentDialogNpc();
  if (!talking) return;
  const dx = camera.position.x - talking.position.x;
  const dz = camera.position.z - talking.position.z;
  if (dx * dx + dz * dz < 1e-4) return;
  const targetY = Math.atan2(dx, dz);
  talking.rotation.y = targetY;
  // 座っている場合、近くの椅子も同じ方向に回転
  if (SEATED_TYPES.has(talking.userData?.furnitureType)) {
    const chair = findNearestChair(talking);
    if (chair) chair.rotation.y = targetY;
  }
}

// Eキーで退出
window.addEventListener('keydown', (e) => {
  if (!walkMode.enabled) return;
  if (e.key === 'e' || e.key === 'E') {
    if (triggerExitIfAvailable()) e.preventDefault();
  }
});
// 近接中のマウスクリックでも退出(NPCクリックより優先するためキャプチャ段階で処理)
renderer.domElement.addEventListener('mousedown', () => {
  if (!walkMode.enabled) return;
  if (activeExitLink) triggerExitIfAvailable();
}, true);
// モバイル: exit-prompt 自体をタップしたときも退出を発火
exitPrompt?.addEventListener('click', () => {
  if (!walkMode.enabled) return;
  if (activeExitLink) triggerExitIfAvailable();
});
exitPrompt?.addEventListener('touchend', (e) => {
  if (!walkMode.enabled) return;
  if (activeExitLink) {
    e.preventDefault();
    triggerExitIfAvailable();
  }
});

let lastTime = performance.now();
let monitorFrameCounter = 0;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  // 一人称視点中は OrbitControls.update() を呼ばない（呼ぶとカメラ姿勢が毎フレーム上書きされる）
  if (!walkMode.enabled) orbit.update();
  selector.refreshBox();
  walkMode.update(dt);
  // 生き物系の更新(ペット歩行AI + 観葉植物の葉揺れ)
  updateLivings(furnitureList, dt, now / 1000, room);
  // NPC吹き出しを画面座標に追従させる
  updateBubbles(camera, container);
  // 出口ドアへの近接判定
  updateExitPrompt();
  // 喋り中のNPC/ペットを常にカメラ方向に向ける(移動しても追従)
  updateTalkingFacing();
  // お遊びクリック要素(カーテン/蛇口等)のアニメ進行
  updateInteractions(dt, furnitureList);
  // カーソル/クロスヘア下のNPC/ペット名を頭上に表示
  updateHoverLabel();

  // --- モニター画面用の描画: ユーザーが今見ている視点をそのまま映す（=サイトのリアルタイム映像）
  // 負荷低減のため 2 フレームに 1 回だけ更新
  monitorFrameCounter++;
  const hasMonitor = furnitureList.some(o => o.userData?.furnitureType === 'monitor');
  if (hasMonitor && monitorFrameCounter % 2 === 0) {
    // メインカメラの姿勢・FOVを複製（monitorCam側はレイヤー設定が違うので共有はできない）
    monitorCam.position.copy(camera.position);
    monitorCam.quaternion.copy(camera.quaternion);
    monitorCam.fov = camera.fov;
    monitorCam.near = camera.near;
    monitorCam.far = camera.far;
    monitorCam.updateProjectionMatrix();
    // モニター画面メッシュを一時的に除外レイヤーに（無限再帰防止）
    const monitorScreens = [];
    scene.traverse((obj) => {
      if (obj.userData?.isMonitorScreen) {
        monitorScreens.push(obj);
        obj.layers.set(MONITOR_LAYER);
      }
    });
    const prevRT = renderer.getRenderTarget();
    renderer.setRenderTarget(monitorRT);
    renderer.clear();
    renderer.render(scene, monitorCam);
    renderer.setRenderTarget(prevRT);
    for (const m of monitorScreens) m.layers.set(0);
  }

  renderer.render(scene, camera);
}
animate();
