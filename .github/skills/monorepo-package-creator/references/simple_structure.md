# シンプル構造（Vite なし）

Vite を使用しない、シンプルな TypeScript パッケージの構造について説明します。

実装例は `packages/types/` の構成に基づいています。

---

## ディレクトリ構造

```
packages/パッケージ名/
├── src/
│   ├── index.ts                    # メインエントリーポイント（他モジュールをエクスポート）
│   ├── types/                      # 型定義ディレクトリ
│   │   ├── index.ts                # 型エクスポート
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   └── ... 他の型ファイル
│   ├── utils/                      # ユーティリティ関数
│   │   ├── index.ts
│   │   ├── helpers.ts
│   │   └── ... その他ユーティリティ
│   ├── services/                   # ビジネスロジック（必要に応じて）
│   │   ├── index.ts
│   │   └── ... 各サービスファイル
│   └── ... 他のモジュール
├── test/                           # テストファイル（オプション）
│   ├── unit/
│   │   └── ... ユニットテスト
│   └── integration/
│       └── ... 統合テスト
├── package.json                    # パッケージマニフェスト
├── tsconfig.json                   # TypeScript 設定
├── README.md                       # ドキュメント
├── .gitignore                      # Git 無視ファイル
└── ...（その他基本設定ファイル）
```

---

## ファイルの役割

### src/index.ts
- パッケージのメインエントリーポイント
- 他のモジュールをエクスポート
- 例：`export * from './types'`

### src/types/
- 型定義ファイル
- packages/types のように、複数の独立した型定義を含む
- 例：User.ts, Product.ts, Invoice.ts など

### src/utils/
- ユーティリティ関数やヘルパー関数
- 汎用的な処理を共通化
- 例：formatDate(), parseJSON() など

### src/services/
- ビジネスロジック（必要に応じて）
- API 呼び出しやデータ処理

### test/
- ユニットテストファイル（vitest など）

### package.json
- `"main": "./src/index.ts"` で src/index.ts をエントリーポイント指定

### tsconfig.json
- コンパイル設定
- `"declaration": true` で型定義ファイル（.d.ts）を生成

---

## ビルド・公開フロー

```
npm run build
  ↓
TypeScript コンパイル
  ↓
dist/ ディレクトリに .js と .d.ts が生成
  ↓
npm publish（またはモノレポ内で npm install -w @ism/package-name）
```

---

## 実装例：型定義ファイル

### src/types/User.ts

```typescript
export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'user' | 'guest'

export interface UserWithRole extends User {
  role: UserRole
}
```

### src/types/Product.ts

```typescript
export interface Product {
  id: string
  title: string
  price: number
  description?: string
  category: string
}

export interface ProductInventory extends Product {
  stock: number
  sku: string
}
```

### src/types/index.ts

```typescript
export * from './User'
export * from './Product'
// 他の型エクスポート
```

---

## 実装例：ユーティリティ関数

### src/utils/helpers.ts

```typescript
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

### src/utils/index.ts

```typescript
export * from './helpers'
// 他のユーティリティエクスポート
```

---

## 作成例

```bash
# ディレクトリ作成
mkdir -p packages/パッケージ名/src/{types,utils,services}
mkdir -p packages/パッケージ名/test/{unit,integration}

# ファイル作成
touch packages/パッケージ名/src/index.ts
touch packages/パッケージ名/src/types/index.ts
touch packages/パッケージ名/src/utils/index.ts
touch packages/パッケージ名/package.json
touch packages/パッケージ名/tsconfig.json
touch packages/パッケージ名/README.md
touch packages/パッケージ名/.gitignore

# npm install
cd packages/パッケージ名 && npm install
```

---

## ファイルテンプレート

各ファイルのテンプレートは [TEMPLATES.md](templates.md) のシンプル構造セクションを参照してください。
