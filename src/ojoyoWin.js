// 「オヨヨ」カードゲームのクリア演出。
// 猫と犬の吹き出しに喜びのセリフを表示する（テキストのみ、音は無し）。
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

export function triggerOjoyoWin(furnitureList, containerEl) {
  const cats = furnitureList.filter((o) => o.userData?.furnitureType === 'cat');
  const dogs = furnitureList.filter((o) => o.userData?.furnitureType === 'dog');

  for (const c of cats) {
    showCustomSpeech(c, pickRandom(CAT_LINES), containerEl, 5000);
  }
  for (const d of dogs) {
    showCustomSpeech(d, pickRandom(DOG_LINES), containerEl, 5000);
  }

  // 中央バナーで「OYOYO! クリア！」を一緒に表示
  showCenterBanner(containerEl, '🎉 オヨヨ揃った！クリア！ 🎉', 4500);
}
