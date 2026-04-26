// 内壁(wall)に通り抜け窓枠(passWindow)が重なっているとき穴を開ける。
// さらに外壁(部屋の輪郭壁)にも、window と passWindow がある位置に穴を開け、
// 窓の向こう側の空(背景)が見えるようにする。

import * as THREE from 'three';

const WALL_W = 3.0;        // 内壁ジオメトリのベース幅(m)
const WALL_H = 2.7;        // 同 高さ(m)
const WALL_D = 0.1;        // 同 奥行き(m)
const WALL_BODY_Y = 1.35;  // 内壁グループ内での body mesh の position.y

// 外壁に対して穴を開ける処理。room.wallMeshes (PlaneGeometry の壁群) を ShapeGeometry に
// 置き換え、window/passWindow が重なる位置に矩形の穴を作る。
function updateOuterWallHoles(room, furnitureList) {
  if (!room?.wallMeshes) return;
  // 外壁を貫通させる「穴の素」となる開口部 = window + passWindow
  const openings = [];
  for (const o of furnitureList || []) {
    const t = o.userData?.furnitureType;
    if (t !== 'window' && t !== 'passWindow') continue;
    o.updateWorldMatrix(true, true);
    openings.push(new THREE.Box3().setFromObject(o));
  }

  for (const wall of room.wallMeshes) {
    if (!wall.userData?.isRoomWall) continue;
    wall.updateWorldMatrix(true, true);
    // 元のサイズを保存(初回のみ)。Geometry を ShapeGeometry に差し替えると parameters が消えるため。
    if (!wall.userData._origSize && wall.geometry?.parameters) {
      wall.userData._origSize = {
        w: wall.geometry.parameters.width,
        h: wall.geometry.parameters.height,
      };
    }
    const W = wall.userData._origSize?.w;
    const H = wall.userData._origSize?.h;
    if (!W || !H) continue;

    const holes = [];
    for (const oBox of openings) {
      // 開口部の世界中心を壁ローカルへ。z が壁面から離れすぎていればこの壁とは無関係。
      const oCenter = new THREE.Vector3();
      oBox.getCenter(oCenter);
      const localCenter = wall.worldToLocal(oCenter.clone());
      if (Math.abs(localCenter.z) > 0.6) continue; // 60cm 以内なら同じ壁面に乗っていると見なす(壁から多少離して置かれていても穴を開ける)

      // 8 隅をすべて壁ローカルへ投影し、x-y 平面での bounding rect を取る
      const corners = [
        new THREE.Vector3(oBox.min.x, oBox.min.y, oBox.min.z),
        new THREE.Vector3(oBox.max.x, oBox.min.y, oBox.min.z),
        new THREE.Vector3(oBox.min.x, oBox.max.y, oBox.min.z),
        new THREE.Vector3(oBox.max.x, oBox.max.y, oBox.min.z),
        new THREE.Vector3(oBox.min.x, oBox.min.y, oBox.max.z),
        new THREE.Vector3(oBox.max.x, oBox.min.y, oBox.max.z),
        new THREE.Vector3(oBox.min.x, oBox.max.y, oBox.max.z),
        new THREE.Vector3(oBox.max.x, oBox.max.y, oBox.max.z),
      ];
      let lxMin = Infinity, lxMax = -Infinity, lyMin = Infinity, lyMax = -Infinity;
      for (const c of corners) {
        wall.worldToLocal(c);
        if (c.x < lxMin) lxMin = c.x;
        if (c.x > lxMax) lxMax = c.x;
        if (c.y < lyMin) lyMin = c.y;
        if (c.y > lyMax) lyMax = c.y;
      }
      const x1 = Math.max(-W / 2, lxMin);
      const x2 = Math.min( W / 2, lxMax);
      const y1 = Math.max(-H / 2, lyMin);
      const y2 = Math.min( H / 2, lyMax);
      if (x2 - x1 < 0.05 || y2 - y1 < 0.05) continue;
      holes.push({ x1, x2, y1, y2 });
    }

    // 同じ穴形状なら再構築スキップ
    const sig = holes.map(h =>
      `${h.x1.toFixed(3)},${h.x2.toFixed(3)},${h.y1.toFixed(3)},${h.y2.toFixed(3)}`,
    ).join('|') || 'none';
    if (wall.userData._outerHoleSig === sig) continue;
    wall.userData._outerHoleSig = sig;

    if (holes.length === 0) {
      wall.geometry.dispose();
      wall.geometry = new THREE.PlaneGeometry(W, H);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-W / 2, -H / 2);
      shape.lineTo( W / 2, -H / 2);
      shape.lineTo( W / 2,  H / 2);
      shape.lineTo(-W / 2,  H / 2);
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
      wall.geometry.dispose();
      const geom = new THREE.ShapeGeometry(shape);
      // ShapeGeometry の UV は形状座標がそのまま入っているので、PlaneGeometry と同じ 0..1 にリマップ
      const pos = geom.attributes.position;
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvs[i * 2]     = (x + W / 2) / W;
        uvs[i * 2 + 1] = (y + H / 2) / H;
      }
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      wall.geometry = geom;
    }
  }
}

export function updateWallHoles(furnitureList, room) {
  // 外壁の穴開けは room が渡されたときだけ
  if (room) updateOuterWallHoles(room, furnitureList);
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
