# 3D 部屋の模様替えシミュレーター

ブラウザ上で部屋の形・家具・壁紙・ドア/窓を自由にレイアウトできる3Dアプリ。

## 特徴

- **3つの外形**: 長方形 / L字型 / コの字型（切り欠き幅・奥行き調整可）
- **複数部屋**: 内壁を自由配置して部屋を区切る
- **8種類の壁紙**: クリーム/ホワイト/グレー/ネイビー/セージ/ピンク/木目パネル/花柄
- **16種類の家具・構造物**: ベッド/デスク/椅子/ソファ/棚/テーブル/シンク台/冷蔵庫/観葉植物/TV/ラグ/ノートPC/モニター/ホワイトボード/本/ダクトレール照明/壁掛け棚/ドア/窓
- **保存/復元**: localStorage にレイアウトを保存
- **プリセット**: 「写真の部屋を再現」ボタンで山口さんのオフィス再現

## 起動方法

```bash
cd C:\Users\yamaguchi\room_simulator
npm install       # 初回のみ
npm run dev       # Chromeが自動で開く
```

## 操作方法

- **家具追加**: サイドバーの家具ボタンをクリック
- **家具選択**: 家具をクリック（黄色い枠が表示）
- **移動**: 赤/青の矢印ドラッグ（X/Z方向のみ）
- **回転**: `R` キー → 緑の円でY軸回転
- **拡大縮小**: `S` キー
- **削除**: `Delete` キー
- **選択解除**: `Esc` キー
- **カメラ**: マウスドラッグで回転、ホイールでズーム、右ドラッグでパン

## 構成

```
room_simulator/
├── index.html
├── vite.config.js
├── src/
│   ├── main.js        # エントリー（Scene/Camera/Renderer）
│   ├── room.js        # 多角形Room（L/U字対応）、壁紙、巾木
│   ├── furniture.js   # 家具プリセット群（16種類）、マテリアル工場
│   ├── selection.js   # クリック選択、TransformControls
│   ├── ui.js          # サイドバー配線、プリセット
│   ├── storage.js     # localStorage 保存/復元
│   └── textures.js    # CanvasTextureで木目/布地/壁紙生成
└── package.json
```

## 技術

- [Three.js](https://threejs.org/) r170
- [Vite](https://vitejs.dev/) 5.4
- ShapeGeometry による多角形床生成
- PlaneGeometry + Raycaster + TransformControls でインタラクション
