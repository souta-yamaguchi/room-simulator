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

function smoothStep(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function updateOjoyoGame(group, dt, furnitureList, ctx) {
  const s = group.userData.ojoyo;
  if (!s || !s.isShuffling) return;
  s.animPhase = Math.min(1, s.animPhase + dt / OJOYO_DURATION);
  const p = s.animPhase;

  // Y リフト：序盤に上昇、中盤キープ、終盤に着地
  let lift;
  if (p < 0.15) lift = (p / 0.15) * OJOYO_LIFT;
  else if (p < 0.85) lift = OJOYO_LIFT;
  else lift = (1 - (p - 0.85) / 0.15) * OJOYO_LIFT;

  for (let k = 0; k < s.cards.length; k++) {
    const card = s.cards[k];
    const baseY = card.userData.baseY ?? card.position.y;

    // X 位置: from → 0 (集合) → 中央でホールド → to (散開)
    let x;
    if (p < OJOYO_GATHER_END) {
      // 集合フェーズ
      const t = smoothStep(p / OJOYO_GATHER_END);
      x = s.fromXs[k] * (1 - t);
    } else if (p < OJOYO_HOLD_END) {
      // 中央でホールド
      x = 0;
    } else {
      // 散開フェーズ
      const t = smoothStep((p - OJOYO_HOLD_END) / (1 - OJOYO_HOLD_END));
      x = s.toXs[k] * t;
    }
    card.position.x = x;

    // 中央集合時の Z 微オフセット（重ね順を分けて z-fight 回避 + 山積み感）
    let zOff = 0;
    let yStack = 0;
    if (p >= OJOYO_GATHER_END * 0.5 && p <= OJOYO_HOLD_END + (1 - OJOYO_HOLD_END) * 0.4) {
      // 中央付近にいる時間帯はカードごとに微妙にずらす
      let factor;
      if (p < OJOYO_GATHER_END) {
        factor = (p - OJOYO_GATHER_END * 0.5) / (OJOYO_GATHER_END * 0.5);
      } else if (p < OJOYO_HOLD_END) {
        factor = 1;
      } else {
        factor = 1 - (p - OJOYO_HOLD_END) / ((1 - OJOYO_HOLD_END) * 0.4);
      }
      factor = Math.max(0, Math.min(1, factor));
      zOff = (k - 1) * 0.015 * factor;
      yStack = k * 0.005 * factor;
    }
    card.position.z = zOff;
    card.position.y = baseY + lift + yStack;

    // 回転: 中央で各カード違う方向にぐるぐる、最後は0に戻る
    let spin;
    if (p < OJOYO_GATHER_END) {
      // 集合中に少しずつ回し始める
      spin = (p / OJOYO_GATHER_END) * Math.PI * 0.6 * (k % 2 === 0 ? 1 : -1);
    } else if (p < OJOYO_HOLD_END) {
      // 中央で回転を増やす
      const t = (p - OJOYO_GATHER_END) / (OJOYO_HOLD_END - OJOYO_GATHER_END);
      const base = Math.PI * 0.6 * (k % 2 === 0 ? 1 : -1);
      spin = base + t * Math.PI * 2 * (k % 2 === 0 ? 1 : -1) + k * 0.25;
    } else {
      // 散開中に 0 へ戻す
      const t = (p - OJOYO_HOLD_END) / (1 - OJOYO_HOLD_END);
      const peak = Math.PI * 0.6 * (k % 2 === 0 ? 1 : -1)
                 + Math.PI * 2 * (k % 2 === 0 ? 1 : -1)
                 + k * 0.25;
      spin = peak * (1 - t);
    }
    card.rotation.y = spin;
  }

  if (p >= 1) {
    // アニメ完了: 状態を確定
    s.isShuffling = false;
    s.cardChars = s.nextChars.slice();
    // 念のため最終位置に揃える
    for (let k = 0; k < s.cards.length; k++) {
      s.cards[k].position.x = s.toXs[k];
      s.cards[k].position.y = s.cards[k].userData.baseY;
      s.cards[k].position.z = 0;
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
