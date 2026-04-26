import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { IS_TOUCH, VirtualJoystick, TouchCamera } from './mobileControls.js';

const EYE_HEIGHT = 1.6;

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

export class WalkMode {
  constructor({ camera, renderer, room, orbitControls, furnitureList, onExit }) {
    this.camera = camera;
    this.renderer = renderer;
    this.room = room;
    this.orbit = orbitControls;
    this.furnitureList = furnitureList;
    this.onExit = onExit;

    this.enabled = false;
    this.keys = { forward: false, back: false, left: false, right: false, down: false, up: false };

    this.controls = new PointerLockControls(camera, renderer.domElement);
    this.controls.addEventListener('unlock', () => this.disable());

    this._onKey = this._onKey.bind(this);
    this._onClick = this._onClick.bind(this);
    this._raycaster = new THREE.Raycaster();
    this.onNpcClick = null;
    this.onEmptyClick = null;
    this.onInteract = null;

    // タッチデバイス: PointerLockの代わりに仮想ジョイスティック + タッチカメラ
    this.isTouch = IS_TOUCH;
    if (this.isTouch) {
      const js = document.getElementById('mobile-joystick');
      const knob = js?.querySelector('.knob');
      if (js && knob) {
        this.joystick = new VirtualJoystick(js, knob);
      }
      this.touchCamera = new TouchCamera(camera, renderer.domElement, {
        getJoystickRect: () => js?.getBoundingClientRect() ?? null,
        onTap: (x, y) => this._onClick(null, x, y),
      });
    }
  }

  // 一人称視点でのクリック/タップ: NDC 座標からレイキャスト
  // 優先順位: インタラクティブ家具 > NPC/ペット > 空クリック
  // PC (PointerLock 中) は画面中央からのレイ。モバイルは tap の実座標から。
  _onClick(e, tapX, tapY) {
    if (!this.enabled) return;
    if (!this.isTouch && !this.controls.isLocked) return;
    let ndcX = 0, ndcY = 0;
    if (typeof tapX === 'number' && typeof tapY === 'number') {
      const rect = this.renderer.domElement.getBoundingClientRect();
      ndcX = ((tapX - rect.left) / rect.width) * 2 - 1;
      ndcY = -((tapY - rect.top) / rect.height) * 2 + 1;
    }
    this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const hits = this._raycaster.intersectObjects(this.furnitureList || [], true);
    if (hits.length > 0) {
      let target = hits[0].object;
      while (target && !target.userData?.furnitureType && target.parent) {
        target = target.parent;
      }
      if (target?.userData?.interactive) {
        this.onInteract?.(target);
        return;
      }
      if (target?.userData?.isNPC || target?.userData?.isPet) {
        this.onNpcClick?.(target);
        return;
      }
    }
    this.onEmptyClick?.();
  }

