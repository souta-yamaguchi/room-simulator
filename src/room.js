import * as THREE from 'three';
import {
  makePlankFloorTexture,
  makeTileFloorTexture,
  makeConcreteFloorTexture,
  makeCarpetFloorTexture,
  makeMarbleFloorTexture,
  makeWallTexture,
  makeWoodPanelTexture,
  makePatternWallpaperTexture,
  makeStripeWallpaperTexture,
  makeBrickWallpaperTexture,
  makeConcreteWallpaperTexture,
  makeGeometricPatternTexture,
  makeNordicPatternTexture,
} from './textures.js';

export const FLOOR_PRESETS = {
  plank:    { label: '板張り(明)', kind: 'plank',    repeatDiv: 3 },
  plank_dk: { label: '板張り(濃)', kind: 'plank_dk', repeatDiv: 3 },
  tile:     { label: 'タイル',     kind: 'tile',     repeatDiv: 1.2 },
  concrete: { label: 'コンクリ',   kind: 'concrete', repeatDiv: 3 },
  carpet:   { label: 'カーペット', kind: 'carpet',   repeatDiv: 2 },
  marble:   { label: '大理石',     kind: 'marble',   repeatDiv: 3 },
};

// 柄パターン中心。無地はデフォルト(色ピッカーで色変更)。
export const WALLPAPER_PRESETS = {
  plain:     { label: '無地',       kind: 'solid', color: 0xebe5d8 },
  wood:      { label: '木目パネル', kind: 'wood' },
  floral:    { label: '花柄',       kind: 'floral' },
  geometric: { label: '幾何柄',     kind: 'geometric' },
  nordic:    { label: '北欧柄',     kind: 'nordic' },
  stripe:    { label: 'ストライプ', kind: 'stripe' },
  brick:     { label: 'レンガ',     kind: 'brick' },
  concrete:  { label: 'コンクリート', kind: 'concrete' },
};

export const ROOM_SHAPES = {
  rect: { label: '長方形',   usesNotch: false },
  L:    { label: 'L字型',    usesNotch: true  },
  U:    { label: 'コの字型', usesNotch: true  },
};

// 世界座標 (x, z) 配列を返す。順序はCCW（上から見て反時計回り）
export function shapeVertices(shapeType, width, depth, notchW, notchD) {
  const hw = width / 2, hd = depth / 2;
  const nw = Math.min(notchW, width - 0.5);
  const nd = Math.min(notchD, depth - 0.5);
  switch (shapeType) {
    case 'rect':
      return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    case 'L':
      // +x, +z 角をnotchで切り抜いたL字
      return [
        [-hw, -hd],
        [ hw, -hd],
        [ hw, hd - nd],
        [ hw - nw, hd - nd],
        [ hw - nw, hd],
        [-hw, hd],
      ];
    case 'U':
      // +z側の中央にnotchを切り抜いたコの字（上が開く）
      return [
        [-hw, -hd],
        [ hw, -hd],
        [ hw, hd],
        [ nw / 2, hd],
        [ nw / 2, hd - nd],
        [-nw / 2, hd - nd],
        [-nw / 2, hd],
        [-hw, hd],
      ];
    default:
      return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  }
}

