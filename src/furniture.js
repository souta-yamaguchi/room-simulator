import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import {
  makeWoodTextureFurniture, makeFabricTexture,
  makeGeometricPatternTexture, makeFloralPatternTexture, makeNordicPatternTexture,
  makeWrestlingBeltPlateTexture, makeWrestlingPhotoTexture,
} from './textures.js';
import { IS_TOUCH } from './mobileControls.js';

export const FURNITURE_PRESETS = {
  bed:   { label: 'ベッド',   size: [1.4, 0.5, 2.0] },
  desk:  { label: 'デスク',   size: [1.2, 0.75, 0.6] },
  chair: { label: '椅子',     size: [0.45, 0.9, 0.45] },
  gamingChair: { label: 'ゲーミングチェア', size: [0.70, 1.55, 0.56] },
  person:      { label: '人(アバター)', size: [0.56, 1.72, 0.30] },
  cat:         { label: '猫',         size: [0.25, 0.30, 0.50] },
  dog:         { label: '犬',         size: [0.35, 0.45, 0.65] },
  middleAgedMan: { label: '社長', size: [0.60, 1.70, 0.32] },
  youngMan:      { label: '社員Y', size: [0.54, 1.76, 0.30] },
  youngWoman:    { label: 'NPC3', size: [0.48, 1.65, 0.28] },
  middleAgedManSit: { label: '社長(座り)', size: [0.62, 1.30, 0.70] },
  youngManSit:      { label: '社員Y(座り)', size: [0.56, 1.35, 0.70] },
  sofa:  { label: 'ソファ',   size: [2.0, 0.8, 0.9] },
  shelf: { label: '棚',       size: [0.8, 1.8, 0.35] },
  table: { label: 'テーブル', size: [1.0, 0.45, 1.0] },
  sink:  { label: 'シンク台', size: [1.2, 0.85, 0.55] },
  fridge:{ label: '冷蔵庫',   size: [0.6, 1.7, 0.65] },
  rack:  { label: 'ラック',   size: [0.60, 1.32, 0.32] },
  incense: { label: 'お香',   size: [0.24, 0.12, 0.24] },
  trashCan: { label: 'ごみ箱(円柱)', size: [0.32, 0.4, 0.32] },
  airconStand: { label: '床置エアコン', size: [0.35, 1.7, 0.3] },
  mirror: { label: '鏡(壁掛)', size: [0.58, 1.28, 0.05] },
  plant: { label: '観葉植物', size: [0.4, 1.2, 0.4] },
  tv:    { label: 'TV',       size: [1.3, 0.75, 0.08] },
  rug:          { label: 'ラグ(無地)',   size: [2.0, 0.01, 2.5] },
  rug_geo:      { label: 'ラグ(幾何柄)', size: [2.0, 0.01, 2.5] },
  rug_floral:   { label: 'ラグ(花柄)',   size: [2.0, 0.01, 2.5] },
  rug_nordic:   { label: 'ラグ(北欧)',   size: [2.0, 0.01, 2.5] },
  rug_round:    { label: 'カーペット(円形)', size: [1.8, 0.015, 1.8] },
  rug_patchwork:{ label: 'ラグ(パッチワーク)', size: [2.0, 0.012, 1.4] },
  poangChair:   { label: 'ラウンジチェア', size: [0.66, 0.86, 0.64] },
  roundSideTable:{ label: '丸サイドテーブル', size: [0.58, 0.42, 0.58] },
  curtain:      { label: 'カーテン',     size: [1.6, 2.2, 0.1] },
  painting:     { label: '絵画',         size: [0.6, 0.4, 0.04] },
  laptop: { label: 'ノートPC',       size: [0.35, 0.02, 0.25] },
  monitor:{ label: 'モニター',       size: [0.62, 0.45, 0.05] },
  whiteboard: { label: 'ホワイトボード', size: [1.4, 0.9, 0.03] },
  book:   { label: '本',             size: [0.16, 0.24, 0.03] },
  aircon: { label: 'エアコン',       size: [0.8, 0.28, 0.2] },
  lamp:   { label: 'デスクライト',   size: [0.2, 0.5, 0.2] },
  // プロレス系小物 (社長の趣味コーナー)
  wrestlingBelt:       { label: 'プロレスベルト',   size: [0.55, 0.06, 0.18] },
  wrestlingMask:       { label: 'プロレスマスク',   size: [0.18, 0.24, 0.20] },
  wrestlingPhotoFrame: { label: 'サイン入り写真',   size: [0.22, 0.28, 0.04] },
};

// 部屋の構造要素（壁に付ける系）。配置時に壁を突き抜けるのでclamp対象外。
export const DESIGN_PRESETS = {
  wall:       { label: '内壁',       size: [3.0, 2.7, 0.1] },
  door:       { label: 'ドア1(出口)', size: [1.0, 2.0, 0.1] },
  door2:      { label: 'ドア2(白)',  size: [1.0, 2.0, 0.1] },
  door3:      { label: 'ドア3(ガラス)', size: [1.0, 2.0, 0.1] },
  window:     { label: '窓',         size: [1.2, 1.0, 0.1] },
  passWindow: { label: '窓枠(通り抜け)', size: [1.6, 2.1, 0.1] },
  trackLight: { label: 'ダクトレール', size: [2.0, 0.1, 0.08] },
  floatShelf: { label: '壁掛け棚',    size: [1.2, 0.05, 0.28] },
  spawnPoint: { label: '訪問者スポーン地点', size: [0.4, 0.2, 0.4] },
};

// ---- マテリアル工場 -------------------------------------------------------
function woodMat(hex, repeat = [1, 1]) {
  const tex = makeWoodTextureFurniture(hex);
  tex.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.05 });
}
function fabricMat(hex, repeat = [2, 1]) {
  const tex = makeFabricTexture(hex);
  tex.repeat.set(...repeat);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
}
function matteMat(hex) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6, metalness: 0.08 });
}
function metalMat(hex) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.35, metalness: 0.7 });
}

function makePart(w, h, d, material, radius = 0.008) {
  const geo = radius > 0
    ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2.1, h / 2.1, d / 2.1))
    : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ---- 家具ビルダー ---------------------------------------------------------

function buildBed() {
  const group = new THREE.Group();
  const frameMat  = woodMat('#4a2f18', [0.5, 1]);
  const mattMat   = fabricMat('#f0f0ee', [4, 2]);
  const blanketMat = fabricMat('#b8c4d9', [3, 2]);
  const pillowMat  = fabricMat('#ffffff', [2, 1]);

  const frame = makePart(1.4, 0.18, 2.0, frameMat, 0.015);
  frame.position.y = 0.09;
  group.add(frame);

  // 脚4本
  const legMat = woodMat('#321f10', [0.5, 0.5]);
  const legs = [
    [-0.65, -0.91], [0.65, -0.91], [-0.65, 0.91], [0.65, 0.91],
  ];
  for (const [x, z] of legs) {
    const leg = makePart(0.08, 0.08, 0.08, legMat, 0.01);
    leg.position.set(x, 0.04, z);
    group.add(leg);
  }

  const mattress = makePart(1.36, 0.2, 1.96, mattMat, 0.04);
  mattress.position.y = 0.28;
  group.add(mattress);

  const blanket = makePart(1.30, 0.04, 1.2, blanketMat, 0.02);
  blanket.position.set(0, 0.40, 0.25);
  group.add(blanket);

  const pillow1 = makePart(0.55, 0.09, 0.32, pillowMat, 0.04);
  pillow1.position.set(-0.32, 0.43, -0.75);
  pillow1.rotation.z = 0.02;
  group.add(pillow1);
  const pillow2 = makePart(0.55, 0.09, 0.32, pillowMat, 0.04);
  pillow2.position.set(0.32, 0.43, -0.75);
  pillow2.rotation.z = -0.02;
  group.add(pillow2);

  return group;
}

function buildDesk() {
  const group = new THREE.Group();
  const wood = woodMat('#8b5a2b', [1, 1]);
  const legWood = woodMat('#6b431f', [0.3, 1]);

  const top = makePart(1.2, 0.04, 0.6, wood, 0.01);
  top.position.y = 0.73;
  group.add(top);

  const legPos = [
    [-0.56, -0.26], [0.56, -0.26], [-0.56, 0.26], [0.56, 0.26],
  ];
  for (const [x, z] of legPos) {
    const leg = makePart(0.06, 0.71, 0.06, legWood, 0.006);
    leg.position.set(x, 0.355, z);
    group.add(leg);
  }

  // 引き出し（右側）
  const drawer = makePart(0.5, 0.22, 0.52, wood, 0.01);
  drawer.position.set(0.28, 0.56, 0);
  group.add(drawer);
  const handle = makePart(0.12, 0.025, 0.02, metalMat(0xaaaaaa));
  handle.position.set(0.28, 0.56, 0.27);
  group.add(handle);

  return group;
}

function buildChair() {
  const group = new THREE.Group();
  const seatMat = woodMat('#3d2a1a', [1, 1]);
  const legMat = matteMat(0x222222);

  const seat = makePart(0.45, 0.04, 0.45, seatMat, 0.01);
  seat.position.y = 0.45;
  group.add(seat);

  const back = makePart(0.45, 0.45, 0.04, seatMat, 0.02);
  back.position.set(0, 0.69, -0.205);
  group.add(back);

  const legPos = [
    [-0.20, -0.20], [0.20, -0.20], [-0.20, 0.20], [0.20, 0.20],
  ];
  for (const [x, z] of legPos) {
    const leg = makePart(0.04, 0.45, 0.04, legMat, 0.005);
    leg.position.set(x, 0.225, z);
    group.add(leg);
  }

  return group;
}

function buildSofa() {
  const group = new THREE.Group();
  const baseMat  = fabricMat('#5a6a7a', [3, 1]);
  const cushMat  = fabricMat('#6a7a8a', [2, 1]);
  const backMat  = fabricMat('#6a7a8a', [3, 1]);
  const legMat = woodMat('#2a1a0a', [0.3, 1]);

  // 本体（ベース）
  const base = makePart(2.0, 0.25, 0.9, baseMat, 0.03);
  base.position.y = 0.15;
  group.add(base);

  // 背もたれ
  const back = makePart(2.0, 0.5, 0.22, backMat, 0.05);
  back.position.set(0, 0.52, -0.34);
  group.add(back);

  // 座面クッション2個
  const cush1 = makePart(0.92, 0.16, 0.7, cushMat, 0.05);
  cush1.position.set(-0.5, 0.36, 0.05);
  group.add(cush1);
  const cush2 = makePart(0.92, 0.16, 0.7, cushMat, 0.05);
  cush2.position.set(0.5, 0.36, 0.05);
  group.add(cush2);

  // アームレスト
  const armL = makePart(0.18, 0.45, 0.9, baseMat, 0.05);
  armL.position.set(-0.91, 0.5, 0);
  group.add(armL);
  const armR = makePart(0.18, 0.45, 0.9, baseMat, 0.05);
  armR.position.set(0.91, 0.5, 0);
  group.add(armR);

  // 脚
  const legPos = [
    [-0.90, -0.40], [0.90, -0.40], [-0.90, 0.40], [0.90, 0.40],
  ];
  for (const [x, z] of legPos) {
    const leg = makePart(0.05, 0.05, 0.05, legMat, 0.005);
    leg.position.set(x, 0.025, z);
    group.add(leg);
  }

  return group;
}

function buildShelf() {
  const group = new THREE.Group();
  const wood = woodMat('#6b431f', [0.4, 1.5]);
  const backWood = woodMat('#4a2f18', [0.5, 1.5]);

  // 側板
  const sideL = makePart(0.03, 1.8, 0.35, wood, 0.003);
  sideL.position.set(-0.385, 0.9, 0);
  group.add(sideL);
  const sideR = makePart(0.03, 1.8, 0.35, wood, 0.003);
  sideR.position.set(0.385, 0.9, 0);
  group.add(sideR);

  // 背板
  const backPanel = makePart(0.77, 1.8, 0.015, backWood, 0);
  backPanel.position.set(0, 0.9, -0.17);
  group.add(backPanel);

  // 天板と棚板
  const shelfYs = [0.02, 0.38, 0.74, 1.10, 1.46, 1.78];
  for (const y of shelfYs) {
    const board = makePart(0.77, 0.025, 0.33, wood, 0.003);
    board.position.set(0, y, 0);
    group.add(board);
  }

  return group;
}

// お香 (アロマディフューザー風): 磨りガラス白 + 温かい発光 + ポイントライト
function buildIncense() {
  const group = new THREE.Group();
  // 磨りガラス風の素材(半透明+発光)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xfff3de,
    roughness: 0.45,
    metalness: 0.1,
    emissive: 0xffa860,
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.88,
  });
  // 下段(末広がり)
  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.115, 0.045, 32),
    bodyMat,
  );
  bottom.position.y = 0.023;
  bottom.castShadow = true;
  group.add(bottom);
  // 中段(ストレート)
  const middle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.035, 32),
    bodyMat,
  );
  middle.position.y = 0.063;
  group.add(middle);
  // 上部ドーム(半球を潰した形)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.10, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    bodyMat,
  );
  dome.scale.y = 0.48;
  dome.position.y = 0.080;
  dome.castShadow = true;
  group.add(dome);
  // 内部の温かい光源(周囲の床/壁を弱く照らす)
  const light = new THREE.PointLight(0xffb070, 0.8, 1.8, 2);
  light.position.y = 0.07;
  group.add(light);

  return group;
}

// インダストリアル風4段ラック: 黒金属フレーム + 木製棚板 + X型クロスブレース
function buildRack() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.5, metalness: 0.65,
  });
  const wood = woodMat('#6b4a2a', [1.3, 1]);

  const W = 0.60, D = 0.32, H = 1.32;
  const postR = 0.014;

  // 4本の縦ポスト
  const postCoords = [
    [-W/2 + postR,  D/2 - postR],
    [ W/2 - postR,  D/2 - postR],
    [-W/2 + postR, -D/2 + postR],
    [ W/2 - postR, -D/2 + postR],
  ];
  for (const [x, z] of postCoords) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(postR, postR, H, 10), metal,
    );
    post.position.set(x, H / 2, z);
    post.castShadow = true;
    group.add(post);
    // 底の足キャップ
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(postR * 1.5, postR * 1.8, 0.02, 14), metal,
    );
    foot.position.set(x, 0.01, z);
    group.add(foot);
  }

  // 4段の棚板 + それを支える横バー(前後)
  const shelfYs = [0.05, 0.42, 0.79, 1.16];
  for (const y of shelfYs) {
    // 棚板本体
    const shelf = makePart(W - 0.03, 0.022, D - 0.03, wood, 0.005);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);
    // 棚を受ける横バー (前後2本、金属)
    for (const sz of [D/2 - postR, -(D/2 - postR)]) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(postR * 0.7, postR * 0.7, W - postR * 2, 8), metal,
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, y - 0.015, sz);
      group.add(bar);
    }
  }

  // 両サイドのXクロスブレース (上下ポスト間全体を大きく貫く1つのX)
  const braceR = postR * 0.45;
  const braceLen = Math.hypot(H - 0.12, D - postR * 2);
  const braceAngle = Math.atan2(D - postR * 2, H - 0.12);
  for (const sx of [-1, 1]) {
    for (const signAngle of [1, -1]) {
      const brace = new THREE.Mesh(
        new THREE.CylinderGeometry(braceR, braceR, braceLen, 8), metal,
      );
      brace.position.set(sx * (W / 2 - postR), H / 2, 0);
      brace.rotation.x = braceAngle * signAngle;
      brace.castShadow = true;
      group.add(brace);
    }
  }

  return group;
}

function buildTable() {
  const group = new THREE.Group();
  const wood = woodMat('#a07040', [1, 1]);
  const legWood = woodMat('#7e5426', [0.3, 1]);

  const top = makePart(1.0, 0.04, 1.0, wood, 0.01);
  top.position.y = 0.43;
  group.add(top);

  // 脚の間のフレーム（補強）
  const frameMat = legWood;
  const frameLong = makePart(0.92, 0.04, 0.05, frameMat, 0.005);
  frameLong.position.set(0, 0.38, -0.44);
  group.add(frameLong);
  const frameLong2 = frameLong.clone();
  frameLong2.position.z = 0.44;
  group.add(frameLong2);

  const legPos = [
    [-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46],
  ];
  for (const [x, z] of legPos) {
    const leg = makePart(0.05, 0.41, 0.05, legWood, 0.005);
    leg.position.set(x, 0.205, z);
    group.add(leg);
  }

  return group;
}

function buildAircon() {
  const group = new THREE.Group();
  const bodyMat = matteMat(0xeeeeee);
  const vent = matteMat(0xcccccc);
  const lcdMat = new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: 0x224466, emissiveIntensity: 0.25, roughness: 0.2,
  });

  const body = makePart(0.8, 0.28, 0.2, bodyMat, 0.025);
  body.position.y = 0.14;
  group.add(body);

  // ルーバー（吹き出し口）
  const louver = makePart(0.72, 0.02, 0.09, vent, 0);
  louver.position.set(0, 0.04, 0.055);
  louver.rotation.x = 0.3;
  group.add(louver);

  // LED
  const lcd = makePart(0.1, 0.03, 0.01, lcdMat, 0);
  lcd.position.set(0.25, 0.12, 0.102);
  group.add(lcd);

  return group;
}

