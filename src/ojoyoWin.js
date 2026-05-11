// 「オヨヨ」カードゲームのクリア演出。
// 猫(左足元)と犬(右足元)が一人称プレイヤーの足元まで召喚され、
// 喜びのセリフを吹き出しで表示する（音は無し）。
import * as THREE from 'three';
import { showCustomSpeech } from './npc.js';

const CAT_LINES = [
  'ニャー♪ オヨヨだ〜！',
  'にゃんにゃん！やったね！',
  'にゃ〜♡ そろったね！',
  'ふみゃ〜！すごいすごい！',
];
const DOG_LINES = [
  'ワンワン！ オヨヨ揃った！',
  'わふ〜！やったあ！',
  'ワン！クリアだワン！',
  'はぐっ！すごい！すごい！',
];

const TRAVEL_MS = 1500;            // 足元へ走ってくる時間
const STAY_MS = 6000;              // 到着後その場で停止する時間
const FOOT_FWD = 0.45;             // 足元の前方オフセット
const FOOT_SIDE = 0.50;            // 左右足元の幅 (中心から両側へ)

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function showCenterBanner(containerEl, text, duration = 4000) {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:30%',
    'transform:translate(-50%,-50%)',
    'background:linear-gradient(135deg,#ffd84a 0%,#ff8a3a 100%)',
    'color:#5a1f00',
    'padding:18px 36px',
    'border-radius:14px',
    'border:4px solid #b85a00',
    'font-family:"Hiragino Kaku Gothic ProN","ヒラギノ角ゴ ProN W3",Meiryo,sans-serif',
    'font-size:30px',
    'font-weight:900',
    'box-shadow:0 12px 32px rgba(0,0,0,0.4)',
    'pointer-events:none',
    'z-index:40',
    'animation:ojoyoPop 0.4s ease-out',
  ].join(';');
  el.textContent = text;
  if (!document.getElementById('ojoyo-style')) {
    const st = document.createElement('style');
    st.id = 'ojoyo-style';
    st.textContent = '@keyframes ojoyoPop{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}60%{transform:translate(-50%,-50%) scale(1.15);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}';
    document.head.appendChild(st);
  }
  containerEl.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// プレイヤー(camera)の左右足元ワールド座標を計算
function computeFootPositions(camera) {
  const camPos = camera.position;
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
  fwd.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(fwd, up).normalize();

  const leftFoot = new THREE.Vector3().copy(camPos)
    .addScaledVector(fwd, FOOT_FWD)
    .addScaledVector(right, -FOOT_SIDE);
  const rightFoot = new THREE.Vector3().copy(camPos)
    .addScaledVector(fwd, FOOT_FWD)
    .addScaledVector(right, FOOT_SIDE);
  leftFoot.y = 0;
  rightFoot.y = 0;
  return { leftFoot, rightFoot, camPos };
}

// ペット1体に「足元まで走ってくる」アニメ状態をセットする。
// 障害物無視のスムーズ補間は livings.js 側で行う。
function summonPetToFoot(pet, foot, camPos) {
  const startMs = performance.now();
  pet.userData.summoning = {
    fromX: pet.position.x,
    fromZ: pet.position.z,
    toX: foot.x,
    toZ: foot.z,
    camX: camPos.x,
    camZ: camPos.z,
    startMs,
    durationMs: TRAVEL_MS,
  };
  // 召喚状態(障害物無視・移動停止)：走ってくる時間 + 到着後の停止時間
  pet.userData.celebrating = startMs + TRAVEL_MS + STAY_MS;
  if (pet.userData.petState) {
    pet.userData.petState.target = null;
    pet.userData.petState.modeTimer = (TRAVEL_MS + STAY_MS) / 1000;
  }
}

export function triggerOjoyoWin(furnitureList, containerEl, camera = null) {
  const cats = furnitureList.filter((o) => o.userData?.furnitureType === 'cat');
  const dogs = furnitureList.filter((o) => o.userData?.furnitureType === 'dog');

  // 一人称(camera あり) かつ ペットが居る場合は足元へ召喚
  let summoned = false;
  if (camera && (cats.length > 0 || dogs.length > 0)) {
    const { leftFoot, rightFoot, camPos } = computeFootPositions(camera);
    for (const c of cats) summonPetToFoot(c, leftFoot, camPos);
    for (const d of dogs) summonPetToFoot(d, rightFoot, camPos);
    summoned = true;
  }

  // 中央バナーは即時表示
  showCenterBanner(containerEl, '🎉 オヨヨ揃った！クリア！ 🎉', 4500);

  // 吹き出しは到着後に出す (走ってくる演出を邪魔しないため)
  const bubbleDelay = summoned ? TRAVEL_MS : 0;
  setTimeout(() => {
    for (const c of cats) {
      showCustomSpeech(c, pickRandom(CAT_LINES), containerEl, 5500);
    }
    for (const d of dogs) {
      showCustomSpeech(d, pickRandom(DOG_LINES), containerEl, 5500);
    }
  }, bubbleDelay);
}