function pointInPolygon(px, pz, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersect = ((zi > pz) !== (zj > pz)) &&
      (px < (xj - xi) * (pz - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.shape = 'rect';
    this.width = 6;
    this.depth = 4;
    this.height = 2.7;
    this.notchW = 2.0;
    this.notchD = 2.0;

    // --- 床
    this.floorTextureCache = {};
    this.currentFloor = 'plank';
    this.floorTexture = this._getOrMakeFloorTexture('plank');
    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // --- 壁用マテリアル（全面共有 = 壁紙切替で全壁同時更新）
    this.solidWallTexture = makeWallTexture();
    this.wallTextureCache = {}; // 柄テクスチャは遅延生成してキャッシュ
    this.wallMaterial = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xebe5d8,
      roughness: 0.95,
      side: THREE.FrontSide,
    });
    this.currentWallpaper = 'plain';

    // --- 巾木マテリアル
    this.baseboardMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.7 });

    // --- 天井マテリアル（下向きFrontSideで、上から見下ろすビュー時は自動で非表示になる）
    this.ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4f0e6,
      roughness: 0.92,
      side: THREE.FrontSide,
    });
    this.ceiling = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.ceilingMaterial);
    this.ceiling.rotation.x = Math.PI / 2; // 法線を -Y (床側を向く) に
    this.scene.add(this.ceiling);

    // 壁ごとの個別色オーバーライド { index: hex }（updateGeometry 後も保持される）
    this.wallColorOverrides = {};

    // 動的に生成される壁・巾木を保持
    this.wallMeshes = [];
    this.wallMaterialsPerIndex = []; // クローン材質の所有権管理用
    this.baseboardMeshes = [];

    this._polygon = [];
    this.updateGeometry();
  }

  // 壁インデックスiに対応するマテリアルを返す。オーバーライドがあれば個別クローンを作成
  _getWallMaterialForIndex(i) {
    const override = this.wallColorOverrides[i];
    if (!override) return this.wallMaterial;
    const m = new THREE.MeshStandardMaterial({
      map: null,
      color: override,
      roughness: 0.95,
      side: THREE.FrontSide,
    });
    this.wallMaterialsPerIndex.push(m);
    return m;
  }

  setWallColorForIndex(i, hex) {
    this.wallColorOverrides[i] = hex;
    this.updateGeometry();
  }

  clearWallColorOverride(i) {
    delete this.wallColorOverrides[i];
    this.updateGeometry();
  }

  clearAllWallColorOverrides() {
    this.wallColorOverrides = {};
    this.updateGeometry();
  }

  setCeilingColor(hex) {
    this.ceilingMaterial.color.set(hex);
    this.ceilingMaterial.needsUpdate = true;
  }

  setCeilingVisible(visible) {
    this.ceiling.visible = visible;
  }

  _getOrMakeFloorTexture(kind) {
    if (this.floorTextureCache[kind]) return this.floorTextureCache[kind];
    let tex;
    switch (kind) {
      case 'plank':    tex = makePlankFloorTexture(); break;
      case 'plank_dk': tex = makePlankFloorTexture(); break; // 同じテクスチャ、色はマテリアルで暗くする
      case 'tile':     tex = makeTileFloorTexture(); break;
      case 'concrete': tex = makeConcreteFloorTexture(); break;
      case 'carpet':   tex = makeCarpetFloorTexture(); break;
      case 'marble':   tex = makeMarbleFloorTexture(); break;
      default:         tex = makePlankFloorTexture();
    }
    this.floorTextureCache[kind] = tex;
    return tex;
  }

  setFloor(key) {
    const preset = FLOOR_PRESETS[key];
    if (!preset) return;
    this.currentFloor = key;
    this.floorTexture = this._getOrMakeFloorTexture(preset.kind);
    this.floorMaterial.map = this.floorTexture;
    // 濃い板張りは色で暗くする
    if (preset.kind === 'plank_dk') {
      this.floorMaterial.color.setHex(0x7a5a3a);
    } else {
      this.floorMaterial.color.setHex(0xffffff);
    }
    this.floorMaterial.needsUpdate = true;
    this.updateGeometry();
  }

  _getOrMakeWallTexture(kind) {
    if (this.wallTextureCache[kind]) return this.wallTextureCache[kind];
    let tex;
    switch (kind) {
      case 'wood':      tex = makeWoodPanelTexture(); break;
      case 'floral':    tex = makePatternWallpaperTexture(); break;
      case 'geometric': tex = makeGeometricPatternTexture('#e8dccf', '#7a5a3a'); break;
      case 'nordic':    tex = makeNordicPatternTexture(); break;
      case 'stripe':    tex = makeStripeWallpaperTexture(); break;
      case 'brick':     tex = makeBrickWallpaperTexture(); break;
      case 'concrete':  tex = makeConcreteWallpaperTexture(); break;
      default: return null;
    }
    this.wallTextureCache[kind] = tex;
    return tex;
  }

  setWallpaper(key) {
    const preset = WALLPAPER_PRESETS[key];
    if (!preset) return;
    this.currentWallpaper = key;
    if (preset.kind === 'solid') {
      this.wallMaterial.map = null;
      this.wallMaterial.color.setHex(preset.color ?? 0xebe5d8);
    } else {
      const tex = this._getOrMakeWallTexture(preset.kind);
      this.wallMaterial.map = tex;
      this.wallMaterial.color.setHex(0xffffff);
    }
    this._updateWallTextureRepeat();
    this.wallMaterial.needsUpdate = true;
  }

  _updateWallTextureRepeat() {
    const tex = this.wallMaterial.map;
    if (!tex) return;
    const preset = WALLPAPER_PRESETS[this.currentWallpaper];
    const maxDim = Math.max(this.width, this.depth);
    let repeatX, repeatY;
    switch (preset?.kind) {
      case 'wood':      repeatX = maxDim / 2.5; repeatY = this.height / 2.5; break;
      case 'floral':    repeatX = maxDim / 1.2; repeatY = this.height / 1.2; break;
      case 'geometric': repeatX = maxDim / 1.5; repeatY = this.height / 1.5; break;
      case 'nordic':    repeatX = maxDim / 2;   repeatY = this.height / 2;   break;
      case 'stripe':    repeatX = maxDim / 0.6; repeatY = 1;                 break;
      case 'brick':     repeatX = maxDim / 2;   repeatY = this.height / 1;   break;
      case 'concrete':  repeatX = maxDim / 3;   repeatY = this.height / 3;   break;
      default:          repeatX = maxDim / 2;   repeatY = this.height / 2;
    }
    tex.repeat.set(repeatX, repeatY);
  }

  _clearDynamic() {
    for (const w of this.wallMeshes) {
      this.scene.remove(w);
      w.geometry.dispose();
    }
    this.wallMeshes.length = 0;
    // 壁インデックスごとにクローンしたマテリアルを破棄
    for (const m of this.wallMaterialsPerIndex) m.dispose();
    this.wallMaterialsPerIndex.length = 0;
    for (const b of this.baseboardMeshes) {
      this.scene.remove(b);
      b.geometry.dispose();
    }
    this.baseboardMeshes.length = 0;
  }

  updateGeometry() {
    const verts = shapeVertices(this.shape, this.width, this.depth, this.notchW, this.notchD);
    this._polygon = verts;

    // --- 床: ShapeGeometryで多角形生成。rotation.x = -π/2 で (sx, sy) → world(sx, 0, -sy)
    this.floor.geometry.dispose();
    const shape = new THREE.Shape();
    shape.moveTo(verts[0][0], -verts[0][1]);
    for (let i = 1; i < verts.length; i++) shape.lineTo(verts[i][0], -verts[i][1]);
    shape.closePath();
    const floorGeom = new THREE.ShapeGeometry(shape);
    // ShapeGeometryはデフォルトUVがx,yの値そのまま → テクスチャをタイリングするため計算し直す
    const fpreset = FLOOR_PRESETS[this.currentFloor] || { repeatDiv: 3 };
    this._applyPlanarUV(floorGeom, 1 / fpreset.repeatDiv);
    this.floor.geometry = floorGeom;
    this.floor.scale.set(1, 1, 1);
    this.floorTexture.repeat.set(1, 1); // UVで対応するのでrepeatは1

    // --- 壁と巾木を作り直す
    this._clearDynamic();
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const [ax, az] = verts[i];
      const [bx, bz] = verts[(i + 1) % n];
      const dx = bx - ax, dz = bz - az;
      const length = Math.hypot(dx, dz);
      if (length < 0.01) continue;
      const midX = (ax + bx) / 2, midZ = (az + bz) / 2;
      const angle = Math.atan2(-dz, dx); // PlaneGeometryの+X軸をエッジ方向に合わせる

      const mat = this._getWallMaterialForIndex(i);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(length, this.height), mat);
      wall.position.set(midX, this.height / 2, midZ);
      wall.rotation.y = angle;
      wall.receiveShadow = true;
      wall.userData.isRoomWall = true;
      wall.userData.wallIndex = i;
      this.scene.add(wall);
      this.wallMeshes.push(wall);

      // 巾木
      const baseGeom = new THREE.BoxGeometry(length, 0.08, 0.02);
      const base = new THREE.Mesh(baseGeom, this.baseboardMaterial);
      // 壁の内側に少し（0.012）オフセット
      const inwardX = -dz / length, inwardZ = dx / length;
      base.position.set(midX + inwardX * 0.012, 0.04, midZ + inwardZ * 0.012);
      base.rotation.y = angle;
      base.receiveShadow = true;
      this.scene.add(base);
      this.baseboardMeshes.push(base);
    }

    this._updateWallTextureRepeat();

    // --- 天井: 床と同じポリゴン形状、y=height、法線が-Y(下向き)
    this.ceiling.geometry.dispose();
    const ceilShape = new THREE.Shape();
    // ※ rotation.x=+π/2 だと (x,y)→(x,0,-y) の上、法線は -Y
    // 面が下を向くため、頂点順序は shape 上は CW（裏返す）
    ceilShape.moveTo(verts[0][0], -verts[0][1]);
    for (let i = 1; i < verts.length; i++) ceilShape.lineTo(verts[i][0], -verts[i][1]);
    ceilShape.closePath();
    const ceilGeom = new THREE.ShapeGeometry(ceilShape);
    this.ceiling.geometry = ceilGeom;
    this.ceiling.position.y = this.height;
  }

  // Shape由来のジオメトリに対して x,z平面上の等倍UVを設定
  _applyPlanarUV(geometry, scale) {
    const pos = geometry.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // 回転前: shape-y。ワールドzの反転値
      uvs[i * 2]     = x * scale;
      uvs[i * 2 + 1] = y * scale;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }

  setShape(shapeType) {
    if (!ROOM_SHAPES[shapeType]) return;
    this.shape = shapeType;
    this.updateGeometry();
  }

  setSize(width, depth, height) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.updateGeometry();
  }

  setNotch(notchW, notchD) {
    this.notchW = notchW;
    this.notchD = notchD;
    this.updateGeometry();
  }

  // 家具が多角形内に収まるようにX/Zをクランプ。外側に出ている場合は最も近い内側の点へ。
  clampInside(mesh) {
    if (mesh.userData.skipClamp) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    // ざっくり: AABB (bounding rect) で外周クランプ。L/U型の凹部へ入り込む可能性はあるが許容。
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of this._polygon) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const halfW = Math.max(0, size.x / 2);
    const halfD = Math.max(0, size.z / 2);
    mesh.position.x = Math.max(minX + halfW, Math.min(maxX - halfW, mesh.position.x));
    mesh.position.z = Math.max(minZ + halfD, Math.min(maxZ - halfD, mesh.position.z));

    // さらに: 中心点が多角形の外なら、部屋の中心に近い方向に引き戻す（凹部対策・簡易版）
    if (!pointInPolygon(mesh.position.x, mesh.position.z, this._polygon)) {
      // 部屋中心へ向けて微小に押し戻す
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      for (let step = 0; step < 20; step++) {
        mesh.position.x = mesh.position.x * 0.9 + cx * 0.1;
        mesh.position.z = mesh.position.z * 0.9 + cz * 0.1;
        if (pointInPolygon(mesh.position.x, mesh.position.z, this._polygon)) break;
      }
    }
  }
}