function buildLamp() {
  const group = new THREE.Group();
  const baseMat = matteMat(0x2a2a2a);
  const armMat = metalMat(0x888888);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0xf5f0a0, emissive: 0xfff0a0, emissiveIntensity: 0.5, roughness: 0.4,
  });

  // 台座
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.02, 24), baseMat,
  );
  base.position.y = 0.01;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // アーム（縦）
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.4, 12), armMat,
  );
  stem.position.y = 0.22;
  stem.castShadow = true;
  group.add(stem);

  // アーム曲がり（斜め）
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.18, 12), armMat,
  );
  arm.position.set(0.06, 0.43, 0);
  arm.rotation.z = -Math.PI / 4;
  arm.castShadow = true;
  group.add(arm);

  // シェード（円錐）
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.12, 20, 1, true), shadeMat,
  );
  shade.position.set(0.12, 0.43, 0);
  shade.rotation.z = Math.PI / 2 + 0.3;
  shade.castShadow = true;
  group.add(shade);

  // 小さなPointLight
  const bulb = new THREE.PointLight(0xfff5c0, 0.3, 1.5, 2);
  bulb.position.set(0.14, 0.42, 0);
  group.add(bulb);

  return group;
}

function buildWhiteboard() {
  const group = new THREE.Group();
  const frameMat = matteMat(0x555555);
  const boardMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa, roughness: 0.3, metalness: 0.05,
  });

  const frame = makePart(1.42, 0.92, 0.04, frameMat, 0.005);
  frame.position.y = 0.46;
  group.add(frame);
  const board = makePart(1.35, 0.85, 0.02, boardMat, 0.002);
  board.position.set(0, 0.46, 0.02);
  group.add(board);

  // トレイ
  const trayMat = matteMat(0x333333);
  const tray = makePart(0.5, 0.03, 0.06, trayMat, 0.005);
  tray.position.set(0, 0.01, 0.05);
  group.add(tray);

  return group;
}

function buildBook() {
  const group = new THREE.Group();
  const colors = [0x8b3a3a, 0x2a4a7a, 0x3a7a4a, 0x7a6a3a, 0x5a3a6a];
  const colorA = colors[Math.floor(Math.random() * colors.length)];
  const coverMat = matteMat(colorA);
  const pagesMat = matteMat(0xf5f2e8);

  const cover = makePart(0.16, 0.24, 0.03, coverMat, 0.002);
  cover.position.y = 0.12;
  group.add(cover);
  const pages = makePart(0.145, 0.22, 0.025, pagesMat, 0);
  pages.position.set(0, 0.12, 0);
  group.add(pages);

  return group;
}

// チャンピオンベルト: 茶革ベルト + 縦長シールド型の中央プレート(テクスチャ付き) + 角形サブプレート
function buildWrestlingBelt() {
  const group = new THREE.Group();
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3a1f12, roughness: 0.85, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a838, roughness: 0.32, metalness: 0.85 });
  const goldDarkMat = new THREE.MeshStandardMaterial({ color: 0xb88820, roughness: 0.4, metalness: 0.8 });
  // 中央プレートのテクスチャマテリアル(W ★ CHAMPION ★ WORLD)
  const plateTex = makeWrestlingBeltPlateTexture();
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.32, metalness: 0.7 });

  // ベルト本体(茶革) - 薄く長い
  const strap = makePart(0.55, 0.022, 0.16, leatherMat, 0.004);
  strap.position.y = 0.011;
  group.add(strap);

  // 中央プレート(縦長シールド): ベース金板
  const plateBase = makePart(0.20, 0.010, 0.22, goldMat, 0.014);
  plateBase.position.set(0, 0.029, 0);
  plateBase.castShadow = true;
  group.add(plateBase);

  // 中央プレートの上面: テクスチャ付き平面 (W字+CHAMPION文字)
  const plateFaceGeo = new THREE.PlaneGeometry(0.184, 0.204);
  const plateFace = new THREE.Mesh(plateFaceGeo, plateMat);
  plateFace.rotation.x = -Math.PI / 2;
  plateFace.position.set(0, 0.0345, 0);
  group.add(plateFace);

  // 中央プレート両脇に「翼」風の小さな金パーツ(イーグル風)
  for (const sx of [-1, 1]) {
    const wing = makePart(0.045, 0.008, 0.060, goldDarkMat, 0.005);
    wing.position.set(sx * 0.115, 0.026, 0);
    wing.rotation.y = sx * 0.3;
    group.add(wing);
  }

  // 両サイドの角形サブプレート(各サイド1つ、計2つ)
  for (const sx of [-1, 1]) {
    const xo = sx * 0.21;
    // 角丸の四角プレート
    const sub = makePart(0.085, 0.012, 0.110, goldMat, 0.008);
    sub.position.set(xo, 0.027, 0);
    group.add(sub);
    // プレート内側のダーク縁取り
    const subBorder = makePart(0.070, 0.014, 0.092, goldDarkMat, 0.006);
    subBorder.position.set(xo, 0.029, 0);
    group.add(subBorder);
    // プレート中央の金の星(平たい角ダイヤ)
    const star = makePart(0.028, 0.008, 0.028, goldMat, 0.003);
    star.position.set(xo, 0.034, 0);
    star.rotation.y = Math.PI / 4;
    group.add(star);
    // 4隅のリベット
    for (const rx of [-0.030, 0.030]) {
      for (const rz of [-0.042, 0.042]) {
        const rivet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8),
          goldDarkMat,
        );
        rivet.position.set(xo + rx, 0.034, rz);
        group.add(rivet);
      }
    }
  }

  // ベルトの縁ステッチ風に細いライン (上下に2本)
  const stitchMat = matteMat(0xb87838);
  for (const zo of [-0.072, 0.072]) {
    const stitch = makePart(0.55, 0.004, 0.006, stitchMat, 0);
    stitch.position.set(0, 0.024, zo);
    group.add(stitch);
  }

  return group;
}

// プロレスマスク: ヘルメット型 (下が開いた半球) + 立体的な目周り + 額稲妻 + 後頭部編み紐 + 立派なスタンド
function buildWrestlingMask() {
  const group = new THREE.Group();
  const redMat = matteMat(0xc81e2e);
  const redDarkMat = matteMat(0x8a1820);
  const blackMat = matteMat(0x0a0a0a);
  const yellowMat = matteMat(0xffd735);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4a838, roughness: 0.35, metalness: 0.7 });
  const whiteMat = matteMat(0xffffff);

  // スタンド台座(2段、装飾的に)
  const standBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.100, 0.014, 24),
    blackMat,
  );
  standBase.position.y = 0.007;
  standBase.castShadow = true;
  group.add(standBase);
  const standUpper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.085, 0.010, 22),
    blackMat,
  );
  standUpper.position.y = 0.019;
  group.add(standUpper);
  // スタンド上面の金リング(装飾)
  const standRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.005, 22),
    goldMat,
  );
  standRing.position.y = 0.026;
  group.add(standRing);

  // スタンド首ポール
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.075, 12),
    blackMat,
  );
  pole.position.y = 0.066;
  group.add(pole);

  // マスク本体: ヘルメット型(下が開いた球の上7割)
  // SphereGeometry の thetaLength で「上から下までどこまで覆うか」を制御
  const headGeo = new THREE.SphereGeometry(0.095, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.72);
  const head = new THREE.Mesh(headGeo, redMat);
  head.scale.set(1.0, 1.20, 0.95); // 縦長・前後やや薄め
  head.position.y = 0.180;
  head.castShadow = true;
  group.add(head);

  // 頭頂のセンタークレスト(モヒカン風の盛り上がり)
  const crest = makePart(0.022, 0.130, 0.022, redDarkMat, 0.004);
  crest.position.set(0, 0.255, 0);
  crest.castShadow = true;
  group.add(crest);
  // クレストの先端に金の星
  const crestStar = makePart(0.022, 0.018, 0.022, goldMat, 0.003);
  crestStar.position.set(0, 0.323, 0);
  crestStar.rotation.y = Math.PI / 4;
  group.add(crestStar);

  // 目穴(黒い深め楕円)
  for (const sx of [-1, 1]) {
    const eyeHole = makePart(0.040, 0.026, 0.014, blackMat, 0.005);
    eyeHole.position.set(sx * 0.034, 0.190, 0.078);
    group.add(eyeHole);
  }

  // 目の周りの黄色いトーラス(半円)で立体的なゴーグル感
  for (const sx of [-1, 1]) {
    const eyeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.026, 0.005, 6, 16, Math.PI),
      yellowMat,
    );
    eyeRing.position.set(sx * 0.034, 0.197, 0.082);
    eyeRing.rotation.x = -Math.PI / 2;
    group.add(eyeRing);
  }

  // 眉のV字ライン(目の上)
  for (const sx of [-1, 1]) {
    const brow = makePart(0.030, 0.010, 0.008, blackMat, 0.002);
    brow.position.set(sx * 0.026, 0.221, 0.078);
    brow.rotation.z = sx * 0.5;
    group.add(brow);
  }

  // 額の黄色い稲妻(ジグザグ3パーツ)
  const boltSegs = [
    { x: 0.000, y: 0.265, w: 0.016, h: 0.026, rot: 0.45 },
    { x: 0.013, y: 0.245, w: 0.014, h: 0.022, rot: -0.55 },
    { x: 0.000, y: 0.227, w: 0.012, h: 0.018, rot: 0.35 },
  ];
  for (const b of boltSegs) {
    const seg = makePart(b.w, b.h, 0.009, yellowMat, 0.002);
    seg.position.set(b.x, b.y, 0.075);
    seg.rotation.z = b.rot;
    group.add(seg);
  }

  // 鼻の盛り上がり
  const noseRidge = makePart(0.014, 0.040, 0.012, redDarkMat, 0.003);
  noseRidge.position.set(0, 0.166, 0.090);
  group.add(noseRidge);

  // 口元の黒い口開口
  const mouthHole = makePart(0.052, 0.014, 0.010, blackMat, 0.004);
  mouthHole.position.set(0, 0.122, 0.085);
  group.add(mouthHole);
  // 口の上の白い歯ライン
  const teethLine = makePart(0.040, 0.005, 0.008, whiteMat, 0.001);
  teethLine.position.set(0, 0.130, 0.090);
  group.add(teethLine);

  // サイドの白いストライプ(顔の側面、下方向に)
  for (const sx of [-1, 1]) {
    const stripe = makePart(0.012, 0.140, 0.010, whiteMat, 0.002);
    stripe.position.set(sx * 0.078, 0.190, 0.040);
    stripe.rotation.z = sx * 0.18;
    stripe.rotation.x = -0.10;
    group.add(stripe);
  }

  // 後頭部の編み上げ紐(白い玉が縦に4つ並ぶ)
  for (let i = 0; i < 4; i++) {
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.010, 10, 8), whiteMat);
    knot.position.set(0, 0.150 + i * 0.025, -0.080);
    group.add(knot);
  }
  // 編み上げ紐の左右の交差ライン
  for (let i = 0; i < 3; i++) {
    const y = 0.165 + i * 0.025;
    for (const sx of [-1, 1]) {
      const cross = makePart(0.024, 0.004, 0.006, whiteMat, 0);
      cross.position.set(sx * 0.014, y, -0.080);
      cross.rotation.z = sx * 0.6;
      group.add(cross);
    }
  }
  // 後ろに垂れ下がる紐の端(ビラビラ2本)
  for (const sx of [-1, 1]) {
    const lace = makePart(0.006, 0.050, 0.005, whiteMat, 0);
    lace.position.set(sx * 0.012, 0.130, -0.082);
    lace.rotation.z = sx * 0.25;
    group.add(lace);
  }

  return group;
}

// サイン入り写真フレーム: 木枠 + テクスチャ写真(リング/レスラー/赤いサイン文字) + 立てかけ脚
function buildWrestlingPhotoFrame() {
  const group = new THREE.Group();
  const frameMat = woodMat('#4a2f18', [0.5, 0.5]);
  const photoTex = makeWrestlingPhotoTexture();
  const photoMat = new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.6, metalness: 0 });

  // フレーム背面(写真の裏板)
  const back = makePart(0.20, 0.26, 0.012, frameMat, 0.003);
  back.position.set(0, 0.13, 0);
  back.castShadow = true;
  group.add(back);

  // 写真面(テクスチャ付き平面、フレーム内側に配置)
  const photoGeo = new THREE.PlaneGeometry(0.176, 0.236);
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.position.set(0, 0.13, 0.011);
  group.add(photo);

  // フレーム外枠(4辺) - 厚みを出して立体的に
  const frameThick = 0.022;
  const frameDepth = 0.016;
  const top = makePart(0.220, frameThick, frameDepth, frameMat, 0.003);
  top.position.set(0, 0.259, 0.014);
  group.add(top);
  const bottom = makePart(0.220, frameThick, frameDepth, frameMat, 0.003);
  bottom.position.set(0, 0.001, 0.014);
  group.add(bottom);
  const left = makePart(frameThick, 0.272, frameDepth, frameMat, 0.003);
  left.position.set(-0.099, 0.13, 0.014);
  group.add(left);
  const right = makePart(frameThick, 0.272, frameDepth, frameMat, 0.003);
  right.position.set(0.099, 0.13, 0.014);
  group.add(right);

  // フレーム内側のうっすら金縁(高級感)
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xb88820, roughness: 0.4, metalness: 0.6 });
  const trimDepth = 0.010;
  for (const [w, h, x, y] of [
    [0.184, 0.005, 0, 0.245], [0.184, 0.005, 0, 0.015],
    [0.005, 0.230, -0.090, 0.13], [0.005, 0.230, 0.090, 0.13],
  ]) {
    const trim = makePart(w, h, trimDepth, goldTrimMat, 0.001);
    trim.position.set(x, y, 0.008);
    group.add(trim);
  }

  // 立てかけ用の支え脚(背面に斜め)
  const standMat = woodMat('#3a2410', [0.5, 0.5]);
  const standLeg = makePart(0.020, 0.190, 0.014, standMat, 0.003);
  standLeg.position.set(0, 0.105, -0.062);
  standLeg.rotation.x = -0.38;
  group.add(standLeg);

  return group;
}

function buildLaptop() {
  const group = new THREE.Group();
  const bodyMat = matteMat(0x111111);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a2a, emissive: 0x0a1a3a, emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const keyMat = matteMat(0x2a2a2a);

  // キーボード側（base）
  const base = makePart(0.35, 0.018, 0.25, bodyMat, 0.008);
  base.position.y = 0.009;
  group.add(base);

  // キーパッド
  const keys = makePart(0.30, 0.003, 0.15, keyMat, 0);
  keys.position.set(0, 0.020, 0.03);
  group.add(keys);

  // タッチパッド
  const pad = makePart(0.10, 0.002, 0.07, matteMat(0x1a1a1a), 0);
  pad.position.set(0, 0.020, -0.08);
  group.add(pad);

  // スクリーン（少し開いている角度）
  const screen = new THREE.Group();
  const screenBack = makePart(0.35, 0.22, 0.012, bodyMat, 0.008);
  screenBack.position.set(0, 0.11, 0);
  screen.add(screenBack);
  const screenFront = makePart(0.33, 0.20, 0.003, screenMat, 0);
  screenFront.position.set(0, 0.11, 0.008);
  screen.add(screenFront);
  // ヒンジ: スクリーンは少し後ろに傾いた角度
  screen.position.set(0, 0.018, 0.12);
  screen.rotation.x = 0.12;
  group.add(screen);

  return group;
}

// モニター画面用の共有テクスチャ（main.js で `setMonitorRenderTexture` をセットする）
let monitorScreenTexture = null;
export function setMonitorRenderTexture(tex) {
  monitorScreenTexture = tex;
  // 既に生成済みの画面マテリアルにも反映
  for (const mat of _registeredMonitorMaterials) {
    mat.map = tex;
    mat.needsUpdate = true;
  }
}
const _registeredMonitorMaterials = new Set();

function buildMonitor() {
  const group = new THREE.Group();
  const bezelMat = matteMat(0x0a0a0a);
  // 画面: RenderTarget のテクスチャがあればそれ、無ければ青黒の発光
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: monitorScreenTexture ?? null,
    toneMapped: false,
  });
  _registeredMonitorMaterials.add(screenMat);
  const standMat = matteMat(0x222222);

  const bezel = makePart(0.62, 0.38, 0.04, bezelMat, 0.005);
  bezel.position.y = 0.40;
  group.add(bezel);
  const screen = makePart(0.58, 0.34, 0.02, screenMat, 0);
  screen.position.set(0, 0.40, 0.025);
  // 色ピッカーや複製でRT材質を壊さないよう保護
  screen.userData.noTint = true;
  screen.userData.isMonitorScreen = true;
  group.add(screen);

  // ネック
  const neck = makePart(0.06, 0.18, 0.06, standMat, 0.006);
  neck.position.set(0, 0.11, 0);
  group.add(neck);

  // 台座
  const base = makePart(0.24, 0.015, 0.18, standMat, 0.004);
  base.position.set(0, 0.0075, 0);
  group.add(base);

  return group;
}

function buildRugBase(material) {
  const group = new THREE.Group();
  const plane = makePart(2.0, 0.01, 2.5, material, 0);
  plane.position.y = 0.005;
  plane.castShadow = false;
  plane.receiveShadow = true;
  group.add(plane);
  return group;
}

