// 内壁(wall)に通り抜け窓枠(passWindow)が重なっているとき、
// その窓枠分だけ壁本体にビジュアルな「穴」を開ける。
// passWindow を移動・サイズ変更したら都度呼び直す。

import * as THREE from 'three';

const WALL_W = 3.0;        // 内壁ジオメトリのベース幅(m)
const WALL_H = 2.7;        // 同 高さ(m)
const WALL_D = 0.1;        // 同 奥行き(m)
const WALL_BODY_Y = 1.35;  // 内壁グループ内での body mesh の position.y

export function updateWallHoles(furnitureList) {
  if (!furnitureList) return;
  const passWindows = [];
  const walls = [];
  for (const o of furnitureList) {
    const t = o.userData?.furnitureType;
    if (t === 'passWindow') passWindows.push(o);
    else if (t === 'wall') walls.push(o);
  }
  if (walls.length === 0) return;

  // passWindow の世界AABB をキャッシュ
  const pwBoxes = [];
  for (const pw of passWindows) {
    pw.updateWorldMatrix(true, true);
    pwBoxes.push(new THREE.Box3().setFromObject(pw));
  }

  for (const wall of walls) {
    wall.updateWorldMatrix(true, true);
    const wallBox = new THREE.Box3().setFromObject(wall);

    const holes = [];
    for (const pwBox of pwBoxes) {
      // 世界AABBの交差
      const xMin = Math.max(wallBox.min.x, pwBox.min.x);
      const xMax = Math.min(wallBox.max.x, pwBox.max.x);
      const yMin = Math.max(wallBox.min.y, pwBox.min.y);
      const yMax = Math.min(wallBox.max.y, pwBox.max.y);
      const zMin = Math.max(wallBox.min.z, pwBox.min.z);
      const zMax = Math.min(wallBox.max.z, pwBox.max.z);
      if (xMax <= xMin || yMax <= yMin || zMax <= zMin) continue;

      // 交差矩形の4隅を壁ローカルへ投影し、壁ローカル X-Y の bbox を取る
      const cz = (zMin + zMax) / 2;
      const corners = [
        new THREE.Vector3(xMin, yMin, cz),
        new THREE.Vector3(xMax, yMin, cz),
        new THREE.Vector3(xMin, yMax, cz),
        new THREE.Vector3(xMax, yMax, cz),
      ];
      let lxMin = Infinity, lxMax = -Infinity, lyMin = Infinity, lyMax = -Infinity;
      for (const c of corners) {
        wall.worldToLocal(c);
        if (c.x < lxMin) lxMin = c.x;
        if (c.x > lxMax) lxMax = c.x;
        if (c.y < lyMin) lyMin = c.y;
        if (c.y > lyMax) lyMax = c.y;
      }
      // group-local Y → body mesh-local Y (mesh.position.y=1.35)
      const meshLyMin = lyMin - WALL_BODY_Y;
      const meshLyMax = lyMax - WALL_BODY_Y;

      const x1 = Math.max(-WALL_W / 2, lxMin);
      const x2 = Math.min( WALL_W / 2, lxMax);
      const y1 = Math.max(-WALL_H / 2, meshLyMin);
      const y2 = Math.min( WALL_H / 2, meshLyMax);
      if (x2 - x1 < 0.03 || y2 - y1 < 0.03) continue;
      holes.push({ x1, x2, y1, y2 });
    }

    const wallBody = wall.children.find(c => c.userData?.isWallBody);
    if (!wallBody) continue;
    // wallBody 以外の最初のメッシュ = 巾木
    const baseboard = wall.children.find(c => c !== wallBody && c.isMesh);

    // 同じ穴形状なら再構築をスキップ
    const sig = holes.map(h =>
      `${h.x1.toFixed(3)},${h.x2.toFixed(3)},${h.y1.toFixed(3)},${h.y2.toFixed(3)}`,
    ).join('|') || 'none';
    if (wall.userData._holeSig === sig) continue;
    wall.userData._holeSig = sig;

    if (holes.length === 0) {
      // 穴なし → 通常のBoxGeometryへ復元
      wallBody.geometry.dispose();
      wallBody.geometry = new THREE.BoxGeometry(WALL_W, WALL_H, WALL_D);
      if (baseboard) baseboard.visible = true;
    } else {
      // 穴あり → ShapeをExtrudeした形状へ差し替え
      const shape = new THREE.Shape();
      shape.moveTo(-WALL_W / 2, -WALL_H / 2);
      shape.lineTo( WALL_W / 2, -WALL_H / 2);
      shape.lineTo( WALL_W / 2,  WALL_H / 2);
      shape.lineTo(-WALL_W / 2,  WALL_H / 2);
      shape.closePath();
      for (const h of holes) {
        const path = new THREE.Path();
        path.moveTo(h.x1, h.y1);
        path.lineTo(h.x2, h.y1);
        path.lineTo(h.x2, h.y2);
        path.lineTo(h.x1, h.y2);
        path.closePath();
        shape.holes.push(path);
      }
      wallBody.geometry.dispose();
      const geom = new THREE.ExtrudeGeometry(shape, { depth: WALL_D, bevelEnabled: false });
      // Extrude は z=[0, D] に押し出すので中央に揃える
      geom.translate(0, 0, -WALL_D / 2);
      wallBody.geometry = geom;
      // 床まで届く穴があれば巾木は隠す(穴の根元に巾木が残ると見栄えが悪い)
      const reachesBottom = holes.some(h => h.y1 < -WALL_H / 2 + 0.10);
      if (baseboard) baseboard.visible = !reachesBottom;
    }
  }
}
