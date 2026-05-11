// 部屋の「お遊びクリック」インタラクション機構。
// group.userData.interactive = true かつ group.userData.interactionKind をセットした
// 家具グループに対して、クリックで状態をトグルしアニメーションさせる。
//
// userData の取り扱い(クローンしてもJSON安全):
//   interactive = true
//   interactionKind = 'curtain' | 'faucet' | 'ojoyoGame' など
//   animPhase     = 0..1 (現在のアニメ進行度)
//   animTarget    = 0..1 (目標値。クリックでトグル)
//   animSpeed     = 単位時間あたりのphase変化速度(1/sec)
//
// サブパーツ側は userData.role や userData.curtainSide などでタグ付けする。
import { triggerOjoyoWin } from './ojoyoWin.js';

const OJOYO_LIFT = 0.20;          // カードを持ち上げる高さ
const OJOYO_DURATION = 1.6;       // シャッフル全体の秒数
const OJOYO_GATHER_END = 0.32;    // この時点までに中央へ集合
const OJOYO_HOLD_END = 0.58;      // この時点まで中央で混ぜる
// 0.58〜1.0: 散らばって着地

function shufflePermutation() {
  const arr = [0, 1, 2];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function toggleInteraction(group) {
  if (!group?.userData?.interactive) return;

  // オヨヨカードゲーム: 別ロジック
  if (group.userData.interactionKind === 'ojoyoGame') {
    const s = group.userData.ojoyo;
    if (!s || s.isShuffling) return;
    const perm = shufflePermutation();
    // perm[i] = 「最終的に slot i に居るカード番号」
    // → card k は slot perm.indexOf(k) に移動
    const newSlotByCard = perm.map((_, i) => perm.indexOf(i)); // newSlotByCard[k] = slotIndex
    s.fromXs = s.cards.map((c) => c.position.x);
    s.toXs = s.cards.map((_, k) => s.slotXs[newSlotByCard[k]]);
    s.nextChars = perm.map((k) => s.cardChars[k]);
    s.permutation = perm;
    s.animPhase = 0;
    s.isShuffling = true;
    return;
  }

  const current = group.userData.animTarget ?? 0;
  group.userData.animTarget = current === 0 ? 1 : 0;
  if (group.userData.animPhase == null) group.userData.animPhase = 0;
  // 蛇口系は即時ON/OFF
  if (group.userData.interactionKind === 'faucet') {
    group.userData.animPhase = group.userData.animTarget;
    applyVisual(group);
  }
}

export function updateInteractions(dt, furnitureList, ctx = null) {
  for (const obj of furnitureList) {
    if (!obj.userData?.interactive) continue;

    // オヨヨカード: 別ループ
    if (obj.userData.interactionKind === 'ojoyoGame') {
      updateOjoyoGame(obj, dt, furnitureList, ctx);
      continue;
    }

    const target = obj.userData.animTarget ?? 0;
    const current = obj.userData.animPhase ?? 0;
    if (Math.abs(target - current) < 0.001) continue;
    const speed = obj.userData.animSpeed ?? 2.0;
    const dir = Math.sign(target - current);
    let next = current + dir * speed * dt;
    if ((dir > 0 && next > target) || (dir < 0 && next < target)) next = target;
    obj.userData.animPhase = next;
    applyVisual(obj);
  }
}

function updateOjoyoGame(group, dt, furnitureList, ctx) {
  const s = group.userData.ojoyo;
  if (!s || !s.isShuffling) return;
  s.animPhase = Math.min(1, s.animPhase + dt / OJOYO_DURATION);
  const p = s.animPhase;

  for (let k = 0; k < s.cards.length; k++) {
    const card = s.cards[k];
    const baseY = card.userData.baseY ?? card.position.y;
    // 持ち上げ (sin で滑らかに上下)
    const lift = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI) * OJOYO_LIFT;
    card.position.y = baseY + lift;
    // 水平移動 (0.2..0.8 の区間で fromXs → toXs)
    const tx = Math.min(1, Math.max(0, (p - 0.2) / 0.6));
    card.position.x = s.fromXs[k] + (s.toXs[k] - s.fromXs[k]) * tx;
    // ちょっとくるっと回す
    const spin = Math.sin(Math.min(1, Math.max(0, (p - 0.15) / 0.7)) * Math.PI) * 0.6;
    card.rotation.y = spin;
  }

  if (p >= 1) {
    // アニメ完了: 状態を確定
    s.isShuffling = false;
    s.cardChars = s.nextChars.slice();
    // カードの並び自体は物理移動済み (各 card は対応する slot にいる)
    // 念のため最終位置に揃える
    for (let k = 0; k < s.cards.length; k++) {
      s.cards[k].position.x = s.toXs[k];
      s.cards[k].position.y = s.cards[k].userData.baseY;
      s.cards[k].rotation.y = 0;
    }
    s.fromXs = s.cards.map((c) => c.position.x);

    // 勝敗判定: 左→右(slotXs順)の文字列が「オヨヨ」か
    const order = orderByX(s.cards);
    if (order === 'オヨヨ') {
      if (ctx?.container) {
        try { triggerOjoyoWin(furnitureList, ctx.container); }
        catch (e) { console.warn('ojoyo win effect failed', e); }
      }
    }
  }
}

function orderByX(cards) {
  const sorted = cards.slice().sort((a, b) => a.position.x - b.position.x);
  return sorted.map((c) => c.userData.char).join('');
}

function applyVisual(group) {
  const phase = group.userData.animPhase ?? 0;
  const kind = group.userData.interactionKind;
  if (kind === 'curtain') {
    // 左右のカーテンパネルを外側へスライド
    const OPEN_OFFSET = 0.45;
    group.traverse((child) => {
      if (child.userData?.curtainSide === 'left') {
        const base = child.userData.baseX ?? 0;
        child.position.x = base - phase * OPEN_OFFSET;
      } else if (child.userData?.curtainSide === 'right') {
        const base = child.userData.baseX ?? 0;
        child.position.x = base + phase * OPEN_OFFSET;
      }
    });
  } else if (kind === 'faucet') {
    group.traverse((child) => {
      if (child.userData?.role === 'water') {
        child.visible = phase > 0.5;
      }
    });
  }
}
