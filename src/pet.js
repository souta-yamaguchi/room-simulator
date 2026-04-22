import * as THREE from 'three';

// ペット(猫/犬)アバターのAI更新。
// 状態マシン: walk → 到着 → idle (待機) → 50%で sit → walk再開
// 部屋ポリゴン内で目標点をランダム選定し、家具AABBを回避しながら移動する。

function pointInPolygon(px, pz, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const hit = ((zi > pz) !== (zj > pz)) &&
      (px < (xj - xi) * (pz - zi) / (zj - zi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function polygonBounds(polygon) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of polygon) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function pickRandomTarget(room) {
  const poly = room?._polygon;
  if (!poly || poly.length < 3) return new THREE.Vector3(0, 0, 0);
  const b = polygonBounds(poly);
  for (let tries = 0; tries < 30; tries++) {
    const x = b.minX + Math.random() * (b.maxX - b.minX);
    const z = b.minZ + Math.random() * (b.maxZ - b.minZ);
    if (pointInPolygon(x, z, poly)) return new THREE.Vector3(x, 0, z);
  }
  // fallback: 部屋中心
  return new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
}

function ensureState(pet) {
  if (!pet.userData.petState) {
    pet.userData.petState = {
      mode: 'idle',
      target: null,
      modeTimer: 0.5 + Math.random() * 1.5, // 初期待機
      stuckTimer: 0,
      speed: pet.userData.petKind === 'dog' ? 0.7 : 0.55, // m/s
      sitOffset: 0,
    };
  }
  return pet.userData.petState;
}

function pickNextMode(state) {
  // walk完了→idle。idleからは walk に戻るが、0.4確率で sit を挟む
  if (state.mode === 'walk') {
    state.mode = 'idle';
    state.modeTimer = 1.0 + Math.random() * 2.0;
  } else if (state.mode === 'idle') {
    if (Math.random() < 0.4) {
      state.mode = 'sit';
      state.modeTimer = 2.0 + Math.random() * 3.0;
    } else {
      state.mode = 'walk';
      state.target = null; // 次のupdateで目標抽選
    }
  } else if (state.mode === 'sit') {
    state.mode = 'walk';
    state.target = null;
  }
}

// ペット一体分の AABB 衝突解消（家具と重ならないよう最短方向に押し戻す）
function resolveCollision(pet, furnitureList) {
  const PET_R = 0.18;
  const BODY_BOTTOM = 0.02;
  const BODY_TOP = pet.userData.petKind === 'dog' ? 0.50 : 0.34;
  const pos = pet.position;
  const tmpBox = new THREE.Box3();

  for (let pass = 0; pass < 2; pass++) {
    let pushed = false;
    for (const obj of furnitureList) {
      if (obj === pet) continue;
      if (obj.userData?.skipClamp) continue;
      if (obj.userData?.isPet) continue; // 他のペット同士は擦り抜け
      if (obj.userData?.isPerson) continue; // 人アバターも擦り抜け（戯れる用途）
      obj.updateWorldMatrix(true, true);
      tmpBox.setFromObject(obj);
      if (tmpBox.max.y < BODY_BOTTOM || tmpBox.min.y > BODY_TOP) continue;
      const minX = tmpBox.min.x - PET_R;
      const maxX = tmpBox.max.x + PET_R;
      const minZ = tmpBox.min.z - PET_R;
      const maxZ = tmpBox.max.z + PET_R;
      if (pos.x < minX || pos.x > maxX || pos.z < minZ || pos.z > maxZ) continue;
      const dL = pos.x - minX;
      const dR = maxX - pos.x;
      const dB = pos.z - minZ;
      const dF = maxZ - pos.z;
      const m = Math.min(dL, dR, dB, dF);
      if (m === dL) pos.x = minX;
      else if (m === dR) pos.x = maxX;
      else if (m === dB) pos.z = minZ;
      else pos.z = maxZ;
      pushed = true;
    }
    if (!pushed) break;
  }
}

// 脚/尻尾のパーツアニメ
function animateParts(pet, t, walking) {
  const parts = pet.userData.parts;
  if (!parts) return;
  // 脚の振り（walking時は大きく、idle/sitでは微小）
  const amp = walking ? 0.45 : 0.03;
  const freq = walking ? 8.0 : 1.2;
  if (parts.legs) {
    for (let i = 0; i < parts.legs.length; i++) {
      const leg = parts.legs[i];
      // 前脚(2,3)と後脚(0,1)で位相反転して対角線歩行感
      const signPair = (i === 0 || i === 3) ? 1 : -1;
      leg.rotation.x = Math.sin(t * freq) * amp * signPair;
    }
  }
  // 尻尾: 常に揺れるが walk 時は頻度増
  if (parts.tailSegs) {
    const tfreq = walking ? 4.0 : 2.2;
    const tamp = walking ? 0.25 : 0.18;
    for (let i = 0; i < parts.tailSegs.length; i++) {
      const seg = parts.tailSegs[i];
      seg.rotation.y = Math.sin(t * tfreq + i * 0.6) * tamp;
    }
  }
}

export function updatePet(pet, dt, t, room, furnitureList) {
  const state = ensureState(pet);
  state.modeTimer -= dt;

  // 目標設定（walkなのに target が無ければ抽選）
  if (state.mode === 'walk' && !state.target) {
    state.target = pickRandomTarget(room);
    state.stuckTimer = 0;
  }

  if (state.mode === 'walk' && state.target) {
    const dx = state.target.x - pet.position.x;
    const dz = state.target.z - pet.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) {
      // 到着
      pickNextMode(state);
    } else {
      const ux = dx / dist, uz = dz / dist;
      const step = Math.min(dist, state.speed * dt);
      const prevX = pet.position.x, prevZ = pet.position.z;
      pet.position.x += ux * step;
      pet.position.z += uz * step;
      // 向きを移動方向に補間（+Z = 顔の前と仮定）
      const desired = Math.atan2(ux, uz);
      const cur = pet.rotation.y;
      // 角度差を -π〜π に正規化
      let diff = desired - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      pet.rotation.y += diff * Math.min(1, dt * 6);

      // 衝突解消とポリゴン内判定
      if (room) room.clampInside?.(pet);
      resolveCollision(pet, furnitureList);
      // ほぼ動かなかったら stuck カウント
      const moved = Math.hypot(pet.position.x - prevX, pet.position.z - prevZ);
      if (moved < step * 0.2) state.stuckTimer += dt;
      else state.stuckTimer = 0;
      if (state.stuckTimer > 1.5) {
        // 別の目標を再抽選
        state.target = null;
        state.stuckTimer = 0;
      }
    }
  }

  if (state.modeTimer <= 0 && (state.mode === 'idle' || state.mode === 'sit')) {
    pickNextMode(state);
  }

  // 座る: 胴体を少し低くする表現
  const sitDesired = state.mode === 'sit' ? 1 : 0;
  state.sitOffset += (sitDesired - state.sitOffset) * Math.min(1, dt * 5);
  pet.position.y = -state.sitOffset * 0.04; // 座ると 4cm 沈む

  // パーツアニメ
  animateParts(pet, t, state.mode === 'walk');
}