function buildRug() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8b8bb, roughness: 0.9 });
  const group = buildRugBase(mat);
  // 縁取り
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x909096, roughness: 0.9 });
  const borderT = 0.05, borderH = 0.012;
  const borders = [
    makePart(2.0, borderH, borderT, borderMat, 0),
    makePart(2.0, borderH, borderT, borderMat, 0),
    makePart(borderT, borderH, 2.5, borderMat, 0),
    makePart(borderT, borderH, 2.5, borderMat, 0),
  ];
  borders[0].position.set(0, 0.012, -2.5/2 + borderT/2);
  borders[1].position.set(0, 0.012,  2.5/2 - borderT/2);
  borders[2].position.set(-2.0/2 + borderT/2, 0.012, 0);
  borders[3].position.set( 2.0/2 - borderT/2, 0.012, 0);
  for (const b of borders) { b.castShadow = false; b.receiveShadow = true; group.add(b); }
  return group;
}

function buildRugGeo() {
  const tex = makeGeometricPatternTexture();
  tex.repeat.set(2, 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return buildRugBase(mat);
}

function buildRugFloral() {
  const tex = makeFloralPatternTexture();
  tex.repeat.set(2, 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return buildRugBase(mat);
}

function buildRugNordic() {
  const tex = makeNordicPatternTexture();
  tex.repeat.set(2, 2);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  return buildRugBase(mat);
}

// 円形カーペット: 本体(ベージュ起毛) + 同心円の縁取り2重
function buildRugRound() {
  const group = new THREE.Group();
  const radius = 0.9;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd8c8ad, roughness: 0.95, side: THREE.DoubleSide,
  });
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xa08868, roughness: 0.95,
  });
  // 本体の円盤
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.012, 48), bodyMat,
  );
  body.position.y = 0.006;
  body.receiveShadow = true;
  body.castShadow = false;
  group.add(body);
  // 外側の細い縁(リング)
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.02, 0.012, 8, 64), borderMat,
  );
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.y = 0.014;
  group.add(outerRing);
  // 内側のアクセントリング
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.55, 0.008, 8, 48), borderMat,
  );
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.014;
  group.add(innerRing);
  return group;
}

// ---- 写真の部屋を再現するための家具: ラウンジチェア / 丸サイドテーブル / パッチワークラグ ----

// パッチワーク柄キャンバスを作る。タイルは均等サイズの 5×3 グリッドで、
// 各タイルの色は写真と同じ4色パレットからランダムで選ぶ。
const PATCHWORK_PALETTE = ['#e8e0d0', '#3a3a3a', '#9c9c9c', '#dcc060'];
const PATCHWORK_COLS = 5;
const PATCHWORK_ROWS = 3;

function makePatchworkRugTexture() {
  const c = document.createElement('canvas');
  c.width = 500; c.height = 300; // 5:3 比率 (2.0m × 1.4m に近い)
  const ctx = c.getContext('2d');
  const tw = c.width / PATCHWORK_COLS;
  const th = c.height / PATCHWORK_ROWS;
  for (let r = 0; r < PATCHWORK_ROWS; r++) {
    for (let col = 0; col < PATCHWORK_COLS; col++) {
      const color = PATCHWORK_PALETTE[Math.floor(Math.random() * PATCHWORK_PALETTE.length)];
      ctx.fillStyle = color;
      ctx.fillRect(col * tw, r * th, tw, th);
    }
  }
  // 起毛ノイズ
  for (let i = 0; i < 16000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  for (let i = 0; i < 8000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRugPatchwork() {
  const mat = new THREE.MeshStandardMaterial({
    map: makePatchworkRugTexture(),
    roughness: 0.95,
    metalness: 0,
  });
  const group = new THREE.Group();
  const plane = makePart(2.0, 0.012, 1.4, mat, 0);
  plane.position.y = 0.006;
  plane.castShadow = false;
  plane.receiveShadow = true;
  // 複製時にテクスチャを差し替える対象として印を付ける
  plane.userData.isPatchworkSurface = true;
  group.add(plane);
  return group;
}

// 複製時に「内容」をランダム化する家具向けのフック。
// 現状は rug_patchwork のタイル色を複製ごとに振り直すために使う。
export function randomizeFurnitureContent(obj) {
  if (!obj?.userData) return;
  // ユーザが色オーバーライドを当てている場合は手を入れない
  if (obj.userData.colorOverride) return;
  if (obj.userData.furnitureType === 'rug_patchwork') {
    obj.traverse((child) => {
      if (!child.isMesh || !child.material) return;
      if (!child.userData?.isPatchworkSurface) return;
      const newTex = makePatchworkRugTexture();
      // 複製時にマテリアルもクローン済みなので map だけ差し替えればOK
      const oldMap = child.material.map;
      child.material.map = newTex;
      child.material.needsUpdate = true;
      if (oldMap) oldMap.dispose();
    });
  }
}

// 北欧ミッドセンチュリー風ラウンジチェア (Finn Juhl / Fredrik Kayser 系)
// 4本脚 + 有機的な曲線アームレスト + 上に向かって少し広がる台形の背もたれ。
function buildPoangChair() {
  const group = new THREE.Group();
  const wood = woodMat('#6b432a', [1, 1]);
  const cushion = fabricMat('#9c9ca0', [2, 2]);

  // テーパー脚生成
  const makeLeg = (botX, botZ, topX, topZ, topY, botR, topR) => {
    const dx = topX - botX, dy = topY, dz = topZ - botZ;
    const len = Math.hypot(dx, dy, dz);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(topR, botR, len, 14), wood,
    );
    leg.position.set((botX + topX) / 2, topY / 2, (botZ + topZ) / 2);
    leg.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, dz).normalize(),
    );
    leg.castShadow = true;
    leg.receiveShadow = true;
    return leg;
  };

  // 比率: 座面トップ 38cm / 背もたれトップ 80cm
  const SEAT_TOP_Y = 0.38;
  const BACK_TOP_Y = 0.80;

  // 前脚: 床→座面下まで(30cm)
  group.add(makeLeg(-0.30,  0.27, -0.26,  0.25, 0.30, 0.022, 0.020));
  group.add(makeLeg( 0.30,  0.27,  0.26,  0.25, 0.30, 0.022, 0.020));
  // 後脚: 床→背もたれ上まで(80cm)、上端はわずかに後傾
  group.add(makeLeg(-0.30, -0.26, -0.26, -0.30, BACK_TOP_Y, 0.022, 0.018));
  group.add(makeLeg( 0.30, -0.26,  0.26, -0.30, BACK_TOP_Y, 0.022, 0.018));

  // アームレスト: 前脚上端 (y=0.30) から後脚途中まで滑らかにカーブ、最高点 ~50cm
  const buildArmrest = (flip) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.30,  0.25),
      new THREE.Vector3(0, 0.36,  0.16),
      new THREE.Vector3(0, 0.42,  0.02),
      new THREE.Vector3(0, 0.46, -0.10),
      new THREE.Vector3(0, 0.50, -0.22),
    ], false, 'catmullrom', 0.4);
    const cross = new THREE.Shape();
    const SEG = 20;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const cx = Math.cos(a) * 0.025;
      const cy = Math.sin(a) * 0.012;
      if (i === 0) cross.moveTo(cx, cy);
      else cross.lineTo(cx, cy);
    }
    cross.closePath();
    const geom = new THREE.ExtrudeGeometry(cross, {
      extrudePath: curve, steps: 30, bevelEnabled: false,
    });
    const mesh = new THREE.Mesh(geom, wood);
    mesh.position.x = 0.26 * flip;
    mesh.castShadow = true;
    return mesh;
  };
  group.add(buildArmrest(-1));
  group.add(buildArmrest( 1));

  // スカート (座面下に 4 辺の角材枠、座面ボトム=30cm の少し下)
  const SKIRT_Y = 0.27;
  const skirtFront = makePart(0.50, 0.022, 0.025, wood, 0.005);
  skirtFront.position.set(0, SKIRT_Y,  0.26);
  group.add(skirtFront);
  const skirtBack = makePart(0.50, 0.022, 0.025, wood, 0.005);
  skirtBack.position.set(0, SKIRT_Y, -0.26);
  group.add(skirtBack);
  const skirtL = makePart(0.025, 0.022, 0.50, wood, 0.005);
  skirtL.position.set(-0.26, SKIRT_Y, 0);
  group.add(skirtL);
  const skirtR = makePart(0.025, 0.022, 0.50, wood, 0.005);
  skirtR.position.set( 0.26, SKIRT_Y, 0);
  group.add(skirtR);

  // 座面クッション (8cm 厚): 中心 y=0.34, トップ y=0.38
  const seat = makePart(0.48, 0.08, 0.48, cushion, 0.035);
  seat.position.set(0, 0.34, 0.01);
  seat.castShadow = true;
  group.add(seat);

  // 背もたれクッション: 上に向かって少し広がる台形 + 角丸 + 後傾 ~10°
  // (Shape を作って Extrude し、ベベルで角丸を表現)
  const makeTrapezoidShape = (bottomW, topW, height, r) => {
    const hb = bottomW / 2, ht = topW / 2;
    const hh = height / 2;
    const s = new THREE.Shape();
    // 下辺 → 右下角 → 右斜め辺 → 右上角 → 上辺 → 左上角 → 左斜め辺 → 左下角 → 戻る
    s.moveTo(-hb + r, -hh);
    s.lineTo(hb - r, -hh);
    s.quadraticCurveTo(hb, -hh, hb, -hh + r);
    s.lineTo(ht, hh - r);
    s.quadraticCurveTo(ht, hh, ht - r, hh);
    s.lineTo(-ht + r, hh);
    s.quadraticCurveTo(-ht, hh, -ht, hh - r);
    s.lineTo(-hb, -hh + r);
    s.quadraticCurveTo(-hb, -hh, -hb + r, -hh);
    return s;
  };
  const backShape = makeTrapezoidShape(0.44, 0.50, 0.40, 0.05);
  const backGeom = new THREE.ExtrudeGeometry(backShape, {
    depth: 0.10,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 3,
  });
  backGeom.translate(0, 0, -0.05); // 厚みを Z 中央に揃える
  const back = new THREE.Mesh(backGeom, cushion);
  // 後傾 18° (=−0.314rad)。Three.js では rotation.x が負のとき +Y軸が −Z方向へ回る
  // = 「背もたれの上端が後ろ側(座る人から遠ざかる方向)へ倒れる」
  // 中心 y=0.60, 中心 z=-0.238 → ボトム y≈0.41/z≈-0.176 (座面のやや上・前方)
  //                              トップ y≈0.79/z≈-0.30 (後脚最上端と揃う)
  back.position.set(0, 0.60, -0.238);
  back.rotation.x = -0.314;
  back.castShadow = true;
  group.add(back);

  return group;
}

// 写真の丸テーブル: マーブル風グレー天板 + 黒い3本脚(やや外側に開く)
function buildRoundSideTable() {
  const group = new THREE.Group();
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xc8c6c2,
    roughness: 0.45,
    metalness: 0.1,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.45,
    metalness: 0.4,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.55,
    metalness: 0.25,
  });

  // 天板 (シリンダー)
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.035, 48), topMat,
  );
  top.position.y = 0.41;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  // 天板の側面アクセント
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.292, 0.292, 0.012, 48), edgeMat,
  );
  edge.position.y = 0.391;
  group.add(edge);

  // 3本脚: 上(R=0.06)→下(R=0.24) で開く
  const TOP_R = 0.06, BOT_R = 0.24;
  const TOP_Y = 0.395, BOT_Y = 0.0;
  const LEG_LEN = Math.hypot(BOT_R - TOP_R, TOP_Y - BOT_Y);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const tx = Math.cos(angle) * TOP_R, tz = Math.sin(angle) * TOP_R;
    const bx = Math.cos(angle) * BOT_R, bz = Math.sin(angle) * BOT_R;
    const cx = (tx + bx) / 2, cy = (TOP_Y + BOT_Y) / 2, cz = (tz + bz) / 2;

    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.020, LEG_LEN, 12), legMat,
    );
    leg.position.set(cx, cy, cz);
    // シリンダーの+Y軸を上端→下端方向に揃える(上端から下端を指す方向の逆)
    const dir = new THREE.Vector3(tx - bx, TOP_Y - BOT_Y, tz - bz).normalize();
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  }
  // 脚のリング(中ほどで脚同士を繋ぐ細いリング: 構造的なアクセント)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.008, 8, 32), legMat,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.13;
  group.add(ring);

  return group;
}

function buildCurtain() {
  const group = new THREE.Group();
  const rodMat = metalMat(0x666666);
  const tex = makeFloralPatternTexture('#e8dccf', '#b8a48b', '#8ba07a');
  tex.repeat.set(1.5, 2);
  const fabricMat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 0.95, side: THREE.DoubleSide,
  });

  // ロッド
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1.7, 16), rodMat,
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.y = 2.2;
  rod.castShadow = true;
  group.add(rod);
  for (const sx of [-0.85, 0.85]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), rodMat);
    cap.position.set(sx, 2.2, 0);
    group.add(cap);
  }

  // 左右のパネルをサブグループに分離(開閉アニメのため)
  const makePanel = (sign) => {
    const sub = new THREE.Group();
    sub.position.x = sign * 0.42;
    sub.userData.curtainSide = sign < 0 ? 'left' : 'right';
    sub.userData.baseX = sign * 0.42;
    const panel = makePart(0.7, 2.0, 0.02, fabricMat, 0.01);
    panel.position.y = 1.1;
    panel.castShadow = true; panel.receiveShadow = true;
    sub.add(panel);
    for (let i = -3; i <= 3; i++) {
      const pleat = makePart(0.05, 2.0, 0.01, fabricMat, 0);
      pleat.position.set(i * 0.1, 1.1, 0.015);
      sub.add(pleat);
    }
    return sub;
  };
  group.add(makePanel(-1));
  group.add(makePanel(+1));

  // お遊びクリック用インタラクションフラグ
  group.userData.interactive = true;
  group.userData.interactionKind = 'curtain';
  group.userData.animPhase = 0;
  group.userData.animTarget = 0;
  group.userData.animSpeed = 1.8;

  return group;
}

function buildPainting() {
  const group = new THREE.Group();
  const frameMat = woodMat('#3a2818', [1, 1]);
  // 絵の"絵柄"を簡易CanvasTextureで生成（抽象画っぽい色ブロック）
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const palettes = [
    ['#4a6fa5', '#c9823d', '#8fa875', '#d4b88a'],
    ['#b55a4a', '#f0d9a0', '#5a7a8a', '#2a3a4a'],
    ['#6a8a7a', '#d4a878', '#8a5a7a', '#f0e4c8'],
  ];
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, 256, 180);
  // ランダムな色ブロックを重ねる（抽象画）
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = palette[(i + 1) % palette.length];
    ctx.globalAlpha = 0.55 + Math.random() * 0.35;
    const x = Math.random() * 256;
    const y = Math.random() * 180;
    const w = 30 + Math.random() * 120;
    const h = 30 + Math.random() * 100;
    if (Math.random() < 0.5) {
      ctx.fillRect(x, y, w, h);
    } else {
      ctx.beginPath();
      ctx.arc(x + w/2, y + h/2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const pictureTex = new THREE.CanvasTexture(canvas);
  pictureTex.colorSpace = THREE.SRGBColorSpace;
  const pictureMat = new THREE.MeshStandardMaterial({
    map: pictureTex, roughness: 0.5, metalness: 0.05,
  });

  const picW = 0.6, picH = 0.4, frameT = 0.04, picD = 0.02;

  // 絵本体
  const picture = makePart(picW, picH, picD, pictureMat, 0);
  picture.position.set(0, picH / 2, 0.005);
  group.add(picture);

  // 額縁4辺
  const frameD = 0.03;
  const top = makePart(picW + frameT * 2, frameT, frameD, frameMat, 0.003);
  top.position.set(0, picH + frameT / 2, 0);
  group.add(top);
  const bot = makePart(picW + frameT * 2, frameT, frameD, frameMat, 0.003);
  bot.position.set(0, -frameT / 2, 0);
  group.add(bot);
  const left = makePart(frameT, picH, frameD, frameMat, 0.003);
  left.position.set(-(picW / 2 + frameT / 2), picH / 2, 0);
  group.add(left);
  const right = makePart(frameT, picH, frameD, frameMat, 0.003);
  right.position.set(picW / 2 + frameT / 2, picH / 2, 0);
  group.add(right);

  return group;
}

function buildSink() {
  const group = new THREE.Group();
  const cabinetMat = woodMat('#6b431f', [1, 1]);
  const topMat = matteMat(0xe8e4dc);
  const sinkBowlMat = new THREE.MeshStandardMaterial({
    color: 0x8a8e92, roughness: 0.2, metalness: 0.9,
  });
  const faucetMat = metalMat(0xb0b0b0);

  // 台輪付きキャビネット
  const cab = makePart(1.2, 0.78, 0.55, cabinetMat, 0.005);
  cab.position.y = 0.43;
  group.add(cab);

  // 取手2つ
  const handleMat = metalMat(0xaaaaaa);
  for (const x of [-0.3, 0.3]) {
    const h = makePart(0.1, 0.02, 0.02, handleMat, 0.005);
    h.position.set(x, 0.55, 0.28);
    group.add(h);
  }

  // 天板（カウンタートップ）
  const top = makePart(1.22, 0.04, 0.57, topMat, 0.008);
  top.position.y = 0.84;
  group.add(top);

  // シンクボウル（へこみとして黒っぽい箱）
  const bowl = makePart(0.55, 0.04, 0.4, sinkBowlMat, 0.02);
  bowl.position.set(-0.15, 0.845, 0);
  group.add(bowl);

  // 蛇口（縦棒＋折れ曲がり）
  const faucetBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.25, 16), faucetMat,
  );
  faucetBase.position.set(-0.15, 0.98, -0.18);
  group.add(faucetBase);
  const faucetArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.25, 16), faucetMat,
  );
  faucetArm.position.set(-0.15, 1.10, -0.05);
  faucetArm.rotation.x = Math.PI / 2;
  group.add(faucetArm);
  // 蛇口の吐水口から下に伸びる水流(デフォルト非表示、クリックで見える)
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x8cc8e6, roughness: 0.25, metalness: 0.15,
    transparent: true, opacity: 0.75,
  });
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.018, 0.22, 12), waterMat,
  );
  water.position.set(-0.15, 0.955, 0.07);
  water.visible = false;
  water.userData.role = 'water';
  group.add(water);

  // お遊びクリック用: 蛇口ON/OFF
  group.userData.interactive = true;
  group.userData.interactionKind = 'faucet';
  group.userData.animPhase = 0;
  group.userData.animTarget = 0;

  return group;
}

