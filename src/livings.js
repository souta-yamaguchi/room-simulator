import { updatePet } from './pet.js';
import { getCurrentDialogNpc } from './npc.js';

// 生き物系(ペット + 葉揺れ)の毎フレーム更新。main.js の animate から呼ばれる。
// NPC(人型)は静止させる方針なのでアニメ対象外。

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function updateLivings(furnitureList, dt, t, room) {
  const talkingNpc = getCurrentDialogNpc(); // 喋ってるペット/NPCはAIを停止
  const now = performance.now();
  for (const obj of furnitureList) {
    if (obj.userData?.isPet) {
      // 「オヨヨクリア召喚」: 足元へ走ってくるアニメーション (障害物無視)
      const summon = obj.userData.summoning;
      if (summon) {
        const elapsed = now - summon.startMs;
        const progress = Math.min(1, elapsed / summon.durationMs);
        const eased = easeInOut(progress);
        const prevX = obj.position.x;
        const prevZ = obj.position.z;
        obj.position.x = summon.fromX + (summon.toX - summon.fromX) * eased;
        obj.position.z = summon.fromZ + (summon.toZ - summon.fromZ) * eased;
        // 進行方向を向く
        const dx = obj.position.x - prevX;
        const dz = obj.position.z - prevZ;
        if (Math.hypot(dx, dz) > 1e-4) {
          obj.rotation.y = Math.atan2(dx, dz);
        }
        if (progress >= 1) {
          // 到着 → カメラの方を向かせて summoning フラグを外す
          const fdx = summon.camX - obj.position.x;
          const fdz = summon.camZ - obj.position.z;
          obj.rotation.y = Math.atan2(fdx, fdz);
          delete obj.userData.summoning;
        }
        continue;
      }
      // 「オヨヨクリア召喚」後の停止期間: 動きを止め、障害物解消もスキップ
      const celebrateUntil = obj.userData.celebrating;
      if (celebrateUntil && celebrateUntil > now) continue;
      // 喋ってる最中は歩行・動作を止める(話しかけてる間は動かない)
      if (obj !== talkingNpc) {
        updatePet(obj, dt, t, room, furnitureList);
      }
    }
    // 葉揺れ: 観葉植物の子メッシュで isLeaf フラグのもの
    if (obj.userData?.furnitureType === 'plant') {
      obj.traverse((child) => {
        if (!child.userData?.isLeaf) return;
        const bp = child.userData.basePose;
        if (!bp) return;
        child.rotation.z = bp.rotZ + Math.sin(t * bp.freq + bp.phase) * bp.ampZ;
        child.rotation.y = bp.rotY + Math.sin(t * bp.freq * 0.7 + bp.phase * 1.3) * bp.ampY;
      });
    }
  }
}
