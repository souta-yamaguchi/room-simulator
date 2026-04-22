// 部屋の「お遊びクリック」インタラクション機構。
// group.userData.interactive = true かつ group.userData.interactionKind をセットした
// 家具グループに対して、クリックで状態をトグルしアニメーションさせる。
//
// userData の取り扱い(クローンしてもJSON安全):
//   interactive = true
//   interactionKind = 'curtain' | 'faucet' など
//   animPhase     = 0..1 (現在のアニメ進行度)
//   animTarget    = 0..1 (目標値。クリックでトグル)
//   animSpeed     = 単位時間あたりのphase変化速度(1/sec)
//
// サブパーツ側は userData.role や userData.curtainSide などでタグ付けする。

export function toggleInteraction(group) {
  if (!group?.userData?.interactive) return;
  const current = group.userData.animTarget ?? 0;
  group.userData.animTarget = current === 0 ? 1 : 0;
  if (group.userData.animPhase == null) group.userData.animPhase = 0;
  // 蛇口系は即時ON/OFF
  if (group.userData.interactionKind === 'faucet') {
    group.userData.animPhase = group.userData.animTarget;
    applyVisual(group);
  }
}

export function updateInteractions(dt, furnitureList) {
  for (const obj of furnitureList) {
    if (!obj.userData?.interactive) continue;
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
