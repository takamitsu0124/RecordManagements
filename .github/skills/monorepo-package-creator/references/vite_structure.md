# Vite + Vue3 ディレクトリ構造

Vite/Vue3 を使用するパッケージのディレクトリ構成と各ファイルの役割について説明します。

---

## ディレクトリ構造全体

```
packages/パッケージ名/
├── src/
│   ├── main.ts                     # Vue アプリケーションエントリーポイント
│   ├── App.vue                     # ルートコンポーネント
│   ├── assets/                     # CSS/SCSS や画像ファイル
│   │   ├── ... スタイルシート
│   │   └── ... 画像ファイル
│   ├── components/                 # 再利用可能な Vue コンポーネント
│   │   ├── CategoryName/
│   │   │   ├── ComponentName.vue   # コンポーネント本体
│   │   │   └── ComponentName.ts    # ロジック分離（必要に応じて）
│   │   └── ... 他のコンポーネント
│   ├── css/                        # グローバルスタイル
│   │   ├── app.scss
│   │   └── ... 共通 CSS
│   ├── layouts/                    # レイアウトコンポーネント
│   │   ├── MainLayout.vue
│   │   └── ... 他のレイアウト
│   ├── pages/                      # ページレベルコンポーネント
│   │   ├── HomePage.vue
│   │   ├── AboutPage.vue
│   │   └── ... 他のページ
│   ├── router/                     # Vue Router 設定
│   │   └── index.ts                # ルート定義
│   ├── env.d.ts                    # TypeScript 環境型定義（オプション）
│   └── env.ts                      # 環境変数管理（オプション）
├── public/                         # 静的ファイル（ビルド時そのまま含まれる）
│   ├── favicon.ico
│   └── ... その他静的アセット
├── index.html                      # HTML テンプレート（アプリマウント対象）
├── vite.config.ts                  # Vite 設定ファイル
├── tsconfig.json                   # TypeScript 設定
├── package.json                    # パッケージマニフェスト
├── README.md                       # ドキュメント
├── .gitignore                      # Git 無視ファイル
└── README.md                       # ドキュメント

```

---

## ファイルの役割

### src/main.ts
- Vue アプリケーションのエントリーポイント
- Vue Router のセットアップ
- グローバルプラグイン・コンポーネント登録

### src/App.vue
- ルートコンポーネント
- RouterView で各ページを表示

### src/router/index.ts
- Vue Router の設定
- ルート定義

### src/pages/
- ページレベルの Vue コンポーネント
- 各ページ単位で1ファイル（HomePage.vue, AboutPage.vue など）

### src/layouts/
- ページレイアウトコンポーネント
- MainLayout.vue など、複数ページで共有するレイアウト

### src/components/
- 再利用可能な Vue コンポーネント
- 機能別にフォルダ分け推奨
- 複雑な場合は .vue と .ts に分割

### src/css/
- グローバルスタイル
- app.scss など

### src/assets/
- スタイルシート（SCSS）
- 画像、フォント等のメディアアセット

### src/env.d.ts（オプション）
- TypeScript 環境型定義

### src/env.ts（オプション）
- 環境変数管理

### public/
- `npm run build` 後、そのまま dist に含まれるファイル
- favicon.ico など

### index.html
- Vue アプリケーションのマウント対象（`<div id="app"></div>`）
- Vite により自動的にスクリプトタグが挿入される

### vite.config.ts
- Vite のビルド・開発サーバー設定
- パス エイリアス定義（@/ → src/）

### tsconfig.json
- TypeScript コンパイラ設定
- 厳密なモード有効、パス マッピング

---

## 実装例：基本的なコンポーネント構造

### src/components/ 内のコンポーネント構成

```
src/components/
├── BFServiceCard/
│   ├── BFServiceCard.vue
│   ├── BFServiceCard.ts (必要に応じて)
│   └── README.md (使用方法ドキュメント)
├── BFItemCardHolder/
│   └── BFItemCardHolder.vue
└── BFSus8Spinner/
    ├── BFSus8Spinner.vue
    └── BFSus8Spinner.ts
```

### シンプルなコンポーネント例 (BFServiceCard.vue)

```vue
<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()

const emit = defineEmits<{
  click: [id: string]
}>()
</script>

<template>
  <div class="bf-service-card" @click="emit('click', title)">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped lang="scss">
.bf-service-card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    color: #666;
  }
}
</style>
```

---

## ディレクトリ作成の具体例

```bash
# ディレクトリ作成
mkdir -p packages/パッケージ名/src/{assets,components,css,layouts,pages,router}
mkdir -p packages/パッケージ名/public

# ファイル作成
touch packages/パッケージ名/src/main.ts
touch packages/パッケージ名/src/App.vue
touch packages/パッケージ名/src/router/index.ts
touch packages/パッケージ名/src/pages/HomePage.vue
touch packages/パッケージ名/src/css/app.scss
touch packages/パッケージ名/index.html
touch packages/パッケージ名/vite.config.ts
touch packages/パッケージ名/tsconfig.json
touch packages/パッケージ名/package.json
touch packages/パッケージ名/README.md
touch packages/パッケージ名/.gitignore

# npm install
cd packages/パッケージ名 && npm install
```

---

## ファイルテンプレート

各ファイルのテンプレートは [TEMPLATES.md](templates.md) を参照してください.