  _findPerson() {
    if (!this.furnitureList) return null;
    return this.furnitureList.find(o => o.userData?.furnitureType === 'person');
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;

    const person = this._findPerson();
    if (person) {
      // 人(アバター)を隠さず表示したまま、カメラを「頭の少し前方」に置く。
      // こうすれば自分の頭/目/髪は視界から外れ、鏡には自分が映る。
      const forward = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, person.rotation.y, 0));
      const FRONT_OFFSET = 0.25; // 顔の前 25cm (頭の半径 ~12cm の外側)
      this.camera.position.set(
        person.position.x + forward.x * FRONT_OFFSET,
        EYE_HEIGHT,
        person.position.z + forward.z * FRONT_OFFSET,
      );
      this.camera.lookAt(
        person.position.x + forward.x * (FRONT_OFFSET + 1),
        EYE_HEIGHT,
        person.position.z + forward.z * (FRONT_OFFSET + 1),
      );
      this._attachedPerson = person;
    } else {
      // 人がいないときは部屋中心に立つ（従来挙動）
      this.camera.position.set(0, EYE_HEIGHT, 0.0001);
      this.camera.lookAt(0, EYE_HEIGHT, -1);
      this._attachedPerson = null;
    }

    this.orbit.enabled = false;
    if (this.isTouch) {
      // モバイル: PointerLock 不使用、タッチカメラ起動
      this.touchCamera?.attach();
    } else {
      this.controls.lock();
    }

    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKey);
    this.renderer.domElement.addEventListener('mousedown', this._onClick);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.keys.forward = this.keys.back = this.keys.left = this.keys.right = false;
    this.keys.up = this.keys.down = false;

    if (this.isTouch) {
      this.touchCamera?.detach();
    } else if (this.controls.isLocked) {
      this.controls.unlock();
    }
    this.orbit.enabled = true;

    if (this._attachedPerson) {
      this.room?.clampInside?.(this._attachedPerson);
      this._attachedPerson = null;
    }

    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
    this.renderer.domElement.removeEventListener('mousedown', this._onClick);
    this.onExit?.();
  }

  _onKey(e) {
    if (!this.enabled) return;
    const down = e.type === 'keydown';
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this.keys.forward = down; e.preventDefault(); break;
      case 'KeyS': case 'ArrowDown':  this.keys.back = down; e.preventDefault(); break;
      case 'KeyA': case 'ArrowLeft':  this.keys.left = down; e.preventDefault(); break;
      case 'KeyD': case 'ArrowRight': this.keys.right = down; e.preventDefault(); break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.down = down; break; // しゃがむ
      case 'Space': this.keys.up = down; e.preventDefault(); break;      // 伸びる
      case 'Escape': if (down) this.disable(); break;
    }
  }

  update(dt) {
    if (!this.enabled) return;
    // PC: PointerLock 必須。モバイル: チェック不要
    if (!this.isTouch && !this.controls.isLocked) return;
    const speed = 2.5; // m/s（歩く速度）
    const dist = speed * Math.min(dt, 0.1);

    // 入力方向ベクトル（カメラのローカル空間）
    let fx = 0, fz = 0;
    if (this.keys.forward) fz -= 1;
    if (this.keys.back)    fz += 1;
    if (this.keys.left)    fx -= 1;
    if (this.keys.right)   fx += 1;
    // モバイル: 仮想ジョイスティックからも入力
    if (this.joystick) {
      const jv = this.joystick.getVector();
      fx += jv.x;
      fz += jv.y; // ジョイスティック上方向は dy<0 = vec.y<0 = 前進
    }
    const len = Math.hypot(fx, fz);
    if (len > 0) { fx /= len; fz /= len; }

    if (fz !== 0) this.controls.moveForward(-fz * dist);
    if (fx !== 0) this.controls.moveRight(fx * dist);

    // 壁越え防止: 部屋ポリゴン内に戻す
    if (this.room && this.room._polygon && this.room._polygon.length >= 3) {
      const margin = 0.25;
      if (!pointInPolygon(this.camera.position.x, this.camera.position.z, this.room._polygon)) {
        // ポリゴン外なら中心方向に戻す
        let cx = 0, cz = 0;
        for (const [x, z] of this.room._polygon) { cx += x; cz += z; }
        cx /= this.room._polygon.length;
        cz /= this.room._polygon.length;
        for (let step = 0; step < 10; step++) {
          this.camera.position.x = this.camera.position.x * 0.85 + cx * 0.15;
          this.camera.position.z = this.camera.position.z * 0.85 + cz * 0.15;
          if (pointInPolygon(this.camera.position.x, this.camera.position.z, this.room._polygon)) break;
        }
      }
      // さらにAABBでもクランプ（念のため）
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of this.room._polygon) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
      this.camera.position.x = Math.max(minX + margin, Math.min(maxX - margin, this.camera.position.x));
      this.camera.position.z = Math.max(minZ + margin, Math.min(maxZ - margin, this.camera.position.z));
    }

    // 家具・内壁・ドアとの衝突解消（AABB + プレイヤー半径）
    this._resolveFurnitureCollision();

    // 視点の上下（しゃがむ/伸びる）
    let y = EYE_HEIGHT;
    if (this.keys.down) y = 1.1;
    if (this.keys.up) y = 1.9;
    this.camera.position.y = y;

    // 人アバターをカメラに追従: 頭の前方オフセット分、カメラの後ろに配置
    if (this._attachedPerson) {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      camDir.y = 0;
      if (camDir.lengthSq() > 1e-6) camDir.normalize();
      const OFFSET = 0.25;
      this._attachedPerson.position.x = this.camera.position.x - camDir.x * OFFSET;
      this._attachedPerson.position.z = this.camera.position.z - camDir.z * OFFSET;
      // 人の+Zを camDir に合わせる
      this._attachedPerson.rotation.y = Math.atan2(camDir.x, camDir.z);
    }
  }

  // プレイヤー(半径0.25m)が家具AABBと重ならないよう最短方向へ押し戻す
  _resolveFurnitureCollision() {
    if (!this.furnitureList) return;
    const PLAYER_R = 0.25;
    const BODY_BOTTOM = 0.0;    // プレイヤーの足元
    const BODY_TOP    = 1.85;   // プレイヤーの頭頂
    const cam = this.camera.position;
    const tmpBox = new THREE.Box3();

    // 「通り抜け窓枠と重なる内壁」のうち、現在プレイヤーが窓枠の幅(長辺)レーン内にいる
    // 壁を通過可能にする。深さ(壁法線)方向は制限しない=壁の厚みに関係なく通り抜けられる。
    const PAD_LANE = 0.10;
    const passableWalls = new Set();
    for (const pw of this.furnitureList) {
      if (pw.userData?.furnitureType !== 'passWindow') continue;
      pw.updateWorldMatrix(true, true);
      const pwBox = new THREE.Box3().setFromObject(pw);
      const sx = pwBox.max.x - pwBox.min.x;
      const sz = pwBox.max.z - pwBox.min.z;
      let inLane;
      if (sx >= sz) {
        // 長辺=X 軸: プレイヤーの X が窓枠の X 範囲内ならレーン内
        inLane = cam.x >= pwBox.min.x - PAD_LANE && cam.x <= pwBox.max.x + PAD_LANE;
      } else {
        inLane = cam.z >= pwBox.min.z - PAD_LANE && cam.z <= pwBox.max.z + PAD_LANE;
      }
      if (!inLane) continue;
      // この窓枠と XZ で重なる内壁を「通過可能」に追加
      for (const w of this.furnitureList) {
        if (w.userData?.furnitureType !== 'wall') continue;
        w.updateWorldMatrix(true, true);
        const wBox = new THREE.Box3().setFromObject(w);
        const xOverlap = wBox.max.x > pwBox.min.x && wBox.min.x < pwBox.max.x;
        const zOverlap = wBox.max.z > pwBox.min.z && wBox.min.z < pwBox.max.z;
        if (xOverlap && zOverlap) passableWalls.add(w);
      }
    }

    for (let pass = 0; pass < 3; pass++) {
      let pushed = false;
      for (const obj of this.furnitureList) {
        // 壁掛け/天井付け/机上小物は通り抜け可とする
        if (obj.userData.skipClamp) continue;
        // 自分自身(憑依中のアバター)は衝突対象外
        if (obj === this._attachedPerson) continue;
        // 犬・猫は当たり判定なし(プレイヤーがすり抜けられる)
        if (obj.userData?.isPet) continue;
        // 窓枠レーン内にいるとき、その窓枠と重なる内壁は通過可能
        if (passableWalls.has(obj)) continue;
        obj.updateWorldMatrix(true, true);
        tmpBox.setFromObject(obj);
        // Y 方向でプレイヤー身体の範囲と重なっていなければスキップ
        if (tmpBox.max.y < BODY_BOTTOM || tmpBox.min.y > BODY_TOP) continue;

        const minX = tmpBox.min.x - PLAYER_R;
        const maxX = tmpBox.max.x + PLAYER_R;
        const minZ = tmpBox.min.z - PLAYER_R;
        const maxZ = tmpBox.max.z + PLAYER_R;
        if (cam.x < minX || cam.x > maxX || cam.z < minZ || cam.z > maxZ) continue;

        // 最短押し出し方向を決定（X+/X-/Z+/Z-）
        const dL = cam.x - minX;
        const dR = maxX - cam.x;
        const dB = cam.z - minZ;
        const dF = maxZ - cam.z;
        const m = Math.min(dL, dR, dB, dF);
        if (m === dL)      cam.x = minX;
        else if (m === dR) cam.x = maxX;
        else if (m === dB) cam.z = minZ;
        else               cam.z = maxZ;
        pushed = true;
      }
      if (!pushed) break;
    }
  }
}
