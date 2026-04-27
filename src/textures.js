import * as THREE from 'three';

function finalize(canvas, { anisotropy = 16 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// タイル床（正方形タイル、白セラミック風）
export function makeTileFloorTexture(baseHex = '#f0ece6', groutHex = '#aaa8a0') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = groutHex;
  ctx.fillRect(0, 0, W, H);
  const size = 124, gap = 4;
  for (let y = 0; y < H; y += size + gap) {
    for (let x = 0; x < W; x += size + gap) {
      // 各タイルに微妙な色揺れ
      const shade = Math.random() * 12 - 6;
      const r = Math.min(255, 0xf0 + shade);
      const g = Math.min(255, 0xec + shade);
      const b = Math.min(255, 0xe6 + shade);
      ctx.fillStyle = `rgb(${r|0}, ${g|0}, ${b|0})`;
      ctx.fillRect(x, y, size, size);
    }
  }
  return finalize(canvas);
}

// コンクリート床
export function makeConcreteFloorTexture(baseHex = '#989898') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 80; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = 30 + Math.random() * 70;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    const alpha = 0.05 + Math.random() * 0.12;
    const dark = Math.random() < 0.5;
    g.addColorStop(0, `rgba(${dark?40:220}, ${dark?40:220}, ${dark?40:220}, ${alpha})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalize(canvas);
}

// カーペット床（繊維感）
export function makeCarpetFloorTexture(baseHex = '#a87a5a') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  // 短い繊維状の線を多数
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 3 + Math.random() * 6;
    const angle = Math.random() * Math.PI;
    const shade = Math.random() * 30 - 15;
    ctx.strokeStyle = `rgba(${0xa8 + shade|0}, ${0x7a + shade/2|0}, ${0x5a + shade/3|0}, 0.7)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  return finalize(canvas);
}

// 大理石床（白地に灰色の脈状模様）
export function makeMarbleFloorTexture(baseHex = '#eceae4', veinHex = '#a0a0a0') {
  const W = 1024, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  // ベースの薄いムラ
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = 80 + Math.random() * 160;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, `rgba(220, 220, 215, 0.15)`);
    g.addColorStop(1, 'rgba(220, 220, 215, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 脈（途切れ途切れの曲線）
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(120, 120, 120, ${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.8;
    ctx.beginPath();
    let x = Math.random() * W;
    let y = Math.random() * H;
    ctx.moveTo(x, y);
    const steps = 20 + Math.random() * 20;
    for (let s = 0; s < steps; s++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finalize(canvas, { anisotropy: 16 });
}

// 板張り風の木目テクスチャ（床用）
export function makePlankFloorTexture() {
  const W = 1024, H = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const plankCount = 6;
  const plankH = H / plankCount;

  const baseColors = [
    ['#a87a4a', '#8b5e30'],
    ['#b88a5a', '#9a6c3c'],
    ['#9c7040', '#7e5426'],
    ['#b58258', '#8f6236'],
    ['#a2744a', '#855830'],
    ['#b38a5e', '#936a3e'],
  ];

  for (let p = 0; p < plankCount; p++) {
    const y0 = p * plankH;
    const [c1, c2] = baseColors[p % baseColors.length];
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + plankH);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y0, W, plankH);

    // 木目の線（高周波を避けて本数少なめ・太め）
    for (let i = 0; i < 14; i++) {
      const yLine = y0 + (i + 0.5) * (plankH / 14);
      ctx.strokeStyle = `rgba(40, 20, 8, ${0.06 + Math.random() * 0.12})`;
      ctx.lineWidth = 1.2 + Math.random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, yLine);
      for (let x = 0; x <= W; x += 32) {
        ctx.lineTo(x, yLine + Math.sin(x * 0.006 + i * 0.7) * 2.5);
      }
      ctx.stroke();
    }

    // 節
    if (Math.random() < 0.5) {
      const cx = Math.random() * W;
      const cy = y0 + plankH * (0.3 + Math.random() * 0.4);
      const r = 10 + Math.random() * 14;
      const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
      g.addColorStop(0, 'rgba(45, 22, 8, 0.7)');
      g.addColorStop(0.6, 'rgba(60, 34, 14, 0.3)');
      g.addColorStop(1, 'rgba(60, 34, 14, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 板の境目
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(W, y0);
    ctx.stroke();
  }

  return finalize(canvas);
}

// 家具用の木目（縦目・濃いめ・高周波ノイズなし）
export function makeWoodTextureFurniture(baseHex = '#6b431f') {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 20; i++) {
    const x = (i + 0.5) * (W / 20);
    ctx.strokeStyle = `rgba(30, 15, 5, ${0.08 + Math.random() * 0.15})`;
    ctx.lineWidth = 1.0 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= H; y += 16) {
      ctx.lineTo(x + Math.sin(y * 0.04 + i) * 1.6, y);
    }
    ctx.stroke();
  }

  if (Math.random() < 0.6) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = 6 + Math.random() * 8;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    g.addColorStop(0, 'rgba(25, 12, 4, 0.75)');
    g.addColorStop(1, 'rgba(25, 12, 4, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalize(canvas, { anisotropy: 8 });
}

// 布地テクスチャ（低周波・うっすらとしたストライプ）
export function makeFabricTexture(baseHex = '#b8c4d9') {
  const W = 128, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  // 太めで間隔の広いライン（モアレを防ぐため高周波の線は避ける）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < W; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  for (let j = 0; j < H; j += 8) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(W, j); ctx.stroke();
  }

  return finalize(canvas, { anisotropy: 8 });
}

// 壁用 — 単色マテリアルで十分（塗り壁のノイズはモアレの原因になりやすいのでテクスチャは付けない）
export function makeWallTexture(baseHex = '#ebe5d8') {
  const W = 32, H = 32;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  return finalize(canvas, { anisotropy: 4 });
}

// ストライプ壁紙（縦縞）
export function makeStripeWallpaperTexture(baseHex = '#f4efe6', stripeHex = '#d4b89e') {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = stripeHex;
  // 縦の広めストライプ
  for (let x = 0; x < W; x += 32) {
    ctx.fillRect(x, 0, 16, H);
  }
  return finalize(canvas);
}

// レンガ壁紙
export function makeBrickWallpaperTexture(baseHex = '#b55a3a', mortarHex = '#3a2818') {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = mortarHex;
  ctx.fillRect(0, 0, W, H);
  const bw = 100, bh = 40, gap = 4;
  for (let row = 0; row * (bh + gap) < H + bh; row++) {
    const y = row * (bh + gap);
    const offset = (row % 2 === 0) ? 0 : -bw / 2;
    for (let col = -1; col * (bw + gap) < W + bw; col++) {
      const x = col * (bw + gap) + offset;
      // 各レンガに少しランダムな色の揺れ
      const shade = Math.random() * 30 - 15;
      ctx.fillStyle = `rgb(${Math.max(0, 0xb5 + shade)}, ${Math.max(0, 0x5a + shade / 2)}, ${Math.max(0, 0x3a + shade / 3)})`;
      ctx.fillRect(x, y, bw, bh);
    }
  }
  return finalize(canvas);
}

// コンクリート壁紙（ムラのあるグレー）
export function makeConcreteWallpaperTexture(baseHex = '#a8a8a8') {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  // 大きめの雲状のムラ
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = 20 + Math.random() * 40;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    const alpha = 0.08 + Math.random() * 0.12;
    const isDark = Math.random() < 0.5;
    g.addColorStop(0, `rgba(${isDark?40:200}, ${isDark?40:200}, ${isDark?40:200}, ${alpha})`);
    g.addColorStop(1, `rgba(${isDark?40:200}, ${isDark?40:200}, ${isDark?40:200}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalize(canvas);
}

// 縦板張りの壁紙テクスチャ
export function makeWoodPanelTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const plankCount = 8;
  const plankW = W / plankCount;

  const baseColors = [
    ['#a07a4e', '#84623a'],
    ['#b08860', '#947048'],
    ['#987242', '#7a5830'],
    ['#a8805a', '#8a6a42'],
  ];

  for (let p = 0; p < plankCount; p++) {
    const x0 = p * plankW;
    const [c1, c2] = baseColors[p % baseColors.length];
    const grad = ctx.createLinearGradient(x0, 0, x0 + plankW, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(0.5, c2);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fillRect(x0, 0, plankW, H);

    for (let i = 0; i < 12; i++) {
      const xLine = x0 + (i + 0.5) * (plankW / 12);
      ctx.strokeStyle = `rgba(40, 20, 8, ${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.8 + Math.random() * 1.0;
      ctx.beginPath();
      ctx.moveTo(xLine, 0);
      for (let y = 0; y <= H; y += 32) {
        ctx.lineTo(xLine + Math.sin(y * 0.01 + i) * 1.8, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(20, 10, 4, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, H);
    ctx.stroke();
  }

  return finalize(canvas);
}

// ラグ/カーテン用の幾何柄（シェブロン）
export function makeGeometricPatternTexture(baseHex = '#d9cbb0', accentHex = '#5a4a3a') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  // シェブロン（山型）模様
  const stripe = 48;
  ctx.fillStyle = accentHex;
  for (let y = -stripe; y < H + stripe; y += stripe * 2) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += stripe * 2) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + stripe, y + stripe);
      ctx.lineTo(x + stripe * 2, y);
      ctx.lineTo(x + stripe * 2, y + stripe * 0.3);
      ctx.lineTo(x + stripe, y + stripe * 1.3);
      ctx.lineTo(x, y + stripe * 0.3);
      ctx.closePath();
    }
    ctx.fill();
  }
  return finalize(canvas);
}