function buildFridge() {
  const group = new THREE.Group();
  const bodyMat = matteMat(0xe0e0e0);
  const handleMat = metalMat(0xaaaaaa);

  const body = makePart(0.6, 1.68, 0.65, bodyMat, 0.015);
  body.position.y = 0.84;
  group.add(body);

  // 上下2ドアの境目
  const line = makePart(0.62, 0.008, 0.01, matteMat(0xaaaaaa), 0);
  line.position.set(0, 1.12, 0.326);
  group.add(line);

  // 縦長ハンドル2本
  const hUpper = makePart(0.02, 0.35, 0.03, handleMat, 0.005);
  hUpper.position.set(-0.23, 1.35, 0.34);
  group.add(hUpper);
  const hLower = makePart(0.02, 0.25, 0.03, handleMat, 0.005);
  hLower.position.set(-0.23, 0.75, 0.34);
  group.add(hLower);

  return group;
}

function buildPlant() {
  const group = new THREE.Group();
  // 陶器鉢マテリアル（少しベージュ寄り、粘土感）
  const potMat = new THREE.MeshStandardMaterial({
    color: 0x7b5e42, roughness: 0.85, metalness: 0.05,
  });
  const potRimMat = new THREE.MeshStandardMaterial({
    color: 0x8a6b4c, roughness: 0.8, metalness: 0.05,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x2e1f12, roughness: 0.95,
  });
  // 葉の色バリエーション（濃/中/明/ライム）
  const leafColors = [0x2f6a30, 0x3a8040, 0x4a9550, 0x5aa060];
  const leafMats = leafColors.map(c => new THREE.MeshStandardMaterial({
    color: c, roughness: 0.75, metalness: 0, side: THREE.DoubleSide,
  }));
  const midribMat = new THREE.MeshStandardMaterial({
    color: 0x1e4a1e, roughness: 0.8, metalness: 0,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x2a5a2a, roughness: 0.85,
  });

  // --- 鉢 ---
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.15, 0.28, 28), potMat,
  );
  pot.position.y = 0.14;
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);
  // 鉢の上縁リム（太めで陶器っぽく）
  const potRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.205, 0.035, 28), potRimMat,
  );
  potRim.position.y = 0.275;
  potRim.castShadow = true;
  group.add(potRim);
  // 鉢の下段装飾リング
  const potBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.025, 28), potRimMat,
  );
  potBase.position.y = 0.012;
  potBase.castShadow = true;
  group.add(potBase);
  // 土（少し盛り上げる）
  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.195, 0.195, 0.025, 28), soilMat,
  );
  soil.position.y = 0.295;
  group.add(soil);

  // --- 葉の形状を3種類 ---
  // 1) モンステラ風: 幅広な水滴
  const leafShapeA = new THREE.Shape();
  leafShapeA.moveTo(0, 0);
  leafShapeA.quadraticCurveTo(0.10, 0.14, 0.07, 0.32);
  leafShapeA.quadraticCurveTo(0.0, 0.38, -0.07, 0.32);
  leafShapeA.quadraticCurveTo(-0.10, 0.14, 0, 0);
  const leafGeoA = new THREE.ShapeGeometry(leafShapeA);
  // 2) 剣状葉（ドラセナ/サンスベリア）: 細長い
  const leafShapeB = new THREE.Shape();
  leafShapeB.moveTo(0, 0);
  leafShapeB.quadraticCurveTo(0.035, 0.20, 0.025, 0.48);
  leafShapeB.quadraticCurveTo(0.0, 0.56, -0.025, 0.48);
  leafShapeB.quadraticCurveTo(-0.035, 0.20, 0, 0);
  const leafGeoB = new THREE.ShapeGeometry(leafShapeB);
  // 3) ハート型（ポトス/ペペロミア）: 丸く横広
  const leafShapeC = new THREE.Shape();
  leafShapeC.moveTo(0, 0);
  leafShapeC.bezierCurveTo(0.18, 0.05, 0.16, 0.20, 0.08, 0.26);
  leafShapeC.bezierCurveTo(0.04, 0.30, 0.0, 0.28, 0.0, 0.24);
  leafShapeC.bezierCurveTo(0.0, 0.28, -0.04, 0.30, -0.08, 0.26);
  leafShapeC.bezierCurveTo(-0.16, 0.20, -0.18, 0.05, 0, 0);
  const leafGeoC = new THREE.ShapeGeometry(leafShapeC);

  const leafGeos = [leafGeoA, leafGeoB, leafGeoC];
  const leafTypes = [0, 0, 1, 1, 2, 2, 2]; // 出現頻度バランス

  // 葉メッシュを生成するヘルパ（中心軸の葉脈も付ける）
  const makeLeaf = (type, mat) => {
    const grp = new THREE.Group();
    const blade = new THREE.Mesh(leafGeos[type], mat);
    blade.castShadow = true;
    grp.add(blade);
    // 葉脈: 薄い細長いボックスを葉の中心に
    const midribLen = [0.36, 0.52, 0.28][type];
    const midrib = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, midribLen, 0.002), midribMat,
    );
    midrib.position.y = midribLen / 2;
    midrib.position.z = 0.002;
    grp.add(midrib);
    return grp;
  };

  // --- 茎と葉の配置（7〜9本の茎、各4〜6枚の葉束） ---
  const stemCount = 7 + Math.floor(Math.random() * 3); // 7〜9
  for (let i = 0; i < stemCount; i++) {
    const theta = (i / stemCount) * Math.PI * 2 + Math.random() * 0.4;
    const r = 0.02 + Math.random() * 0.08;
    const h = 0.45 + Math.random() * 0.5; // 茎高 0.45〜0.95m
    const sx = Math.cos(theta) * r;
    const sz = Math.sin(theta) * r;

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.010, h, 8), stemMat,
    );
    stem.position.set(sx, 0.30 + h / 2, sz);
    // 茎は微妙に外向きに傾ける
    stem.rotation.z = -Math.cos(theta) * 0.10;
    stem.rotation.x = Math.sin(theta) * 0.10;
    stem.castShadow = true;
    group.add(stem);

    // 茎の上端に葉束
    const leafCount = 4 + Math.floor(Math.random() * 3); // 4〜6
    const tipY = 0.30 + h;
    for (let k = 0; k < leafCount; k++) {
      const type = leafTypes[Math.floor(Math.random() * leafTypes.length)];
      const mat = leafMats[Math.floor(Math.random() * leafMats.length)];
      const leaf = makeLeaf(type, mat);
      const rotY = (k / leafCount) * Math.PI * 2 + Math.random() * 0.6;
      const rotZ = -0.25 - Math.random() * 0.35;
      leaf.position.set(sx, tipY, sz);
      leaf.rotation.y = rotY;
      leaf.rotation.z = rotZ;
      leaf.rotation.x = 0.15 + Math.random() * 0.15;
      leaf.scale.setScalar(0.7 + Math.random() * 0.6);
      // 葉揺れアニメ用: 基準姿勢と個別位相を記録
      leaf.userData.isLeaf = true;
      leaf.userData.basePose = {
        rotY, rotZ,
        rotX: leaf.rotation.x,
        phase: Math.random() * Math.PI * 2,
        freq: 1.8 + Math.random() * 1.2, // 1.8〜3.0 rad/s
        ampZ: 0.020 + Math.random() * 0.020, // 0.02〜0.04 rad
        ampY: 0.010 + Math.random() * 0.012,
      };
      group.add(leaf);
    }
  }

  return group;
}

function buildTV() {
  const group = new THREE.Group();
  const bezelMat = matteMat(0x111111);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a2a, emissive: 0x0a1a3a, emissiveIntensity: 0.4,
    roughness: 0.25, metalness: 0.1,
  });
  const standMat = matteMat(0x222222);

  // 画面
  const bezel = makePart(1.3, 0.75, 0.07, bezelMat, 0.005);
  bezel.position.y = 0.60;
  group.add(bezel);
  const screen = makePart(1.24, 0.69, 0.02, screenMat, 0);
  screen.position.set(0, 0.60, 0.045);
  group.add(screen);

  // スタンド
  const neck = makePart(0.1, 0.22, 0.1, standMat, 0.01);
  neck.position.set(0, 0.135, 0);
  group.add(neck);
  const base = makePart(0.4, 0.03, 0.18, standMat, 0.005);
  base.position.set(0, 0.015, 0);
  group.add(base);

  return group;
}

function buildTrackLight() {
  const group = new THREE.Group();
  const barMat = matteMat(0x1a1a1a);
  const spotHousingMat = matteMat(0x222222);
  const spotEmitMat = new THREE.MeshStandardMaterial({
    color: 0xfff5d4,
    emissive: 0xfff0c0,
    emissiveIntensity: 1.2,
    roughness: 0.3,
  });

  // 天井から下に吊り下がるモデル。ローカル原点 = バー上端（天井面）
  const barLen = 2.0;
  const bar = makePart(barLen, 0.05, 0.06, barMat, 0);
  bar.position.y = -0.025;
  group.add(bar);

  const spotSpacing = barLen / 5;
  for (let i = 0; i < 4; i++) {
    const sx = -barLen / 2 + spotSpacing * (i + 1);

    const housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.06, 0.12, 16),
      spotHousingMat,
    );
    housing.position.set(sx, -0.11, 0);
    group.add(housing);

    const emit = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 16),
      spotEmitMat,
    );
    emit.position.set(sx, -0.17, 0);
    emit.rotation.x = -Math.PI / 2;
    group.add(emit);

    const light = new THREE.PointLight(0xffe8c0, 0.8, 4.5, 1.8);
    light.position.set(sx, -0.2, 0);
    light.castShadow = false;
    group.add(light);
  }

  return group;
}

function buildFloatShelf() {
  const group = new THREE.Group();
  const woodPlank = woodMat('#7a5a3a', [1, 1]);
  const metalBracket = metalMat(0x222222);

  // 天井吊り棚: ローカル原点 = 板の上面
  const plankLen = 1.2;
  const plankD = 0.28;
  const plank = makePart(plankLen, 0.035, plankD, woodPlank, 0.005);
  plank.position.y = -0.0175;
  group.add(plank);

  // 吊り下げワイヤー（4本）: 板の上端から上に1m伸びる
  const wireLen = 1.0;
  for (const sx of [-plankLen / 2 + 0.08, plankLen / 2 - 0.08]) {
    for (const sz of [-plankD / 2 + 0.04, plankD / 2 - 0.04]) {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, wireLen, 8),
        metalBracket,
      );
      wire.position.set(sx, wireLen / 2, sz);
      group.add(wire);
    }
  }

  return group;
}

function buildWall() {
  const group = new THREE.Group();
  // 壁紙と同期させるためのデフォルトマテリアル（UI側で部屋のwallMaterialに差し替え）
  const mat = new THREE.MeshStandardMaterial({
    color: 0xebe5d8,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const wall = makePart(3.0, 2.7, 0.1, mat, 0);
  wall.position.y = 1.35;
  wall.userData.isWallBody = true;
  group.add(wall);

  // 見分けやすいように床近くに薄い巾木を付ける
  // (壁本体と同じ XZ サイズに収め、AABB(当たり判定)が下端だけ膨らまないようにする)
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.7 });
  const baseA = makePart(3.0, 0.08, 0.1, baseMat, 0);
  baseA.position.y = 0.04;
  group.add(baseA);

  return group;
}

function _buildDoorBase({ doorColor = '#8b5a2b', frameColor = '#4a2f18', panelColor = '#6b431f', handleColor = 0xd4af37, hasPanels = true } = {}) {
  const group = new THREE.Group();
  const frameMat = woodMat(frameColor, [1, 1]);
  const doorMat  = woodMat(doorColor, [1, 1]);
  const handleMat = metalMat(handleColor);

  const doorW = 0.9, doorH = 2.0, doorD = 0.05;
  const frameT = 0.06;

  const top = makePart(doorW + frameT * 2, frameT, 0.08, frameMat, 0.005);
  top.position.set(0, doorH + frameT / 2, 0);
  group.add(top);
  const sideL = makePart(frameT, doorH, 0.08, frameMat, 0.005);
  sideL.position.set(-(doorW / 2 + frameT / 2), doorH / 2, 0);
  group.add(sideL);
  const sideR = makePart(frameT, doorH, 0.08, frameMat, 0.005);
  sideR.position.set(doorW / 2 + frameT / 2, doorH / 2, 0);
  group.add(sideR);

  const slab = makePart(doorW, doorH, doorD, doorMat, 0.008);
  slab.position.set(0, doorH / 2, 0);
  group.add(slab);

  if (hasPanels) {
    const panelMat = woodMat(panelColor, [1, 1]);
    const panelA = makePart(doorW - 0.2, 0.6, 0.015, panelMat, 0.01);
    panelA.position.set(0, doorH * 0.75, doorD / 2 + 0.008);
    group.add(panelA);
    const panelB = makePart(doorW - 0.2, 0.6, 0.015, panelMat, 0.01);
    panelB.position.set(0, doorH * 0.28, doorD / 2 + 0.008);
    group.add(panelB);
  }

  const handle = makePart(0.04, 0.12, 0.04, handleMat, 0.015);
  handle.position.set(doorW / 2 - 0.12, doorH / 2 - 0.05, doorD / 2 + 0.03);
  group.add(handle);

  return { group, doorW, doorH, doorD };
}

// ドア上のサインプレート用テクスチャ生成(色と文字を指定)
function _makeDoorSignTexture(text, bgColor = '#c92a2a') {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 320, 96);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 308, 84);
  ctx.fillStyle = '#ffffff';
  // 文字幅に応じてフォントサイズを自動調整
  let fontSize = 38;
  ctx.font = `bold ${fontSize}px "Hiragino Kaku Gothic ProN", Meiryo, sans-serif`;
  while (ctx.measureText(text).width > 290 && fontSize > 18) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px "Hiragino Kaku Gothic ProN", Meiryo, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ドア上にサインプレートを追加するヘルパ
function _attachDoorSign(group, doorH, doorD, text, bgColor, emissive) {
  const signMat = new THREE.MeshStandardMaterial({
    map: _makeDoorSignTexture(text, bgColor), roughness: 0.5,
    emissive: emissive, emissiveIntensity: 0.35,
  });
  const sign = makePart(0.65, 0.20, 0.025, signMat, 0.005);
  sign.position.set(0, doorH + 0.22, doorD / 2 + 0.02);
  group.add(sign);
}

// ドア1 = 出口: 茶色の木製ドア + 赤いEXITプレート + 退出リンク
function buildDoor() {
  const { group, doorH, doorD } = _buildDoorBase();
  _attachDoorSign(group, doorH, doorD, '出口 EXIT', '#c92a2a', 0xaa1010);
  group.userData.exitLink = 'https://oyoyo.co.jp/';
  group.userData.exitLabel = '仮想オフィスを出る';
  return group;
}

// ドア2 = 白塗装のドア + 製品紹介リンク
function buildDoor2() {
  const { group, doorH, doorD } = _buildDoorBase({
    doorColor: '#eeeae2',
    frameColor: '#bdb7ad',
    panelColor: '#dcd7ce',
    handleColor: 0xc0c0c0,
  });
  _attachDoorSign(group, doorH, doorD, '製品紹介', '#2a6fc9', 0x104080);
  group.userData.exitLink = 'https://oyoyo.co.jp/product/';
  group.userData.exitLabel = 'オヨヨ製品紹介ページへ';
  return group;
}

