import { updatePet } from './pet.js';
import { getCurrentDialogNpc } from './npc.js';

// 生き物系(ペット + 葉揺れ)の毎フレーム更新。main.js の animate から呼ばれる。
// NPC(人型)は静止させる方針なのでアニメ対象外。

export function updateLivings(furnitureList, dt, t, room) {
  const talkingNpc = getCurrentDialogNpc(); // 喋ってるペット/NPCはAIを停止
  for (const obj of furnitureList) {
    if (obj.userData?.isPet) {
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