// ラグ/カーテン用の花柄
export function makeFloralPatternTexture(baseHex = '#f0e4d7', accentHex = '#8b5a8b', leafHex = '#5a7a5a') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  const step = 110;
  for (let y = 0; y <= H; y += step) {
    const offset = (y / step) % 2 === 0 ? 0 : step / 2;
    for (let x = -step; x <= W; x += step) {
      const cx = x + offset, cy = y;
      // 花びら 6枚
      ctx.fillStyle = accentHex;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, 12, 8, a, 0, Math.PI * 2);
        ctx.fill();
      }
      // 中心
      ctx.fillStyle = '#e8c068';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      // 葉
      ctx.fillStyle = leafHex;
      ctx.beginPath();
      ctx.ellipse(cx + 28, cy + 20, 10, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 28, cy - 20, 10, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finalize(canvas);
}

// ラグ/カーテン用の北欧風（ダイヤ＋ストライプ）
export function makeNordicPatternTexture(baseHex = '#f5f0e8', accentHex = '#2a5a7a', accent2Hex = '#b84a3a') {
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);
  // 横ストライプ
  ctx.fillStyle = accentHex;
  for (let y = 0; y < H; y += 120) {
    ctx.fillRect(0, y, W, 8);
    ctx.fillRect(0, y + 96, W, 8);
  }
  // ダイヤ
  for (let y = 60; y < H; y += 120) {
    for (let x = 40; x < W; x += 100) {
      ctx.fillStyle = (x % 200 === 40) ? accentHex : accent2Hex;
      ctx.beginPath();
      ctx.moveTo(x, y - 20);
      ctx.lineTo(x + 20, y);
      ctx.lineTo(x, y + 20);
      ctx.lineTo(x - 20, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  return finalize(canvas);
}

// 淡い花柄風の壁紙（ダマスク風の簡易版）
export function makePatternWallpaperTexture(baseHex = '#e8d9e8', motifHex = '#b89ab8') {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = motifHex;
  ctx.globalAlpha = 0.55;
  const drawMotif = (cx, cy) => {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const r = 18 + Math.sin(a * 4) * 4;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = baseHex;
    ctx.fill();
    ctx.fillStyle = motifHex;
  };

  const step = 64;
  for (let y = 0; y <= H; y += step) {
    const offset = (y / step) % 2 === 0 ? 0 : step / 2;
    for (let x = -step; x <= W; x += step) {
      drawMotif(x + offset, y);
    }
  }
  ctx.globalAlpha = 1;
  return finalize(canvas);
}

// 360°空テクスチャ (equirectangular)。
// PC は 2048×1024 / モバイルは 1024×512 で VRAM とフィルレートを節約。
// - 地平線(=窓越しの水平視線が当たる帯)を中間の青にして白っぽさを排除
// チャンピオンベルトの中央プレート用テクスチャ
// 金色グラデ + 黒縁 + 中央赤楕円 + 大きな"W" + 上下に "★ CHAMPION ★" / "WORLD"
export function makeWrestlingBeltPlateTexture() {
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 金グラデ背景(放射状)
  const grad = ctx.createRadialGradient(W / 2, H / 2, 8, W / 2, H / 2, W / 2);
  grad.addColorStop(0, '#fbe488');
  grad.addColorStop(0.55, '#d4a838');
  grad.addColorStop(1, '#7a5418');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 外周ダーク縁
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  // 内側の金縁
  ctx.strokeStyle = '#fbe488';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  // 中央の赤い楕円(センターパネル)
  ctx.fillStyle = '#c81e2e';
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, W * 0.30, H * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbe488';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 大きな"W"
  ctx.fillStyle = '#fbe488';
  ctx.font = 'bold 110px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', W / 2, H / 2 + 4);

  // 上の "★ CHAMPION ★"
  ctx.fillStyle = '#3a2410';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('★ CHAMPION ★', W / 2, 32);

  // 下の "WORLD"
  ctx.fillStyle = '#3a2410';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('WORLD', W / 2, H - 28);

  // 左右の星(大)
  ctx.fillStyle = '#fbe488';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('★', 36, H / 2 + 2);
  ctx.fillText('★', W - 36, H / 2 + 2);

  return finalize(canvas, { anisotropy: 8 });
}

// サイン入り写真用テクスチャ
// 紙背景 + リング3本ロープ + 万歳ポーズの黒シルエット + "To 社長へ" + 赤いサイン
export function makeWrestlingPhotoTexture() {
  const W = 256, H = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 紙背景(クリームがかった白)
  ctx.fillStyle = '#f7f1e3';
  ctx.fillRect(0, 0, W, H);

  // 紙の質感(うっすら斑点)
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(180,160,130,${0.04 + Math.random() * 0.04})`;
    const r = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 背景のリングロープ(3本、黄色)
  const ringTopY = 120;
  for (let i = 0; i < 3; i++) {
    const y = ringTopY + i * 32;
    ctx.fillStyle = '#e0b830';
    ctx.fillRect(18, y, W - 36, 7);
    ctx.fillStyle = '#9a7820';
    ctx.fillRect(18, y + 7, W - 36, 2);
  }
  // リングコーナーポスト(両端の縦支柱)
  ctx.fillStyle = '#7a4838';
  ctx.fillRect(16, 110, 10, 110);
  ctx.fillRect(W - 26, 110, 10, 110);
  // ポストキャップ(赤)
  ctx.fillStyle = '#c81e2e';
  ctx.fillRect(13, 108, 16, 8);
  ctx.fillRect(W - 29, 108, 16, 8);

  // レスラーのシルエット(中央、両腕万歳のガッツポーズ)
  ctx.fillStyle = '#0a0a0a';
  // 頭
  ctx.beginPath();
  ctx.arc(W / 2, 105, 24, 0, Math.PI * 2);
  ctx.fill();
  // 首
  ctx.fillRect(W / 2 - 8, 125, 16, 12);
  // 胴体(逆三角形に近い: 肩広め)
  ctx.beginPath();
  ctx.moveTo(W / 2 - 38, 138);
  ctx.lineTo(W / 2 + 38, 138);
  ctx.lineTo(W / 2 + 30, 215);
  ctx.lineTo(W / 2 - 30, 215);
  ctx.closePath();
  ctx.fill();
  // 両腕(上方向にV字に上げる)
  // 左腕
  ctx.save();
  ctx.translate(W / 2 - 36, 142);
  ctx.rotate(-0.85);
  ctx.fillRect(-12, -65, 18, 70);
  // 拳
  ctx.beginPath();
  ctx.arc(-3, -65, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 右腕
  ctx.save();
  ctx.translate(W / 2 + 36, 142);
  ctx.rotate(0.85);
  ctx.fillRect(-6, -65, 18, 70);
  ctx.beginPath();
  ctx.arc(3, -65, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 脚2本
  ctx.fillRect(W / 2 - 28, 215, 20, 60);
  ctx.fillRect(W / 2 + 8, 215, 20, 60);
  // ブーツ(黒のさらに濃い帯)
  ctx.fillStyle = '#000000';
  ctx.fillRect(W / 2 - 30, 268, 24, 12);
  ctx.fillRect(W / 2 + 6, 268, 24, 12);

  // 上部の宛名 "To 社長へ"
  ctx.fillStyle = '#3a2818';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('To 社長へ', 18, 18);

  // 右上に小さく "Thanks!"
  ctx.font = 'italic bold 15px serif';
  ctx.textAlign = 'right';
  ctx.fillText('Thanks!', W - 18, 22);

  // 赤いサイン(右下、曲線で殴り書き風)
  ctx.strokeStyle = '#d02030';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(W - 145, H - 55);
  ctx.bezierCurveTo(W - 110, H - 95, W - 80, H - 30, W - 50, H - 70);
  ctx.bezierCurveTo(W - 35, H - 88, W - 60, H - 45, W - 28, H - 32);
  ctx.stroke();
  // 下線スクリブル
  ctx.beginPath();
  ctx.moveTo(W - 145, H - 22);
  ctx.lineTo(W - 28, H - 22);
  ctx.stroke();
  // 赤い星
  ctx.fillStyle = '#d02030';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', W - 38, H - 90);

  return finalize(canvas, { anisotropy: 8 });
}

export function makeSkyTexture(opts = {}) {
  const lowRes = opts.lowRes === true;
  const W = lowRes ? 1024 : 2048;
  const H = lowRes ? 512 : 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 縦方向の青グラデーション。地平線を「淡い青」ではなく「中間の鮮青」にして空感を保つ。
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.00, '#1f5cb8');   // 天頂(deep)
  grad.addColorStop(0.30, '#3d80cf');
  grad.addColorStop(0.50, '#6ba5dd');   // 地平線 (中間の鮮青、白っぽくしない)
  grad.addColorStop(0.70, '#3d80cf');
  grad.addColorStop(1.00, '#1f5cb8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const drawSoftBlob = (cx, cy, radius, alpha) => {
    const r = Math.max(2, radius);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.55})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  // 横長のフワフワ雲: 8〜12 個のブロブを横に広げて重ねる
  // 雲のブロブ配置を事前計算 → 同じ雲をシームの反対側にも描いて継ぎ目をなくす
  const drawCloud = (cx, cy, scale, alpha) => {
    const n = 8 + Math.floor(Math.random() * 5);
    const blobs = [];
    for (let j = 0; j < n; j++) {
      blobs.push({
        ox: (Math.random() - 0.5) * scale * 2.2,
        oy: (Math.random() - 0.5) * scale * 0.5,
        r: scale * (0.55 + Math.random() * 0.55),
      });
    }
    const renderAt = (centerX) => {
      for (const b of blobs) drawSoftBlob(centerX + b.ox, cy + b.oy, b.r, alpha);
      drawSoftBlob(centerX, cy, scale * 0.8, Math.min(1, alpha + 0.1));
    };
    renderAt(cx);
    // canvas の左右はシームでつながるので、端付近の雲は反対側にも描く
    const margin = scale * 2.5;
    if (cx < margin) renderAt(cx + W);
    if (cx > W - margin) renderAt(cx - W);
  };

  // 雲は控えめ(青空 8割 / 雲 2割)。
  // 地平線帯は窓越しの水平視線にあたるので、雲を絞って青空が見えるようにする。
  // 横方向は約2048px → 大きな雲 8 個でスカスカに散らす。
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    const y = H * (0.38 + Math.random() * 0.24);
    const s = 80 + Math.random() * 140;
    const a = 0.55 + Math.random() * 0.25;
    drawCloud(x, y, s, a);
  }
  // 上空にちらほら(極=y=0 を避けて y=8%〜30% に配置)
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    const y = H * (0.08 + Math.random() * 0.22);
    const s = 70 + Math.random() * 130;
    const a = 0.50 + Math.random() * 0.25;
    drawCloud(x, y, s, a);
  }
  // 下空にもちらほら(極=y=H を避けて y=70%〜92%)
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * W;
    const y = H * (0.70 + Math.random() * 0.22);
    const s = 70 + Math.random() * 130;
    const a = 0.45 + Math.random() * 0.25;
    drawCloud(x, y, s, a);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}