// ドア3 = ガラスドア + お問い合わせリンク
function buildDoor3() {
  const group = new THREE.Group();
  const frameMat = metalMat(0xbfbfbf);
  // パフォーマンス重視: transmission を切ったシンプルな半透明ガラスに
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd0e0ec, roughness: 0.15, metalness: 0.2,
    transparent: true, opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const handleMat = metalMat(0x9f9f9f);
  const doorW = 0.9, doorH = 2.0, doorD = 0.04;
  const frameT = 0.06;

  const top = makePart(doorW + frameT * 2, frameT, 0.08, frameMat, 0.005);
  top.position.set(0, doorH + frameT / 2, 0);
  group.add(top);
  const sideL = makePart(frameT, doorH, 0.08, frameMat, 0.005);
  sideL.position.set(-(doorW / 2 + frameT / 2), doorH / 2, 0);
  group.add(sideL);
  const sideR = makePart(frameT, doorH, 0.08, frameMat, 0.005);
  sideR.position.set(doorW / 2 + frameT / 2, doorH / 2, 0);
  group.add(sideR);
  // 内枠(ガラスの外側)
  const innerFrame = makePart(doorW, 0.04, 0.08, frameMat, 0.003);
  innerFrame.position.set(0, doorH * 0.02 + 0.02, 0);
  group.add(innerFrame);
  const topInner = makePart(doorW, 0.04, 0.08, frameMat, 0.003);
  topInner.position.set(0, doorH - 0.02, 0);
  group.add(topInner);
  // ガラス本体
  const glass = makePart(doorW - 0.02, doorH - 0.08, doorD, glassMat, 0);
  glass.position.set(0, doorH / 2, 0);
  glass.castShadow = false;
  group.add(glass);
  // 縦のプッシュバー
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 16), handleMat);
  bar.position.set(doorW / 2 - 0.08, doorH / 2, doorD / 2 + 0.04);
  group.add(bar);

  _attachDoorSign(group, doorH, doorD, 'お問い合わせ', '#2aa06a', 0x0a6040);
  group.userData.exitLink = 'https://oyoyo.co.jp/inquiry/';
  group.userData.exitLabel = 'オヨヨお問い合わせページへ';
  return group;
}

function buildWindow() {
  const group = new THREE.Group();
  const frameMat = matteMat(0xf5f2ea);
  // パフォーマンス重視: transmission(屈折)を切ってシンプルな半透明ガラスに
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xaac8df,
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const winW = 1.2, winH = 1.0;
  // ジオメトリは窓の下端=0を基準に配置。Y位置(group.position.y)で全体の高さを制御する。
  const sill = 0;
  const frameT = 0.05;

  const top = makePart(winW + frameT * 2, frameT, 0.1, frameMat, 0.005);
  top.position.set(0, sill + winH + frameT / 2, 0);
  group.add(top);
  const bot = makePart(winW + frameT * 2, frameT, 0.1, frameMat, 0.005);
  bot.position.set(0, sill - frameT / 2, 0);
  group.add(bot);
  // 桟（窓台）
  const ledge = makePart(winW + frameT * 2.5, 0.03, 0.16, frameMat, 0.005);
  ledge.position.set(0, sill - frameT - 0.015, 0.03);
  group.add(ledge);

  const sideL = makePart(frameT, winH + frameT * 2, 0.1, frameMat, 0.005);
  sideL.position.set(-(winW / 2 + frameT / 2), sill + winH / 2, 0);
  group.add(sideL);
  const sideR = makePart(frameT, winH + frameT * 2, 0.1, frameMat, 0.005);
  sideR.position.set(winW / 2 + frameT / 2, sill + winH / 2, 0);
  group.add(sideR);

  // 十字の桟
  const vbar = makePart(0.025, winH, 0.06, frameMat, 0);
  vbar.position.set(0, sill + winH / 2, 0);
  group.add(vbar);
  const hbar = makePart(winW, 0.025, 0.06, frameMat, 0);
  hbar.position.set(0, sill + winH / 2, 0);
  group.add(hbar);

  // ガラス
  const glass = makePart(winW - 0.02, winH - 0.02, 0.015, glassMat, 0);
  glass.position.set(0, sill + winH / 2, 0);
  glass.castShadow = false;
  group.add(glass);

  // 窓にも退出リンク (カーテンが開いている時だけ有効)
  group.userData.exitLink = 'https://oyoyo.co.jp/companyinfo/';
  group.userData.exitLabel = '会社情報';
  group.userData.requiresOpenCurtain = true;

  return group;
}

// 通り抜け可能な窓枠(掃き出し窓 / スライディンググラスドア風)
// プレイヤーは通過可能(createFurniture で skipClamp=true を付与)。
function buildPassWindow() {
  const group = new THREE.Group();
  const frameMat = matteMat(0xf3f2ee);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xb8b8b8, roughness: 0.4, metalness: 0.6,
  });
  const handleMat = metalMat(0x9e9e9e);

  const W = 1.6;       // 開口幅
  const H = 2.1;       // 全高(床から天井近くまで)
  const frameT = 0.05; // 枠の太さ
  const D = 0.08;      // 奥行き

  // 上枠
  const top = makePart(W + frameT * 2, frameT, D, frameMat, 0.005);
  top.position.set(0, H - frameT / 2, 0);
  group.add(top);
  // 下レール(薄い金属レール)
  const bot = makePart(W + frameT * 2, 0.025, D, railMat, 0);
  bot.position.set(0, 0.0125, 0);
  group.add(bot);
  // 左右枠
  const sideL = makePart(frameT, H, D, frameMat, 0.005);
  sideL.position.set(-(W / 2 + frameT / 2), H / 2, 0);
  group.add(sideL);
  const sideR = makePart(frameT, H, D, frameMat, 0.005);
  sideR.position.set(W / 2 + frameT / 2, H / 2, 0);
  group.add(sideR);
  // 中央の縦框(2枚パネルの境目)
  const midbar = makePart(0.04, H - 0.06, D * 0.7, frameMat, 0);
  midbar.position.set(0, (H - 0.06) / 2 + 0.025, 0);
  group.add(midbar);

  // ガラスは省略。窓枠の向こうがクリアに見えるよう開口部はそのまま空ける。

  // 取っ手(各パネル中央付近、宙に浮かないよう中央桟まわりに付ける)
  const handle1 = makePart(0.012, 0.18, 0.022, handleMat, 0.005);
  handle1.position.set(-0.06, H * 0.45, D * 0.45);
  group.add(handle1);
  const handle2 = makePart(0.012, 0.18, 0.022, handleMat, 0.005);
  handle2.position.set(0.06, H * 0.45, D * 0.45);
  group.add(handle2);

  return group;
}

// ---- 追加の家具: ゲーミングチェア/ごみ箱/床置きエアコン/鏡 ----------------

function buildGamingChair() {
  const group = new THREE.Group();
  // マテリアル
  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x0f0f12, roughness: 0.55, metalness: 0.12,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xd21f2a, roughness: 0.5, metalness: 0.15,
  });
  const accentDark = new THREE.MeshStandardMaterial({
    color: 0x6a0f15, roughness: 0.6, metalness: 0.1,
  });
  const stitchMat = new THREE.MeshStandardMaterial({
    color: 0xd21f2a, roughness: 0.9,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1c, roughness: 0.45, metalness: 0.35,
  });
  const metalMat2 = new THREE.MeshStandardMaterial({
    color: 0x8a8a90, roughness: 0.25, metalness: 0.85,
  });
  const wheelRubberMat = new THREE.MeshStandardMaterial({
    color: 0x111112, roughness: 0.75, metalness: 0.1,
  });

  // ---- ベース（5本脚の星型） ----
  const baseGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const legLen = 0.35;
    // テーパ脚: 中央幅広→先端細め
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.05, legLen), baseMat,
    );
    leg.position.set(Math.cos(angle) * legLen / 2, 0.06, Math.sin(angle) * legLen / 2);
    leg.rotation.y = -angle + Math.PI / 2;
    leg.castShadow = true; leg.receiveShadow = true;
    baseGroup.add(leg);
    // メタルキャップ
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.03, 16), metalMat2,
    );
    cap.position.set(Math.cos(angle) * legLen, 0.075, Math.sin(angle) * legLen);
    cap.castShadow = true;
    baseGroup.add(cap);
    // キャスター（ゴム車輪 + ブラケット）
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.045, 14), wheelRubberMat,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.cos(angle) * legLen, 0.035, Math.sin(angle) * legLen);
    wheel.castShadow = true;
    baseGroup.add(wheel);
  }
  // 中心キャップ
  const centerCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 0.05, 20), baseMat,
  );
  centerCap.position.y = 0.08;
  centerCap.castShadow = true;
  baseGroup.add(centerCap);
  group.add(baseGroup);

  // ---- 昇降シリンダー ----
  const stemOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.055, 0.18, 20), baseMat,
  );
  stemOuter.position.y = 0.17;
  group.add(stemOuter);
  const stemInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.036, 0.18, 20), metalMat2,
  );
  stemInner.position.y = 0.30;
  group.add(stemInner);

  // ---- 座面（バケット形状: 中央座面 + 両サイドボルスター） ----
  const seatY = 0.43;
  // 座面本体
  const seat = makePart(0.48, 0.09, 0.50, leatherMat, 0.06);
  seat.position.set(0, seatY, 0.02);
  group.add(seat);
  // サイドボルスター(座面両脇の盛り上がり)
  for (const sx of [-1, 1]) {
    const bolster = makePart(0.10, 0.13, 0.46, leatherMat, 0.05);
    bolster.position.set(sx * 0.29, seatY + 0.02, 0.01);
    group.add(bolster);
    // ボルスター外側の赤ストライプ
    const stripe = makePart(0.012, 0.13, 0.46, accentMat, 0.02);
    stripe.position.set(sx * 0.35, seatY + 0.02, 0.01);
    group.add(stripe);
  }
  // 前端のアクセントライン（赤ステッチ）
  const seatStitch = makePart(0.48, 0.006, 0.04, stitchMat, 0.002);
  seatStitch.position.set(0, seatY + 0.05, 0.24);
  group.add(seatStitch);

  // ---- 背もたれ（リクライン + ウィング形状） ----
  // rotation.x が正だと top が +z(前) に倒れる（前傾）。
  // リクライン(後傾)は負値。約15°=約0.26radで実車シート相当
  const backPivot = new THREE.Group();
  backPivot.position.set(0, seatY + 0.04, -0.18);
  backPivot.rotation.x = -0.26;
  group.add(backPivot);

  // メインバックパネル
  const back = makePart(0.46, 0.86, 0.12, leatherMat, 0.05);
  back.position.set(0, 0.43, 0);
  backPivot.add(back);
  // バック両サイドのウィング（レーシングシート風）
  for (const sx of [-1, 1]) {
    const wing = makePart(0.10, 0.78, 0.18, leatherMat, 0.05);
    wing.position.set(sx * 0.26, 0.41, 0.02);
    backPivot.add(wing);
    // ウィングのアクセントストライプ
    const wstripe = makePart(0.015, 0.78, 0.03, accentMat, 0.01);
    wstripe.position.set(sx * 0.315, 0.41, 0.12);
    backPivot.add(wstripe);
  }
  // 中央の赤パイピング(縦ライン)
  const pipingL = makePart(0.01, 0.78, 0.04, accentDark, 0.005);
  pipingL.position.set(-0.10, 0.41, 0.062);
  backPivot.add(pipingL);
  const pipingR = makePart(0.01, 0.78, 0.04, accentDark, 0.005);
  pipingR.position.set(0.10, 0.41, 0.062);
  backPivot.add(pipingR);
  // ランバーサポートピロー（腰当て）
  const lumbar = makePart(0.30, 0.14, 0.08, accentMat, 0.04);
  lumbar.position.set(0, 0.22, 0.10);
  backPivot.add(lumbar);
  // ランバーのストラップ
  const lumbarStrap = makePart(0.01, 0.78, 0.02, new THREE.MeshStandardMaterial({
    color: 0x2a2a2e, roughness: 0.7,
  }), 0.002);
  lumbarStrap.position.set(0, 0.41, 0.065);
  backPivot.add(lumbarStrap);

  // ---- ヘッドレストピロー（独立、ストラップで吊るした感じ） ----
  const headPillow = makePart(0.36, 0.20, 0.12, accentMat, 0.05);
  headPillow.position.set(0, 0.95, 0.06);
  backPivot.add(headPillow);
  // 白ロゴ的な小アクセント
  const logo = makePart(0.08, 0.05, 0.002, new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.5,
  }), 0.002);
  logo.position.set(0, 0.95, 0.121);
  backPivot.add(logo);
  // ヘッドレストを支える赤ストラップ2本
  for (const sx of [-1, 1]) {
    const strap = makePart(0.03, 0.12, 0.008, accentMat, 0.004);
    strap.position.set(sx * 0.10, 0.81, 0.065);
    backPivot.add(strap);
  }

  // ---- アームレスト（4D風：縦支柱 + 幅広パッド） ----
  for (const sx of [-1, 1]) {
    // 縦支柱(プラスチック)
    const armPost = makePart(0.05, 0.16, 0.07, baseMat, 0.008);
    armPost.position.set(sx * 0.30, seatY + 0.14, -0.02);
    group.add(armPost);
    // 支柱のメタルアクセント
    const armBand = makePart(0.052, 0.015, 0.072, metalMat2, 0.002);
    armBand.position.set(sx * 0.30, seatY + 0.17, -0.02);
    group.add(armBand);
    // 幅広パッド
    const armPad = makePart(0.10, 0.04, 0.26, leatherMat, 0.015);
    armPad.position.set(sx * 0.30, seatY + 0.24, -0.02);
    group.add(armPad);
  }

  // ---- チルト機構（座面下の黒いメカ部品） ----
  const tilt = makePart(0.22, 0.06, 0.26, baseMat, 0.015);
  tilt.position.set(0, seatY - 0.08, 0);
  group.add(tilt);

  return group;
}

function buildTrashCan() {
  const group = new THREE.Group();
  const bodyMat = matteMat(0x3a3a3a);
  const rimMat = metalMat(0x8a8a8a);

  // 本体（下すぼまりの円筒）
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.13, 0.38, 24, 1, true),
    bodyMat,
  );
  body.position.y = 0.19;
  body.material.side = THREE.DoubleSide;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  // 底
  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.01, 24), bodyMat,
  );
  bottom.position.y = 0.005;
  group.add(bottom);
  // リム（金属縁）
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 8, 32), rimMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.38;
  rim.castShadow = true;
  group.add(rim);

  return group;
}

function buildAirconStand() {
  const group = new THREE.Group();
  const bodyMat = matteMat(0xf2f2ee);
  const grillMat = matteMat(0x404040);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xcfcfcc, roughness: 0.4, metalness: 0.2,
  });

  const W = 0.35, H = 1.7, D = 0.3;
  // 本体
  const body = makePart(W, H, D, bodyMat, 0.02);
  body.position.y = H / 2;
  group.add(body);
  // 前面パネル（少し凹凸のため薄板）
  const panel = makePart(W - 0.04, H - 0.1, 0.015, panelMat, 0.01);
  panel.position.set(0, H / 2, D / 2 + 0.003);
  group.add(panel);
  // 上部吹出口グリル
  const outlet = makePart(W - 0.08, 0.05, 0.02, grillMat, 0);
  outlet.position.set(0, H - 0.10, D / 2 + 0.005);
  group.add(outlet);
  // 下部吸込口
  const intake = makePart(W - 0.08, 0.14, 0.02, grillMat, 0);
  intake.position.set(0, 0.20, D / 2 + 0.005);
  group.add(intake);
  // 表示パネル
  const display = makePart(0.10, 0.04, 0.01, new THREE.MeshStandardMaterial({
    color: 0x1a2a3a, roughness: 0.3, metalness: 0.5, emissive: 0x0a1a2a,
  }), 0);
  display.position.set(0, H * 0.55, D / 2 + 0.008);
  group.add(display);

  return group;
}

function buildMirror() {
  const group = new THREE.Group();
  const frameMat = woodMat('#4a3219', [1, 1]);

  const W = 0.5, H = 1.2, D = 0.03;
  const frameT = 0.04;

  // 反射する鏡は両プラットフォームで使うが、モバイルは 128px に下げて負荷削減。
  // (PC: 256px / モバイル: 128px)
  const mirrorGeom = new THREE.PlaneGeometry(W, H);
  const mirrorRes = IS_TOUCH ? 128 : 256;
  const mirror = new Reflector(mirrorGeom, {
    clipBias: 0.003,
    textureWidth: mirrorRes,
    textureHeight: Math.round(mirrorRes * (H / W)),
    color: 0xe6ecf0,
  });
  mirror.position.set(0, H / 2, D / 2 + 0.001);
  mirror.userData.noTint = true;

  // フラスタムカリングを強制: 画面外にある間は反射更新をスキップ
  // (Reflector は frustumCulled=false がデフォルトなので明示的に true 化)
  mirror.frustumCulled = true;

  // カメラ側から見て鏡の表側にいない時は反射再レンダをスキップして負荷削減
  const origOnBeforeRender = mirror.onBeforeRender.bind(mirror);
  mirror.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    // 鏡の法線と、鏡→カメラのベクトルの内積を取り、背面側なら更新しない
    const tmpPos = new THREE.Vector3();
    const tmpNormal = new THREE.Vector3(0, 0, 1);
    mirror.getWorldPosition(tmpPos);
    tmpNormal.applyQuaternion(mirror.getWorldQuaternion(new THREE.Quaternion()));
    const toCam = new THREE.Vector3().subVectors(camera.position, tmpPos);
    if (tmpNormal.dot(toCam) <= 0) return; // カメラが鏡の裏側にいる
    origOnBeforeRender(renderer, scene, camera, geometry, material, group);
  };

  group.add(mirror);

  // 額縁4辺
  const top = makePart(W + frameT * 2, frameT, D, frameMat, 0.005);
  top.position.set(0, H + frameT / 2, 0);
  group.add(top);
  const bot = makePart(W + frameT * 2, frameT, D, frameMat, 0.005);
  bot.position.set(0, -frameT / 2, 0);
  group.add(bot);
  const left = makePart(frameT, H, D, frameMat, 0.005);
  left.position.set(-(W / 2 + frameT / 2), H / 2, 0);
  group.add(left);
  const right = makePart(frameT, H, D, frameMat, 0.005);
  right.position.set(W / 2 + frameT / 2, H / 2, 0);
  group.add(right);

  return group;
}

