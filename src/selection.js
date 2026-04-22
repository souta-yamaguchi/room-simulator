import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

export class Selector {
  constructor({ scene, camera, renderer, orbitControls, room, furnitureList, onChange }) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.orbitControls = orbitControls;
    this.room = room;
    this.furnitureList = furnitureList;
    this.onChange = onChange;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selected = null;
    this.boxHelper = null;

    this.transform = new TransformControls(camera, renderer.domElement);
    this.transform.setSize(0.8);
    this.transform.showY = false;
    // Three.js r169以降、ギズモ本体は getHelper() 経由で取得してシーンに追加する必要がある
    scene.add(this.transform.getHelper());

    this.transform.addEventListener('dragging-changed', (e) => {
      orbitControls.enabled = !e.value;
    });

    this.transform.addEventListener('objectChange', () => {
      if (!this.selected) return;
      // 家具Groupの各パーツはローカル座標で配置済み。Y位置は userData.fixedY があればそれを使う（天井付け/壁掛け）、なければ 0（床）
      const fy = this.selected.userData.fixedY;
      this.selected.position.y = (fy != null) ? fy : 0;
      // 回転中かつShift押下なら、最終角度を絶対的な90°刻みへスナップ（TransformControlsの相対スナップでは初期値次第でズレるため）
      if (this._shiftHeld && this.transform.mode === 'rotate') {
        const step = Math.PI / 2;
        this.selected.rotation.y = Math.round(this.selected.rotation.y / step) * step;
      }
      this.room.clampInside(this.selected);
      this._resolveWallCollision();
      // 移動中のみ家具同士のエッジスナップ（近接時に面がピタッと触れる）
      if (this.transform.mode === 'translate') {
        this._snapToFurnitureEdges();
      }
      if (this.boxHelper) this.boxHelper.update();
    });

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onShift = this._onShift.bind(this);
    renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('keydown', this._onKeyDown);
    // Shift で回転スナップ(90°刻み)を有効化。離すとフリー回転に戻る
    window.addEventListener('keydown', this._onShift);
    window.addEventListener('keyup', this._onShift);
  }

  _onShift(e) {
    if (e.key !== 'Shift') return;
    if (e.type === 'keydown') {
      this._shiftHeld = true;
      this.transform.setRotationSnap(Math.PI / 2); // 90°
      this.transform.setTranslationSnap(0.25);     // ついでに位置も25cmスナップ
    } else {
      this._shiftHeld = false;
      this.transform.setRotationSnap(null);
      this.transform.setTranslationSnap(null);
    }
  }

  snapRotationToRightAngle() {
    if (!this.selected) return;
    const step = Math.PI / 2;
    this.selected.rotation.y = Math.round(this.selected.rotation.y / step) * step;
    this.room.clampInside(this.selected);
    this._resolveWallCollision();
    this.refreshBox();
  }

  // 家具同士のエッジスナップ（近接時に面がピタッと触れる）
  // 対象: skipClamp=false のオブジェクト（机上小物や壁掛けは除外）
  _snapToFurnitureEdges() {
    const sel = this.selected;
    if (!sel) return;
    if (sel.userData.skipClamp) return;

    const SNAP = 0.05; // 5cm以内で吸着
    sel.updateWorldMatrix(true, true);
    const selBox = new THREE.Box3().setFromObject(sel);

    let bestDx = 0, bestDxDist = SNAP;
    let bestDz = 0, bestDzDist = SNAP;

    for (const other of this.furnitureList) {
      if (other === sel) continue;
      if (other.userData.skipClamp) continue;
      other.updateWorldMatrix(true, true);
      const oBox = new THREE.Box3().setFromObject(other);

      // 相手のZ範囲と重なっていれば、X方向の「面接触」候補を探す
      const zOverlap = selBox.max.z > oBox.min.z && selBox.min.z < oBox.max.z;
      const xOverlap = selBox.max.x > oBox.min.x && selBox.min.x < oBox.max.x;

      if (zOverlap) {
        // sel が other の左側から近づいている: sel.max.x を oBox.min.x に合わせる
        if (selBox.max.x <= oBox.min.x) {
          const d = oBox.min.x - selBox.max.x;
          if (d < bestDxDist) { bestDxDist = d; bestDx = d; }
        }
        // sel が other の右側から近づいている: sel.min.x を oBox.max.x に合わせる
        if (selBox.min.x >= oBox.max.x) {
          const d = selBox.min.x - oBox.max.x;
          if (d < bestDxDist) { bestDxDist = d; bestDx = -d; }
        }
      }
      if (xOverlap) {
        if (selBox.max.z <= oBox.min.z) {
          const d = oBox.min.z - selBox.max.z;
          if (d < bestDzDist) { bestDzDist = d; bestDz = d; }
        }
        if (selBox.min.z >= oBox.max.z) {
          const d = selBox.min.z - oBox.max.z;
          if (d < bestDzDist) { bestDzDist = d; bestDz = -d; }
        }
      }
    }

    if (bestDxDist < SNAP) sel.position.x += bestDx;
    if (bestDzDist < SNAP) sel.position.z += bestDz;
  }

  // 選択中のオブジェクトが他の内壁と重なっていたら、最短方向へ押し戻す（AABB）
  // 内壁同士や、skipClamp付きの壁掛け/天井付けは対象外。
  _resolveWallCollision() {
    const sel = this.selected;
    if (!sel) return;
    if (sel.userData.furnitureType === 'wall') return;
    if (sel.userData.skipClamp) return;

    sel.updateWorldMatrix(true, true);
    const selBox = new THREE.Box3().setFromObject(sel);

    // 何回か繰り返して複数壁との重なりも解消
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      for (const other of this.furnitureList) {
        if (other === sel) continue;
        if (other.userData.furnitureType !== 'wall') continue;
        other.updateWorldMatrix(true, true);
        const wBox = new THREE.Box3().setFromObject(other);

        const oxMin = Math.max(selBox.min.x, wBox.min.x);
        const oxMax = Math.min(selBox.max.x, wBox.max.x);
        const ozMin = Math.max(selBox.min.z, wBox.min.z);
        const ozMax = Math.min(selBox.max.z, wBox.max.z);
        if (oxMax <= oxMin || ozMax <= ozMin) continue; // 重なりなし

        const overlapX = oxMax - oxMin;
        const overlapZ = ozMax - ozMin;
        if (overlapX < overlapZ) {
          const selCx = (selBox.min.x + selBox.max.x) / 2;
          const wCx = (wBox.min.x + wBox.max.x) / 2;
          sel.position.x += (selCx >= wCx ? 1 : -1) * overlapX;
        } else {
          const selCz = (selBox.min.z + selBox.max.z) / 2;
          const wCz = (wBox.min.z + wBox.max.z) / 2;
          sel.position.z += (selCz >= wCz ? 1 : -1) * overlapZ;
        }
        // 外壁の外には出さない
        this.room.clampInside(sel);
        sel.updateWorldMatrix(true, true);
        selBox.setFromObject(sel);
        moved = true;
      }
      if (!moved) break;
    }
  }

  _onPointerDown(event) {
    if (this.transform.dragging) return;
    // 訪問者モード: 編集操作一切させない
    if (this.readOnly) return;
    // 一人称視点中はポインターがロックされているのでこのハンドラはスキップ
    // (walk.js 側の _onClick が画面中央からレイキャストする)
    if (document.pointerLockElement) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // recursive=true でGroup内のパーツもヒット対象にする
    const hits = this.raycaster.intersectObjects(this.furnitureList, true);
    if (hits.length > 0) {
      let target = hits[0].object;
      while (target && !target.userData.furnitureType && target.parent) {
        target = target.parent;
      }
      if (target && target.userData.furnitureType) {
        this.select(target);
        return;
      }
    }
    // 家具にヒットしなかった場合、部屋の外壁をチェック
    if (this.room?.wallMeshes?.length) {
      const wallHits = this.raycaster.intersectObjects(this.room.wallMeshes, false);
      if (wallHits.length > 0) {
        const w = wallHits[0].object;
        if (w.userData.isRoomWall && w.userData.wallIndex != null) {
          this.onWallClick?.(w.userData.wallIndex);
          this.deselect();
          return;
        }
      }
    }
    this.deselect();
  }

  _onKeyDown(e) {
    if (!this.selected) {
      if (e.key === 'Escape') this.deselect();
      return;
    }
    switch (e.key) {
      case 't': case 'T':
        this.transform.setMode('translate');
        this.transform.showX = true; this.transform.showY = false; this.transform.showZ = true;
        break;
      case 'r': case 'R':
        this.transform.setMode('rotate');
        this.transform.showX = false; this.transform.showY = true; this.transform.showZ = false;
        break;
      case 's': case 'S':
        this.transform.setMode('scale');
        this.transform.showX = true; this.transform.showY = true; this.transform.showZ = true;
        break;
      case 'Delete': case 'Backspace': this.deleteSelected(); break;
      case 'Escape': this.deselect(); break;
      case 'd': case 'D':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.duplicateSelected(); }
        break;
      case 'c': case 'C':
        // CtrlなしのCで複製（ショートカット簡略版）
        if (!e.ctrlKey && !e.metaKey) this.duplicateSelected();
        break;
      case 'p': case 'P':
        // 最も近い90°へ回転スナップ
        this.snapRotationToRightAngle();
        break;
    }
  }

  select(obj) {
    this.selected = obj;
    this.transform.attach(obj);
    this.transform.setMode('translate');
    // 初期状態は translate で X/Z のみ表示（床に固定）
    this.transform.showX = true; this.transform.showY = false; this.transform.showZ = true;
    if (this.boxHelper) this.scene.remove(this.boxHelper);
    this.boxHelper = new THREE.BoxHelper(obj, 0xffff66);
    this.scene.add(this.boxHelper);
    this.onChange?.();
    // NPCまたはペット選択時は吹き出しコールバックを発火（ui.js側で購読）
    if (obj.userData?.isNPC || obj.userData?.isPet) this.onNpcSelect?.(obj);
  }

  deselect() {
    this.transform.detach();
    if (this.boxHelper) { this.scene.remove(this.boxHelper); this.boxHelper = null; }
    this.selected = null;
    this.onChange?.();
  }

  deleteSelected() {
    if (!this.selected) return;
    const obj = this.selected;
    this.deselect();
    const idx = this.furnitureList.indexOf(obj);
    if (idx >= 0) this.furnitureList.splice(idx, 1);
    this.scene.remove(obj);
    disposeObject(obj);
    this.onChange?.();
  }

  duplicateSelected() {
    if (!this.selected) return;
    const orig = this.selected;
    // clone(true) で階層ごと複製（マテリアルはデフォルトで共有される）
    const copy = orig.clone(true);
    // マテリアルもクローンして、以降の色変更が元と相互に影響しないようにする
    copy.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.userData.noTint) return; // 鏡のReflector等は保護
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }
    });
    // 内壁のみ、部屋の壁紙マテリアルを共有（壁紙変更時にリアルタイム反映するため）
    if (orig.userData.furnitureType === 'wall') {
      copy.traverse((child) => {
        if (child.isMesh && child.userData.isWallBody) {
          child.material = this.room.wallMaterial;
        }
      });
    }
    copy.position.x += 0.3;
    copy.position.z += 0.3;
    this.scene.add(copy);
    this.furnitureList.push(copy);
    this.select(copy);
  }

  refreshBox() {
    if (this.boxHelper) this.boxHelper.update();
  }
}
