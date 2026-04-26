// タッチデバイス用コントロール: 仮想ジョイスティック + ドラッグ視点
// PointerLock API が使えないモバイルブラウザ向けに、walk.js の入力層を差し替える。

// (pointer: coarse) ≒ 指先タッチが主な入力手段(スマホ/タブレット)
export const IS_TOUCH = typeof window !== 'undefined'
  && window.matchMedia
  && window.matchMedia('(pointer: coarse)').matches;

// ---- 仮想ジョイスティック ------------------------------------------------
// #mobile-joystick (外側) + 内側 knob を操作。
// getVector() で {x:-1..1, y:-1..1} を返す (x: 右+ / y: 前-, 後+ の画面感覚)
export class VirtualJoystick {
  constructor(containerEl, knobEl) {
    this.container = containerEl;
    this.knob = knobEl;
    this.active = false;
    this.centerX = 0;
    this.centerY = 0;
    this.touchId = null;
    this.vec = { x: 0, y: 0 };
    this.maxR = 55; // 中心から最大ドラッグ半径(px) - 親指でフルストロークしやすく
    this.deadZone = 0.18; // 小さな動きは無視 (誤入力をやや厳しめに排除)

    this._onStart = this._onStart.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onEnd   = this._onEnd.bind(this);

    this.container.addEventListener('touchstart', this._onStart, { passive: false });
    window.addEventListener('touchmove',  this._onMove, { passive: false });
    window.addEventListener('touchend',   this._onEnd);
    window.addEventListener('touchcancel', this._onEnd);
  }

  _onStart(e) {
    if (this.active) return;
    const t = e.changedTouches[0];
    const rect = this.container.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.touchId = t.identifier;
    this.active = true;
    this._updateKnob(t.clientX, t.clientY);
    e.preventDefault();
  }

  _onMove(e) {
    if (!this.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this.touchId) {
        this._updateKnob(t.clientX, t.clientY);
        e.preventDefault();
        break;
      }
    }
  }

  _onEnd(e) {
    if (!this.active) return;
    for (const t of e.changedTouches) {
      if (t.identifier === this.touchId) {
        this.active = false;
        this.touchId = null;
        this.vec.x = 0; this.vec.y = 0;
        this.knob.style.transform = 'translate(-50%, -50%)';
        break;
      }
    }
  }

  _updateKnob(cx, cy) {
    let dx = cx - this.centerX;
    let dy = cy - this.centerY;
    const d = Math.hypot(dx, dy);
    if (d > this.maxR) {
      dx = (dx / d) * this.maxR;
      dy = (dy / d) * this.maxR;
    }
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / this.maxR;
    const ny = dy / this.maxR;
    // デッドゾーン
    if (Math.abs(nx) < this.deadZone && Math.abs(ny) < this.deadZone) {
      this.vec.x = 0; this.vec.y = 0;
    } else {
      this.vec.x = nx;
      this.vec.y = ny;
    }
  }

  // 呼び出し側が move 意図を取得
  getVector() { return this.vec; }
}

// ---- タッチカメラ (ドラッグで視点回転 + タップで click) ----
// PointerLockControls の代替。内部で Euler (YXZ) を保持し camera.quaternion を更新
import * as THREE from 'three';

export class TouchCamera {
  constructor(camera, domElement, { getJoystickRect, onTap } = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.getJoystickRect = getJoystickRect; // joystick領域判定用
    this.onTap = onTap; // タップ時コールバック (短押しで呼ぶ)
    this.enabled = false;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.dragId = null;
    this.lastX = 0; this.lastY = 0;
    this.tapStartX = 0; this.tapStartY = 0;
    this.tapStartTime = 0;
    this.tapMoved = false;
    this.justStarted = false; // touchstart 直後の最初の move を「ゼロ delta 扱い」にするためのフラグ
    this.sensitivity = 0.0040; // ラジアン/ピクセル(以前 0.0028 → やや高めにして指の小移動でも視点が回せる)

    this._onStart = this._onStart.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onEnd   = this._onEnd.bind(this);
  }

  attach() {
    if (this.enabled) return;
    this.enabled = true;
    // カメラの現在姿勢から Euler を読み取り
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.dom.addEventListener('touchstart', this._onStart, { passive: false });
    this.dom.addEventListener('touchmove',  this._onMove, { passive: false });
    this.dom.addEventListener('touchend',   this._onEnd);
    this.dom.addEventListener('touchcancel', this._onEnd);
  }

  detach() {
    if (!this.enabled) return;
    this.enabled = false;
    this.dragId = null;
    this.dom.removeEventListener('touchstart', this._onStart);
    this.dom.removeEventListener('touchmove',  this._onMove);
    this.dom.removeEventListener('touchend',   this._onEnd);
    this.dom.removeEventListener('touchcancel', this._onEnd);
  }

  _inJoystick(cx, cy) {
    const r = this.getJoystickRect?.();
    if (!r) return false;
    return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
  }

  _onStart(e) {
    if (this.dragId != null) return;
    const t = e.changedTouches[0];
    if (this._inJoystick(t.clientX, t.clientY)) return; // ジョイスティック触ってるのでスキップ
    this.dragId = t.identifier;
    this.lastX = t.clientX; this.lastY = t.clientY;
    this.tapStartX = t.clientX; this.tapStartY = t.clientY;
    this.tapStartTime = performance.now();
    this.tapMoved = false;
    this.justStarted = true; // 最初の move は回転させずキャリブレーションだけ
    e.preventDefault();
  }

  _onMove(e) {
    if (this.dragId == null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== this.dragId) continue;
      const dx = t.clientX - this.lastX;
      const dy = t.clientY - this.lastY;
      this.lastX = t.clientX; this.lastY = t.clientY;
      // touchstart 直後の最初の move は適用しない (位置記録だけ)。
      // これで「触れた瞬間に視点ジャンプ」を確実に防ぐ。
      if (this.justStarted) {
        this.justStarted = false;
        e.preventDefault();
        break;
      }
      // 念のため: 異常に大きい delta も無視 (60FPS 高速スワイプ上限 ~30px)
      const MAX_DELTA = 30;
      if (Math.abs(dx) > MAX_DELTA || Math.abs(dy) > MAX_DELTA) {
        e.preventDefault();
        break;
      }
      this.euler.y -= dx * this.sensitivity;
      this.euler.x -= dy * this.sensitivity;
      const MAX_PITCH = Math.PI / 2 * 0.98;
      if (this.euler.x > MAX_PITCH) this.euler.x = MAX_PITCH;
      if (this.euler.x < -MAX_PITCH) this.euler.x = -MAX_PITCH;
      this.camera.quaternion.setFromEuler(this.euler);
      // 一定以上動いたらタップじゃない
      const tdx = t.clientX - this.tapStartX;
      const tdy = t.clientY - this.tapStartY;
      if (Math.hypot(tdx, tdy) > 10) this.tapMoved = true;
      e.preventDefault();
      break;
    }
  }

  _onEnd(e) {
    if (this.dragId == null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== this.dragId) continue;
      const dt = performance.now() - this.tapStartTime;
      // 短押し(<250ms) + あまり動いてない(tapMoved=false) ならタップ扱い
      if (!this.tapMoved && dt < 250) this.onTap?.();
      this.dragId = null;
      break;
    }
  }
}