function buildPerson() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2b896, roughness: 0.7 });
  const shirtMat = fabricMat('#3a6ea5', [2, 2]);
  const pantsMat = fabricMat('#2a2a30', [1, 2]);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.5 });

  // 脚
  for (const sx of [-1, 1]) {
    const leg = makePart(0.14, 0.78, 0.16, pantsMat, 0.03);
    leg.position.set(sx * 0.09, 0.42, 0);
    group.add(leg);
    // 靴
    const shoe = makePart(0.16, 0.06, 0.26, shoeMat, 0.02);
    shoe.position.set(sx * 0.09, 0.03, 0.04);
    group.add(shoe);
  }

  // 胴体
  const torso = makePart(0.42, 0.58, 0.24, shirtMat, 0.05);
  torso.position.set(0, 1.12, 0);
  group.add(torso);
  // 胴体下部（ベルト/裾）
  const hem = makePart(0.44, 0.06, 0.255, pantsMat, 0.02);
  hem.position.set(0, 0.83, 0);
  group.add(hem);

  // 腕
  for (const sx of [-1, 1]) {
    const armU = makePart(0.11, 0.30, 0.12, shirtMat, 0.03);
    armU.position.set(sx * 0.265, 1.25, 0);
    group.add(armU);
    const armL = makePart(0.10, 0.30, 0.11, skinMat, 0.03);
    armL.position.set(sx * 0.265, 0.95, 0);
    group.add(armL);
  }

  // 首
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.08, 14), skinMat,
  );
  neck.position.y = 1.45;
  group.add(neck);

  // 頭 (少し縦長の楕円球)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 20, 16), skinMat,
  );
  head.scale.set(1, 1.1, 0.95);
  head.position.y = 1.60;
  group.add(head);

  // 髪 (上半球を少し被せる)
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.scale.set(1, 1.15, 1);
  hair.position.y = 1.60;
  group.add(hair);

  // 前髪
  const bangs = makePart(0.22, 0.05, 0.02, hairMat, 0.01);
  bangs.position.set(0, 1.67, 0.105);
  group.add(bangs);

  // 目（+Z方向が顔の前）
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), eyeMat);
    eye.position.set(sx * 0.035, 1.62, 0.105);
    group.add(eye);
  }
  // 口
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.6 });
  const mouth = makePart(0.05, 0.012, 0.005, mouthMat, 0.002);
  mouth.position.set(0, 1.55, 0.108);
  group.add(mouth);

  // userData に人間識別用フラグ（walk モードから参照）
  group.userData.isPerson = true;
  return group;
}

// ---- ペット系ビルダー: 猫 / 犬 (カワイイ系) --------------------------------

function buildCat() {
  const group = new THREE.Group();
  // カワイイ系: 頭を大きめ、体は1体の楕円、シンプルな造形
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd9a070, roughness: 0.85 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf7e6cb, roughness: 0.9 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf2b2a8, roughness: 0.6 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.25 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a1a18, roughness: 0.6 });

  const BODY_Y = 0.17; // 胴体の中心高さ

  // --- 胴体（楕円1体） ---
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 16), furMat);
  body.scale.set(1.15, 1.0, 1.8);
  body.position.set(0, BODY_Y, -0.03);
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  // お腹の白
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 10), bellyMat);
  belly.scale.set(1.0, 0.55, 1.7);
  belly.position.set(0, BODY_Y - 0.04, -0.02);
  group.add(belly);

  // --- 頭（大きめでまんまる） ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 18), furMat);
  head.position.set(0, BODY_Y + 0.09, 0.20);
  head.castShadow = true;
  group.add(head);
  // マズル（ちょこんと出る）
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 12), bellyMat);
  muzzle.scale.set(1.2, 0.8, 1.0);
  muzzle.position.set(0, BODY_Y + 0.055, 0.29);
  group.add(muzzle);

  // --- 三角耳 + ピンク内耳 ---
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.075, 12), furMat);
    ear.position.set(sx * 0.06, BODY_Y + 0.195, 0.175);
    ear.rotation.x = -0.15;
    ear.rotation.z = -sx * 0.1;
    ear.castShadow = true;
    group.add(ear);
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 12), pinkMat);
    earIn.position.set(sx * 0.06, BODY_Y + 0.185, 0.18);
    earIn.rotation.x = -0.15;
    earIn.rotation.z = -sx * 0.1;
    group.add(earIn);
  }

  // --- 目: 大きめで白+黒い丸瞳孔（カワイイ系はまん丸） ---
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 12), eyeWhiteMat);
    eyeWhite.scale.set(1, 1.05, 0.6);
    eyeWhite.position.set(sx * 0.04, BODY_Y + 0.10, 0.29);
    group.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 10), pupilMat);
    pupil.position.set(sx * 0.04, BODY_Y + 0.10, 0.303);
    group.add(pupil);
    // ハイライト（白点）
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), eyeWhiteMat);
    hl.position.set(sx * 0.043, BODY_Y + 0.107, 0.315);
    group.add(hl);
  }
  // 鼻（ピンク）
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), pinkMat);
  nose.scale.set(1.2, 0.8, 0.9);
  nose.position.set(0, BODY_Y + 0.065, 0.322);
  group.add(nose);
  // 口
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.003, 0.003), mouthMat);
  mouth.position.set(0, BODY_Y + 0.04, 0.325);
  group.add(mouth);

  // --- 脚(シンプルな寸胴短脚): 各脚は Group で pivot 対応 ---
  const legs = [];
  const legPositions = [
    [-0.055, -0.13], // 後左
    [ 0.055, -0.13],
    [-0.050,  0.11], // 前左
    [ 0.050,  0.11],
  ];
  for (const [lx, lz] of legPositions) {
    const legGroup = new THREE.Group();
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.023, 0.028, 0.13, 12), furMat,
    );
    leg.position.y = -0.065;
    leg.castShadow = true;
    legGroup.add(leg);
    legGroup.position.set(lx, BODY_Y - 0.04, lz);
    group.add(legGroup);
    legs.push(legGroup);
  }

  // --- 尻尾(3セグ、短めで愛嬌あり) ---
  const tailSegs = [];
  const tailBase = new THREE.Group();
  tailBase.position.set(0, BODY_Y + 0.02, -0.22);
  group.add(tailBase);
  let parent = tailBase;
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017 - i * 0.002, 0.020 - i * 0.002, 0.09, 10),
      furMat,
    );
    seg.position.y = 0.045;
    const pivot = new THREE.Group();
    pivot.position.y = parent === tailBase ? 0 : 0.09;
    pivot.rotation.x = -0.5 - i * 0.15; // 根元で上へ反る
    pivot.add(seg);
    parent.add(pivot);
    tailSegs.push(pivot);
    parent = pivot;
  }

  group.userData.isPet = true;
  group.userData.petKind = 'cat';
  group.userData.parts = { legs, tailSegs };
  group.userData.npcName = 'ネコ';
  group.userData.dialogue = [
    'にゃー',
    'にゃ〜ん',
    'みゃ〜',
    'んにゃ？',
    'ごろごろごろ…',
    'フシャーッ',
    'にゃお〜ん',
    '(じっとこちらを見つめている)',
    'にゃにゃっ',
    '(しっぽをゆっくり振った)',
    'くんくん…',
    'みゃっ！',
    '(そっぽを向いた)',
    'にゃんにゃん',
    '(前足で顔を洗っている)',
  ];
  return group;
}

function buildDog() {
  const group = new THREE.Group();
  // カワイイ系: 柴犬風の茶色＋白腹、頭大きめ、胴体は1体
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd39152, roughness: 0.88 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd4, roughness: 0.9 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.3 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a2018, roughness: 0.6 });

  const BODY_Y = 0.28;

  // --- 胴体（楕円1体、ずんぐり） ---
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.15, 22, 16), furMat);
  body.scale.set(1.15, 1.0, 1.9);
  body.position.set(0, BODY_Y, -0.04);
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);
  // 腹の白
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), bellyMat);
  belly.scale.set(1.0, 0.55, 1.75);
  belly.position.set(0, BODY_Y - 0.06, -0.03);
  group.add(belly);

  // --- 頭（大きめでまんまる） ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 18), furMat);
  head.position.set(0, BODY_Y + 0.10, 0.26);
  head.castShadow = true;
  group.add(head);
  // マズル（白、ちょこんと前へ）
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), bellyMat);
  muzzle.scale.set(1.1, 0.85, 1.15);
  muzzle.position.set(0, BODY_Y + 0.07, 0.38);
  group.add(muzzle);

  // --- 鼻 ---
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), noseMat);
  nose.scale.set(1.2, 0.9, 0.9);
  nose.position.set(0, BODY_Y + 0.10, 0.45);
  group.add(nose);

  // --- 目: 白目＋黒目で大きめ愛嬌UP ---
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 12), eyeWhiteMat);
    eyeWhite.scale.set(1, 1.0, 0.55);
    eyeWhite.position.set(sx * 0.048, BODY_Y + 0.15, 0.36);
    group.add(eyeWhite);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), eyeMat);
    eye.position.set(sx * 0.048, BODY_Y + 0.15, 0.375);
    group.add(eye);
    // ハイライト
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), eyeWhiteMat);
    hl.position.set(sx * 0.052, BODY_Y + 0.158, 0.388);
    group.add(hl);
  }

  // --- 口 ---
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.004), mouthMat);
  mouth.position.set(0, BODY_Y + 0.07, 0.435);
  group.add(mouth);

  // --- 耳(垂れ気味、三角) ---
  for (const sx of [-1, 1]) {
    const earPivot = new THREE.Group();
    earPivot.position.set(sx * 0.095, BODY_Y + 0.22, 0.22);
    earPivot.rotation.x = 0.15;
    earPivot.rotation.z = sx * 0.3;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.10, 12), furMat);
    ear.position.y = 0.04;
    ear.castShadow = true;
    earPivot.add(ear);
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.075, 10), bellyMat);
    earIn.position.set(0, 0.04, 0.005);
    earPivot.add(earIn);
    group.add(earPivot);
  }

  // --- 脚(シンプル短脚、ずんぐり)、Groupでpivot対応 ---
  const legs = [];
  const legPositions = [
    [-0.085, -0.20],
    [ 0.085, -0.20],
    [-0.08,   0.16],
    [ 0.08,   0.16],
  ];
  for (const [lx, lz] of legPositions) {
    const legGroup = new THREE.Group();
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.040, 0.22, 14), furMat,
    );
    leg.position.y = -0.11;
    leg.castShadow = true;
    legGroup.add(leg);
    legGroup.position.set(lx, BODY_Y - 0.08, lz);
    group.add(legGroup);
    legs.push(legGroup);
  }

  // --- 尻尾(上巻き、2セグ) ---
  const tailSegs = [];
  const tailBase = new THREE.Group();
  tailBase.position.set(0, BODY_Y + 0.10, -0.30);
  group.add(tailBase);
  let parent = tailBase;
  for (let i = 0; i < 2; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026 - i * 0.004, 0.030 - i * 0.004, 0.11, 12),
      furMat,
    );
    seg.position.y = 0.055;
    const pivot = new THREE.Group();
    pivot.position.y = parent === tailBase ? 0 : 0.11;
    pivot.rotation.x = -0.85 - i * 0.35; // 大きく上へ巻く
    pivot.add(seg);
    parent.add(pivot);
    tailSegs.push(pivot);
    parent = pivot;
  }

  group.userData.isPet = true;
  group.userData.petKind = 'dog';
  group.userData.parts = { legs, tailSegs };
  group.userData.npcName = 'イヌ';
  group.userData.dialogue = [
    'ワン！',
    'ワンワン！',
    'ウッ…ワン！',
    'クゥ〜ン',
    'ワンッ',
    'ハッハッハッ',
    'ヴァウッ！',
    '(しっぽを振ってる)',
    'キャンキャン',
    '(おすわりをした)',
    'クーン…',
    'ワォ〜ン',
    '(こちらに駆け寄ってくる)',
    'バウッ！',
    '(手を差し出すようにお手した)',
  ];
  return group;
}

// ---- NPC系ビルダー: 話しかけると吹き出しが出る人物 --------------------------

// 眼鏡・パーツ生成ヘルパー
function makeGlasses(group, yHead, zHead) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a22, roughness: 0.4, metalness: 0.3,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x88a0b8, roughness: 0.2, metalness: 0.3,
    transparent: true, opacity: 0.35,
  });
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.004, 8, 22), frameMat,
    );
    ring.position.set(sx * 0.042, yHead, zHead);
    group.add(ring);
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.026, 22), lensMat,
    );
    lens.position.set(sx * 0.042, yHead, zHead - 0.001);
    group.add(lens);
    // つる
    const temple = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0025, 0.0025, 0.12, 6), frameMat,
    );
    temple.rotation.z = Math.PI / 2;
    temple.position.set(sx * 0.10, yHead, zHead - 0.06);
    group.add(temple);
  }
  // ブリッジ
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.025, 6), frameMat,
  );
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, yHead, zHead + 0.001);
  group.add(bridge);
}

// NPCの脚group (股関節 pivot で位置、脚メッシュは下に伸びる)
// sx=-1/+1, userData.npcLegSign に歩行アニメ用の位相サインを記録(複製しても維持される)
function makeNpcLeg(sx, hipY, pantsMat, shoeMat, legW = 0.15, legH = 0.72, legD = 0.17) {
  const legGroup = new THREE.Group();
  legGroup.position.set(sx * 0.09, hipY, 0);
  legGroup.userData.npcLegSign = sx; // +1=右脚 は sin振幅に sx をかけて左右逆位相
  const leg = makePart(legW, legH, legD, pantsMat, 0.03);
  leg.position.y = -legH / 2;
  leg.castShadow = true;
  legGroup.add(leg);
  const shoe = makePart(legW + 0.02, 0.06, legD + 0.11, shoeMat, 0.02);
  shoe.position.set(0, -legH - 0.03, 0.05);
  shoe.castShadow = true;
  legGroup.add(shoe);
  return legGroup;
}
// NPCの腕group (肩 pivot で位置、腕メッシュは下に伸びる)
// userData.npcArmSign に歩行アニメ用の位相サイン(脚と逆位相なので -sx を設定)
function makeNpcArm(sx, shoulderY, upperMat, lowerMat, options = {}) {
  const armGroup = new THREE.Group();
  const upperLen = options.upperLen ?? 0.28;
  const lowerLen = options.lowerLen ?? 0.28;
  const armW = options.armW ?? 0.12;
  const armD = options.armD ?? 0.13;
  const offsetX = options.offsetX ?? 0.295;
  armGroup.position.set(sx * offsetX, shoulderY, 0);
  armGroup.userData.npcArmSign = -sx;
  const armU = makePart(armW, upperLen, armD, upperMat, 0.03);
  armU.position.y = -upperLen / 2;
  armU.castShadow = true;
  armGroup.add(armU);
  const armL = makePart(armW * 0.9, lowerLen, armD * 0.9, lowerMat, 0.03);
  armL.position.y = -upperLen - lowerLen / 2;
  armL.castShadow = true;
  armGroup.add(armL);
  return armGroup;
}

function buildMiddleAgedMan() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xddb088, roughness: 0.72 });
  const shirtMat = fabricMat('#6a7482', [2, 2]);
  const pantsMat = fabricMat('#3a3230', [1, 2]);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.5 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.3 });

  // 脚 (股関節 y=0.75)
  const legs = [
    makeNpcLeg(-1, 0.75, pantsMat, shoeMat),
    makeNpcLeg( 1, 0.75, pantsMat, shoeMat),
  ];
  legs.forEach(l => group.add(l));

  // 胴体(ぽっこり腹なし、通常体型)
  const torso = makePart(0.48, 0.55, 0.30, shirtMat, 0.05);
  torso.position.set(0, 1.05, 0);
  torso.castShadow = true;
  group.add(torso);
  const belt = makePart(0.50, 0.04, 0.31, beltMat, 0.008);
  belt.position.set(0, 0.77, 0);
  group.add(belt);

  // 腕 (肩 y=1.32)
  const arms = [
    makeNpcArm(-1, 1.32, shirtMat, skinMat),
    makeNpcArm( 1, 1.32, shirtMat, skinMat),
  ];
  arms.forEach(a => group.add(a));

  // 首
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.08, 14), skinMat);
  neck.position.y = 1.38;
  group.add(neck);

  // 頭
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), skinMat);
  head.scale.set(1.0, 1.08, 0.98);
  head.position.y = 1.53;
  head.castShadow = true;
  group.add(head);

  // 髪: 七三分けっぽい普通の髪型。頭 scale.y=1.08 より hair を広めに被せて禿げを防ぐ
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.66),
    hairMat,
  );
  hairCap.scale.set(1.02, 1.12, 1.02);
  hairCap.position.set(0, 1.53, 0);
  hairCap.castShadow = true;
  group.add(hairCap);
  // 前髪(サイド分け風)
  const bangs = makePart(0.20, 0.045, 0.03, hairMat, 0.008);
  bangs.position.set(-0.02, 1.66, 0.10);
  bangs.rotation.x = -0.25;
  bangs.rotation.z = 0.12;
  group.add(bangs);

  // 目
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), eyeMat);
    eye.position.set(sx * 0.042, 1.55, 0.115);
    group.add(eye);
  }
  // 眉
  const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const brow = makePart(0.032, 0.008, 0.008, browMat, 0.002);
    brow.position.set(sx * 0.042, 1.59, 0.118);
    group.add(brow);
  }
  // 眼鏡
  makeGlasses(group, 1.55, 0.121);

  // 口ひげ
  const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.88 });
  const mustache = makePart(0.055, 0.012, 0.012, mustacheMat, 0.003);
  mustache.position.set(0, 1.49, 0.118);
  group.add(mustache);
  // 口
  const mouth = makePart(0.03, 0.008, 0.005, new THREE.MeshStandardMaterial({ color: 0x5a2018, roughness: 0.6 }), 0.002);
  mouth.position.set(0, 1.465, 0.118);
  group.add(mouth);
  // 鼻
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), skinMat);
  nose.scale.set(1.0, 1.1, 1.1);
  nose.position.set(0, 1.515, 0.125);
  group.add(nose);

  group.userData.isPerson = true;
  group.userData.isNPC = true;
  group.userData.npcName = '社長';
  group.userData.dialogue = [
    'おお、お客様！ようこそお越しくださいましたのう。',
    'わが社のバーチャルオフィスへ、よくぞ足を運んでくださった。',
    'お忙しい中、ご来訪いただき誠にありがとうございますじゃ。',
    'お客様あってのわが社じゃ。本当に感謝しておるよ。',
    'うちの社員はみな真面目で、よく働いてくれておりますじゃ。',
    'お打ち合わせのご希望があれば、いつでもお声がけくだされ。',
    'バーチャルオフィスは初めてですかな？ゆっくり見ていってくだされ。',
    'お茶でもお出ししたいところじゃが、バーチャルではのう。ハッハッハ。',
    'お客様のお役に立てるよう、社員一同日々励んでおりますじゃ。',
    'ご縁を大切にしていきたい、それがわしの方針じゃよ。',
    'ご質問あれば、ホームページのお問い合わせからお気軽にどうぞ。',
    'このオフィスはわしらの誇りでしてな。気に入っていただけたら嬉しいのう。',
    'お客様のご要望、まずはじっくりお聞かせくだされ。',
    'わしも歳はとったが、まだまだお客様のために現役じゃよ。',
    'またのご来訪を、心よりお待ちしておりますじゃ。',
    '社員にもぜひ話しかけてやってくだされ。みな喜びますわい。',
    '本日はわざわざお越しいただき、恐縮ですじゃ。',
    'うちは小さな会社じゃが、お客様第一の心は誰にも負けんつもりじゃ。',
    'バーチャルでもこうしてお会いできて、嬉しい限りですじゃ。',
    'お客様の声がわしらの一番の励みじゃよ。',
    'ご縁をいただきありがとうございますじゃ。今後ともよろしくのう。',
  ];
  return group;
}

function buildYoungMan() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c4a2, roughness: 0.72 });
  const shirtMat = fabricMat('#3a8c4a', [2, 2]); // 緑Tシャツ
  const pantsMat = fabricMat('#3a5a82', [1, 2]); // 青デニム
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.88 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1820, roughness: 0.3 });

  // 脚 (股関節 y=0.82、やや長め)
  const legs = [
    makeNpcLeg(-1, 0.82, pantsMat, shoeMat, 0.14, 0.82, 0.16),
    makeNpcLeg( 1, 0.82, pantsMat, shoeMat, 0.14, 0.82, 0.16),
  ];
  legs.forEach(l => group.add(l));

  // 胴体(引き締まった若者)
  const torso = makePart(0.44, 0.60, 0.26, shirtMat, 0.05);
  torso.position.set(0, 1.17, 0);
  torso.castShadow = true;
  group.add(torso);

  // 腕 (肩 y=1.40、半袖:肩だけ赤、前腕は肌色)
  const arms = [
    makeNpcArm(-1, 1.40, shirtMat, skinMat, { upperLen: 0.22, lowerLen: 0.32, armW: 0.105, armD: 0.115, offsetX: 0.275 }),
    makeNpcArm( 1, 1.40, shirtMat, skinMat, { upperLen: 0.22, lowerLen: 0.32, armW: 0.105, armD: 0.115, offsetX: 0.275 }),
  ];
  arms.forEach(a => group.add(a));

  // 首
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 14), skinMat);
  neck.position.y = 1.50;
  group.add(neck);

  // 頭
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), skinMat);
  head.scale.set(1.0, 1.08, 0.96);
  head.position.y = 1.64;
  head.castShadow = true;
  group.add(head);

  // 髪(ショート、額までしっかり覆う)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.124, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairMat,
  );
  hairCap.scale.set(1.02, 1.05, 1.02);
  hairCap.position.y = 1.64;
  hairCap.castShadow = true;
  group.add(hairCap);
  // 前髪(額の上、ボリュームのある斜め流し)
  const bangs = makePart(0.20, 0.05, 0.03, hairMat, 0.008);
  bangs.position.set(0.015, 1.70, 0.10);
  bangs.rotation.z = 0.2;
  bangs.rotation.x = -0.3;
  group.add(bangs);
  // サイドの毛束(両こめかみ)
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), hairMat);
    side.scale.set(0.7, 1.2, 1.0);
    side.position.set(sx * 0.10, 1.65, 0.012);
    group.add(side);
  }

  // 眉
  const browMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const brow = makePart(0.028, 0.008, 0.008, browMat, 0.002);
    brow.position.set(sx * 0.038, 1.69, 0.11);
    brow.rotation.z = sx * 0.15;
    group.add(brow);
  }
  // 目
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), eyeMat);
    eye.position.set(sx * 0.038, 1.655, 0.112);
    group.add(eye);
  }
  // 口(笑顔っぽく)
  const mouth = makePart(0.035, 0.008, 0.005, new THREE.MeshStandardMaterial({ color: 0x8a3028, roughness: 0.6 }), 0.002);
  mouth.position.set(0, 1.58, 0.115);
  group.add(mouth);
  // 鼻
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), skinMat);
  nose.scale.set(1.0, 1.1, 1.0);
  nose.position.set(0, 1.618, 0.12);
  group.add(nose);

  group.userData.isPerson = true;
  group.userData.isNPC = true;
  group.userData.npcName = '社員Y';
  group.userData.dialogue = [
    'いらっしゃいませー！お越しいただきありがとうございますっ',
    'うちのオフィス、どうっすか？気に入ってもらえたら嬉しいっす！',
    '何か気になることあったら、遠慮なく聞いてくださいねー',
    'バーチャル空間でお客さんとお会いできるの、最高っすよね！',
    'うち、お客様第一で頑張ってる会社っす！自慢っす！',
    '社長、見た目はちょっと厳しそうですけど、めっちゃ優しいっすよ〜',
    'お打ち合わせとかご相談、いつでも歓迎っす！',
    'ホームページからもお気軽に問い合わせどうぞですー',
    'このオフィス、隅々まで見ていってくださいねっ',
    '今日はわざわざありがとうございますっ！',
    'うちの会社、お客様との繋がりを一番大事にしてるんすよ',
    '何か面白いコラボとかあれば、ぜひお声がけくださいっす！',
    'お客さん来てくれると元気出るっす〜！',
    'なんでも質問してください、答えられる範囲で答えますっ',
    'うちは小さい会社っすけど、誇りを持って仕事してます！',
    'お客様のご要望、しっかり聞かせてくださいー',
    'バーチャルでこうしてお会いできるの、ほんと面白いっすよね！',
    'ぜひまた遊びに来てくださいっす！いつでも歓迎っすよ〜',
    'うちの社長、お客さんに会えるとすごく喜ぶんすよ',
    '何かあれば、すぐに対応させていただきますっ！',
    '本日はご来訪ありがとうございますっ！またお会いしましょう〜',
  ];
  return group;
}

// 座ったNPC用の脚(太ももを水平前方、膝下を垂直下)。hipY=腰の高さ。
function makeSitLeg(sx, hipY, pantsMat, shoeMat, forwardOffset = 0, legW = 0.15, thighLen = 0.36, shinLen = 0.40) {
  const out = new THREE.Group();
  // 太もも(水平前方): pivotを股関節に、-90°回転で+Yが+Z(前方)へ
  const thighPivot = new THREE.Group();
  thighPivot.position.set(sx * 0.09, hipY, forwardOffset);
  thighPivot.rotation.x = -Math.PI / 2;
  const thigh = makePart(legW, thighLen, 0.17, pantsMat, 0.03);
  thigh.position.y = -thighLen / 2;
  thigh.castShadow = true;
  thighPivot.add(thigh);
  out.add(thighPivot);
  // 膝下(垂直): 膝位置(z=forwardOffset+thighLen)から床まで
  const kneeZ = forwardOffset + thighLen;
  const shin = makePart(legW - 0.01, shinLen, 0.16, pantsMat, 0.03);
  shin.position.set(sx * 0.09, hipY - shinLen / 2, kneeZ);
  shin.castShadow = true;
  out.add(shin);
  // 靴
  const shoe = makePart(legW + 0.02, 0.06, 0.28, shoeMat, 0.02);
  shoe.position.set(sx * 0.09, 0.03, kneeZ + 0.05);
  shoe.castShadow = true;
  out.add(shoe);
  return out;
}

// 座ったNPC用の腕(上腕垂直、前腕を前方へ90°折って膝/アームレストに乗せる)
function makeSitArm(sx, shoulderY, upperMat, lowerMat, forwardOffset = 0, opts = {}) {
  const out = new THREE.Group();
  const upperLen = opts.upperLen ?? 0.28;
  const lowerLen = opts.lowerLen ?? 0.28;
  const armW = opts.armW ?? 0.12;
  const armD = opts.armD ?? 0.13;
  const offsetX = opts.offsetX ?? 0.295;
  // 上腕(垂直)
  const armU = makePart(armW, upperLen, armD, upperMat, 0.03);
  armU.position.set(sx * offsetX, shoulderY - upperLen / 2, forwardOffset);
  armU.castShadow = true;
  out.add(armU);
  // 前腕(前方水平): 肘から前方
  const elbowY = shoulderY - upperLen;
  const fPivot = new THREE.Group();
  fPivot.position.set(sx * offsetX, elbowY, forwardOffset);
  fPivot.rotation.x = -Math.PI / 2;
  const armL = makePart(armW * 0.9, lowerLen, armD * 0.9, lowerMat, 0.03);
  armL.position.y = -lowerLen / 2;
  armL.castShadow = true;
  fPivot.add(armL);
  out.add(fPivot);
  return out;
}

function buildMiddleAgedManSit() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xddb088, roughness: 0.72 });
  const shirtMat = fabricMat('#6a7482', [2, 2]);
  const pantsMat = fabricMat('#3a3230', [1, 2]);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x5a4a42, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.5 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.3 });

  const HIP_Y = 0.48; // 椅子座面(0.43)の少し上
  const HIP_Z = -0.05; // 座面のやや後ろ寄り

  // 脚(座り姿勢): shinはHIP_Y長で足が床に届くように
  group.add(makeSitLeg(-1, HIP_Y, pantsMat, shoeMat, HIP_Z, 0.15, 0.36, HIP_Y));
  group.add(makeSitLeg( 1, HIP_Y, pantsMat, shoeMat, HIP_Z, 0.15, 0.36, HIP_Y));

  // 胴体
  const torsoH = 0.55;
  const torsoY = HIP_Y + torsoH / 2 + 0.02; // 0.785 center
  const torso = makePart(0.48, torsoH, 0.30, shirtMat, 0.05);
  torso.position.set(0, torsoY, HIP_Z);
  torso.castShadow = true;
  group.add(torso);
  const belt = makePart(0.50, 0.04, 0.31, beltMat, 0.008);
  belt.position.set(0, HIP_Y + 0.02, HIP_Z);
  group.add(belt);

  // 腕(アームレストに乗せるように前方水平)
  const shoulderY = torsoY + torsoH / 2 - 0.02; // 1.05
  group.add(makeSitArm(-1, shoulderY, shirtMat, skinMat, HIP_Z));
  group.add(makeSitArm( 1, shoulderY, shirtMat, skinMat, HIP_Z));

  // 首 + 頭
  const neckY = shoulderY + 0.05; // 1.10
  const headY = shoulderY + 0.20; // 1.25
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.08, 14), skinMat);
  neck.position.set(0, neckY, HIP_Z);
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 18), skinMat);
  head.scale.set(1.0, 1.08, 0.98);
  head.position.set(0, headY, HIP_Z);
  head.castShadow = true;
  group.add(head);

  // 髪(七三分けキャップ、てっぺん禿げ防止)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.66),
    hairMat,
  );
  hairCap.scale.set(1.02, 1.12, 1.02);
  hairCap.position.set(0, headY, HIP_Z);
  hairCap.castShadow = true;
  group.add(hairCap);
  const bangs = makePart(0.20, 0.045, 0.03, hairMat, 0.008);
  bangs.position.set(-0.02, headY + 0.13, HIP_Z + 0.10);
  bangs.rotation.x = -0.25;
  bangs.rotation.z = 0.12;
  group.add(bangs);

  // 目
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), eyeMat);
    eye.position.set(sx * 0.042, headY + 0.02, HIP_Z + 0.115);
    group.add(eye);
  }
  // 眉
  const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const brow = makePart(0.032, 0.008, 0.008, browMat, 0.002);
    brow.position.set(sx * 0.042, headY + 0.06, HIP_Z + 0.118);
    group.add(brow);
  }
  // 眼鏡
  makeGlasses(group, headY + 0.02, HIP_Z + 0.121);
  // 口ひげ + 口 + 鼻
  const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.88 });
  const mustache = makePart(0.055, 0.012, 0.012, mustacheMat, 0.003);
  mustache.position.set(0, headY - 0.04, HIP_Z + 0.118);
  group.add(mustache);
  const mouth = makePart(0.03, 0.008, 0.005, new THREE.MeshStandardMaterial({ color: 0x5a2018, roughness: 0.6 }), 0.002);
  mouth.position.set(0, headY - 0.065, HIP_Z + 0.118);
  group.add(mouth);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), skinMat);
  nose.scale.set(1.0, 1.1, 1.1);
  nose.position.set(0, headY - 0.015, HIP_Z + 0.125);
  group.add(nose);

  group.userData.isPerson = true;
  group.userData.isNPC = true;
  group.userData.npcName = '社長';
  group.userData.dialogue = [
    'おお、お客様ですかな？まあまあ、お楽にしてくだされ。',
    'ようこそお越しくださいましたじゃ。座って話しましょうかのう。',
    'お忙しい中、ご来訪いただき本当にありがとうございますじゃ。',
    'わが社の理念は、お客様第一じゃ。これは創業以来変わらんのう。',
    'お打ち合わせのご希望があれば、いつでもお声がけくだされ。',
    'バーチャルオフィスもなかなか面白いものですのう。',
    'お客様にご満足いただけるよう、日々努めておりますじゃ。',
    'お時間あれば、社員とも話してやってくだされ。みな喜びますわい。',
    'ご縁をいただけて、嬉しい限りですじゃ。',
    'コーヒーでも一緒に、と言いたいところですがのう。バーチャルでは難しい。',
    'いつもお客様に支えられておりますじゃ。本当にありがたいことじゃ。',
    'ご質問あれば、ホームページのお問い合わせフォームからどうぞ。',
    'またのご来訪を心よりお待ちしておりますじゃ。',
    '社員一同、お客様のために頑張っておりますじゃ。',
    'ゆっくりオフィス内を見ていってくだされのう。',
    'お客様の声が、わしらの一番の財産じゃよ。',
    'うちは小さな会社じゃが、誠意でお応えするのが信条ですじゃ。',
    'バーチャルとはいえ、こうしてお会いできるのは嬉しいですのう。',
    'ご要望ありましたら、遠慮なくお聞かせくだされ。',
    'お客様あってのわが社じゃ。今後ともよろしくお願い申し上げますじゃ。',
    'わしも歳じゃが、お客様のためならまだまだ働けますわい。',
  ];
  return group;
}

function buildYoungManSit() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8c4a2, roughness: 0.72 });
  const shirtMat = fabricMat('#3a8c4a', [2, 2]); // 緑Tシャツ
  const pantsMat = fabricMat('#3a5a82', [1, 2]);
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.88 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1820, roughness: 0.3 });

  const HIP_Y = 0.48;
  const HIP_Z = -0.05;

  // 脚: shinはHIP_Y長で足が床に届くように
  group.add(makeSitLeg(-1, HIP_Y, pantsMat, shoeMat, HIP_Z, 0.14, 0.34, HIP_Y));
  group.add(makeSitLeg( 1, HIP_Y, pantsMat, shoeMat, HIP_Z, 0.14, 0.34, HIP_Y));

  // 胴体
  const torsoH = 0.60;
  const torsoY = HIP_Y + torsoH / 2 + 0.02; // 0.81
  const torso = makePart(0.44, torsoH, 0.26, shirtMat, 0.05);
  torso.position.set(0, torsoY, HIP_Z);
  torso.castShadow = true;
  group.add(torso);

  // 腕
  const shoulderY = torsoY + torsoH / 2 - 0.02; // 1.09
  group.add(makeSitArm(-1, shoulderY, shirtMat, skinMat, HIP_Z, { upperLen: 0.22, lowerLen: 0.32, armW: 0.105, armD: 0.115, offsetX: 0.275 }));
  group.add(makeSitArm( 1, shoulderY, shirtMat, skinMat, HIP_Z, { upperLen: 0.22, lowerLen: 0.32, armW: 0.105, armD: 0.115, offsetX: 0.275 }));

  // 首 + 頭
  const neckY = shoulderY + 0.04;
  const headY = shoulderY + 0.18;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 14), skinMat);
  neck.position.set(0, neckY, HIP_Z);
  group.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), skinMat);
  head.scale.set(1.0, 1.08, 0.96);
  head.position.set(0, headY, HIP_Z);
  head.castShadow = true;
  group.add(head);

  // 髪
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.124, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairMat,
  );
  hairCap.scale.set(1.02, 1.05, 1.02);
  hairCap.position.set(0, headY, HIP_Z);
  hairCap.castShadow = true;
  group.add(hairCap);
  const bangs = makePart(0.20, 0.05, 0.03, hairMat, 0.008);
  bangs.position.set(0.015, headY + 0.06, HIP_Z + 0.10);
  bangs.rotation.z = 0.2;
  bangs.rotation.x = -0.3;
  group.add(bangs);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), hairMat);
    side.scale.set(0.7, 1.2, 1.0);
    side.position.set(sx * 0.10, headY + 0.01, HIP_Z + 0.012);
    group.add(side);
  }

  // 眉
  const browMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const brow = makePart(0.028, 0.008, 0.008, browMat, 0.002);
    brow.position.set(sx * 0.038, headY + 0.05, HIP_Z + 0.11);
    brow.rotation.z = sx * 0.15;
    group.add(brow);
  }
  // 目
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), eyeMat);
    eye.position.set(sx * 0.038, headY + 0.015, HIP_Z + 0.112);
    group.add(eye);
  }
  // 口
  const mouth = makePart(0.035, 0.008, 0.005, new THREE.MeshStandardMaterial({ color: 0x8a3028, roughness: 0.6 }), 0.002);
  mouth.position.set(0, headY - 0.06, HIP_Z + 0.115);
  group.add(mouth);
  // 鼻
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), skinMat);
  nose.scale.set(1.0, 1.1, 1.0);
  nose.position.set(0, headY - 0.022, HIP_Z + 0.12);
  group.add(nose);

  group.userData.isPerson = true;
  group.userData.isNPC = true;
  group.userData.npcName = '社員Y';
  group.userData.dialogue = [
    'あっ、お客さんっすか！いらっしゃいませー！',
    'ちょうど一息ついてたとこっす。お話しませんか？',
    'うちのオフィス、結構こだわって作ったんすよ！',
    'バーチャルでお客さん来てくれるの、ほんと嬉しいっす！',
    'なんか気になるとこあったら聞いてくださいねー',
    'お客様第一で頑張ってる会社っす！自信あります！',
    '社長もフレンドリーなんで、安心して話せるっすよ',
    'お打ち合わせとかご相談、いつでもどうぞっす！',
    'ホームページからも問い合わせ受け付けてますよー',
    'こんなふうにお客さんとオンラインで会えるの、面白いっすよね',
    'ゆっくりオフィス見ていってくださいっ！',
    'なんか面白い企画あったらコラボしましょー！',
    'うちの会社、若手にも優しいんすよ。社長のおかげっす',
    'またいつでも来てください！歓迎っす！',
    'お客さん来てくれると元気出るっす〜',
    '本日はわざわざありがとうございますっ！',
    'うちの仕事内容、興味あったらぜひ聞いてください！',
    'ご質問あれば、ホームページからお気軽にどうぞっす',
    'お客様のお話、しっかり聞かせてくださいねー',
    'こうやってお会いできるご縁、大切にしたいっす！',
    'またお会いできる日を楽しみにしてるっす〜！',
  ];
  return group;
}

function buildYoungWoman() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2d4b2, roughness: 0.7 });
  const topMat = fabricMat('#d89ab2', [2, 2]); // 優しいピンク
  const skirtMat = fabricMat('#3a3f52', [1, 1.5]); // 紺のスカート
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.88 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x6a3a48, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.3 });

  // 脚 group (股関節 y=0.70、肌色タイツ想定の円柱脚)
  const makeSlimLeg = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.075, 0.70, 0);
    g.userData.npcLegSign = sx;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.062, 0.66, 14), skinMat,
    );
    leg.position.y = -0.33;
    leg.castShadow = true;
    g.add(leg);
    const shoe = makePart(0.11, 0.045, 0.22, shoeMat, 0.02);
    shoe.position.set(0, -0.68, 0.035);
    shoe.castShadow = true;
    g.add(shoe);
    return g;
  };
  const legs = [makeSlimLeg(-1), makeSlimLeg(1)];
  legs.forEach(l => group.add(l));

  // スカート(台形)
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.22, 0.25, 20), skirtMat,
  );
  skirt.position.y = 0.87;
  skirt.castShadow = true;
  group.add(skirt);

  // 胴体(細め)
  const torso = makePart(0.34, 0.44, 0.22, topMat, 0.05);
  torso.position.set(0, 1.20, 0);
  torso.castShadow = true;
  group.add(torso);
  const waistBand = makePart(0.35, 0.03, 0.23, new THREE.MeshStandardMaterial({ color: 0x6a4a5a, roughness: 0.7 }), 0.005);
  waistBand.position.set(0, 0.99, 0);
  group.add(waistBand);

  // 腕 group (肩 y=1.40、長袖で手は腕下端)
  const makeWomanArm = (sx) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.225, 1.40, 0);
    g.userData.npcArmSign = -sx;
    const armU = makePart(0.095, 0.28, 0.1, topMat, 0.03);
    armU.position.y = -0.14;
    armU.castShadow = true;
    g.add(armU);
    const armL = makePart(0.085, 0.28, 0.09, topMat, 0.03);
    armL.position.y = -0.42;
    armL.castShadow = true;
    g.add(armL);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skinMat);
    hand.scale.set(1, 0.8, 1);
    hand.position.y = -0.58;
    g.add(hand);
    return g;
  };
  const arms = [makeWomanArm(-1), makeWomanArm(1)];
  arms.forEach(a => group.add(a));

  // 首
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.053, 0.07, 14), skinMat);
  neck.position.y = 1.46;
  group.add(neck);

  // 頭
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.108, 24, 18), skinMat);
  head.scale.set(1.0, 1.08, 0.98);
  head.position.y = 1.58;
  head.castShadow = true;
  group.add(head);

  // ロングヘア: 後頭部半球キャップ + 両脇の垂れ房
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat,
  );
  hairCap.scale.set(1.0, 1.15, 1.0);
  hairCap.position.set(0, 1.58, -0.008);
  hairCap.castShadow = true;
  group.add(hairCap);
  // 両脇の髪束(肩まで)
  for (const sx of [-1, 1]) {
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.050, 0.32, 14), hairMat,
    );
    strand.position.set(sx * 0.095, 1.38, -0.015);
    strand.castShadow = true;
    group.add(strand);
  }
  // 前髪(斜めに流れる)
  const bangs = makePart(0.20, 0.045, 0.028, hairMat, 0.008);
  bangs.position.set(0.015, 1.68, 0.095);
  bangs.rotation.x = -0.3;
  bangs.rotation.z = 0.15;
  group.add(bangs);

  // 目(白目+黒目)
  for (const sx of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    );
    eyeWhite.scale.set(1, 1.1, 0.5);
    eyeWhite.position.set(sx * 0.036, 1.59, 0.108);
    group.add(eyeWhite);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.010, 10, 8), eyeMat);
    eye.position.set(sx * 0.036, 1.59, 0.116);
    group.add(eye);
    // まつ毛
    const lash = makePart(0.022, 0.004, 0.004, new THREE.MeshStandardMaterial({ color: 0x1a1208 }), 0.001);
    lash.position.set(sx * 0.036, 1.605, 0.118);
    lash.rotation.z = sx * 0.05;
    group.add(lash);
  }
  // 眉
  const browMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const brow = makePart(0.025, 0.005, 0.005, browMat, 0.001);
    brow.position.set(sx * 0.036, 1.625, 0.115);
    brow.rotation.z = -sx * 0.12;
    group.add(brow);
  }
  // 頬紅
  const blushMat = new THREE.MeshStandardMaterial({
    color: 0xf2a8a8, roughness: 0.7, transparent: true, opacity: 0.5,
  });
  for (const sx of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), blushMat);
    blush.scale.set(1, 0.55, 0.3);
    blush.position.set(sx * 0.055, 1.57, 0.108);
    group.add(blush);
  }
  // 鼻
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), skinMat);
  nose.scale.set(1.0, 1.1, 1.0);
  nose.position.set(0, 1.565, 0.118);
  group.add(nose);
  // 口
  const mouth = makePart(0.022, 0.008, 0.005, new THREE.MeshStandardMaterial({ color: 0xc04848, roughness: 0.55 }), 0.002);
  mouth.position.set(0, 1.545, 0.116);
  group.add(mouth);

  group.userData.isPerson = true;
  group.userData.isNPC = true;
  group.userData.npcName = 'NPC3';
  group.userData.dialogue = [
    'わあ、素敵なお部屋ですね！',
    'この壁紙の色、すごく落ち着きます♪',
    'あ、植物があるんですね。わたしも育ててるんです〜',
    'ちょっとソファで休んでいいですか？',
    '猫ちゃんかわいい…！なでてもいいですか？',
    'いい香りがしますね。アロマとか焚いてます？',
    'このラグ、踏み心地よさそう〜',
    '家具の配置、動線が良く考えられてますね！',
    'わたし、片付けが苦手で…コツとかあります？',
    'このカーテン、光の入り方がちょうどいい感じ。',
    'わんちゃんもいるんですか？両方飼えるの羨ましいなあ〜',
    'この絵、お気に入りなんですか？雰囲気に合ってますね♪',
    'ちょっとだけ座らせてもらえますか？脚が疲れちゃって…',
    'コーヒーでも一緒にいかがですか？差し入れ持ってきました〜',
    'お部屋、もう少し奥行きもあったら完璧ですね！あっ、いやこのままでも十分素敵！',
    'あのモニター、ワークスペース憧れます！わたしも在宅のときに欲しい…',
    'カラーコーデがすごく上手ですね。参考にさせてください！',
    '今度、インテリアショップ一緒に行きませんか？',
    '鏡があると部屋って広く見えますよね〜わたしも置いてます。',
    'お邪魔してごめんなさい、もう少しだけいていいですか？',
    '社長さん、なんかおじいちゃんみたいでほっこりしますね♪',
    '社員Yくん、元気ですよねー！若いパワーもらえます。',
  ];
  return group;
}

// 訪問者スポーン地点マーカー: 矢印付きの小さな円盤。+Z方向が訪問者の向き
function buildSpawnPoint() {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xe84a78, roughness: 0.4, emissive: 0x3a1020, emissiveIntensity: 0.35,
    transparent: true, opacity: 0.75,
  });
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.3, emissive: 0x444444, emissiveIntensity: 0.3,
  });
  // ベース(薄い円盤)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 20), baseMat);
  base.position.y = 0.01;
  group.add(base);
  // 方向矢印(+Z)
  const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.15), arrowMat);
  arrowShaft.position.set(0, 0.025, 0.04);
  group.add(arrowShaft);
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), arrowMat);
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.position.set(0, 0.025, 0.14);
  group.add(arrowHead);
  // "SPAWN" ラベル代わりの上向きビーコン
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.3, 8), baseMat,
  );
  beacon.position.y = 0.16;
  group.add(beacon);

  // clamp対象外(壁近くにも置ける)
  group.userData.spawnMarker = true;
  return group;
}

const BUILDERS = {
  bed: buildBed,
  desk: buildDesk,
  chair: buildChair,
  gamingChair: buildGamingChair,
  person: buildPerson,
  cat: buildCat,
  dog: buildDog,
  middleAgedMan: buildMiddleAgedMan,
  youngMan: buildYoungMan,
  youngWoman: buildYoungWoman,
  middleAgedManSit: buildMiddleAgedManSit,
  youngManSit: buildYoungManSit,
  spawnPoint: buildSpawnPoint,
  sofa: buildSofa,
  shelf: buildShelf,
  table: buildTable,
  sink: buildSink,
  fridge: buildFridge,
  rack: buildRack,
  incense: buildIncense,
  trashCan: buildTrashCan,
  airconStand: buildAirconStand,
  mirror: buildMirror,
  plant: buildPlant,
  tv: buildTV,
  rug: buildRug,
  rug_geo: buildRugGeo,
  rug_floral: buildRugFloral,
  rug_nordic: buildRugNordic,
  rug_round: buildRugRound,
  rug_patchwork: buildRugPatchwork,
  poangChair: buildPoangChair,
  roundSideTable: buildRoundSideTable,
  curtain: buildCurtain,
  painting: buildPainting,
  laptop: buildLaptop,
  monitor: buildMonitor,
  whiteboard: buildWhiteboard,
  book: buildBook,
  aircon: buildAircon,
  lamp: buildLamp,
  door: buildDoor,
  door2: buildDoor2,
  door3: buildDoor3,
  window: buildWindow,
  passWindow: buildPassWindow,
  wall: buildWall,
  trackLight: buildTrackLight,
  floatShelf: buildFloatShelf,
  wrestlingBelt: buildWrestlingBelt,
  wrestlingMask: buildWrestlingMask,
  wrestlingPhotoFrame: buildWrestlingPhotoFrame,
};

const ALL_PRESETS = { ...FURNITURE_PRESETS, ...DESIGN_PRESETS };

export function createFurniture(type) {
  const preset = ALL_PRESETS[type];
  if (!preset) throw new Error(`Unknown type: ${type}`);
  const builder = BUILDERS[type];
  const group = builder();
  const [, h] = preset.size;
  group.userData.furnitureType = type;
  group.userData.baseHeight = h;
  // 天井付け系/壁掛け小物はclamp対象外（内壁・ドア・窓は部屋外に貫通しないようclamp対象）
  if (type === 'trackLight' || type === 'floatShelf' ||
      type === 'laptop' || type === 'monitor' ||
      type === 'whiteboard' || type === 'book' ||
      type === 'aircon' || type === 'lamp' ||
      type === 'curtain' || type === 'painting' ||
      type === 'mirror' || type === 'spawnPoint' ||
      type === 'passWindow' ||
      // 机上の小物 (プロレス系飾り)
      type === 'wrestlingBelt' || type === 'wrestlingMask' ||
      type === 'wrestlingPhotoFrame' ||
      // ラグ類は床に置く平らな飾り。プレイヤー/ペットの当たり判定対象外。
      type === 'rug' || type === 'rug_geo' || type === 'rug_floral' ||
      type === 'rug_nordic' || type === 'rug_round' || type === 'rug_patchwork') {
    group.userData.skipClamp = true;
  }
  return group;
}

export function serializeFurniture(obj) {
  // quaternion を保存すると Euler 順序や ±2πの巻き戻り問題が消える。
  // 後方互換のため rotationY も残す(旧データ読込時はこちらを使う)。
  const q = obj.quaternion;
  const out = {
    type: obj.userData.furnitureType,
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotationY: obj.rotation.y,
    quaternion: [q.x, q.y, q.z, q.w],
    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
  };
  if (obj.userData.fixedY != null) out.fixedY = obj.userData.fixedY;
  if (obj.userData.colorOverride) out.colorOverride = obj.userData.colorOverride;
  return out;
}

// 色オーバーライドを全メッシュに適用（色ピッカーと同じロジックを復元用に）
function applyColorOverride(obj, hex) {
  obj.traverse((child) => {
    if (child.isMesh && child.material) {
      if (child.userData.noTint) return; // 鏡のReflector等は保護
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m) => {
          const n = m.clone();
          if (n.color) n.color.set(hex);
          if (n.map) { n.map = null; n.needsUpdate = true; }
          return n;
        });
      } else {
        const n = child.material.clone();
        if (n.color) n.color.set(hex);
        if (n.map) { n.map = null; n.needsUpdate = true; }
        child.material = n;
      }
    }
  });
  obj.userData.colorOverride = hex;
}

export function deserializeFurniture(data) {
  const obj = createFurniture(data.type);
  obj.position.set(...data.position);
  // quaternion があればそれを優先(旧データはrotationYしかない)
  if (Array.isArray(data.quaternion) && data.quaternion.length === 4) {
    obj.quaternion.set(...data.quaternion);
  } else if (typeof data.rotationY === 'number') {
    obj.rotation.set(0, data.rotationY, 0);
  }
  obj.scale.set(...data.scale);
  if (data.fixedY != null) obj.userData.fixedY = data.fixedY;
  // 旧形式の窓救済
  if (data.type === 'window' && data.fixedY == null && Math.abs(data.position[1]) < 0.01) {
    obj.position.y = 0.9;
    obj.userData.fixedY = 0.9;
  }
  if (data.colorOverride) applyColorOverride(obj, data.colorOverride);
  return obj;
}
