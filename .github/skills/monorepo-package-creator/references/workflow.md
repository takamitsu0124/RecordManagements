# Monorepo Package Creator - 完全なワークフロー

## ステップ1: パッケージ基本情報の取得

### 1-1. パッケージ名を取得
ユーザーに尋ねる（既に提示されていれば利用）：
```
「作成するパッケージ名を入力してください」
例: hogeservice, mylib, mycomponents

パッケージは @ism/ スコープで作成されます。
```

### 1-2. Vite インストールするか質問
```
「Vite + Vue3 を使ったプロジェクトですか？」
- Yes: ステップ2へ（Vite/Vue3 構造）
- No: ステップ3へ（シンプル構造）
```

---

## ステップ2: Vite=Yes の場合

### 2-1. ディレクトリ構造を提示

**VITE_STRUCTURE.md を参照** し、以下を提示：
```
packages/パッケージ名/
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── assets/
│   ├── components/
│   ├── pages/
│   └── ...
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
├── .gitignore
├── .prettierrc.json
└── ... (その他設定ファイル)
```

**TEMPLATES.md** から該当テンプレートを表示。

### 2-2. PrimeVue インストール確認

```
「PrimeVue (Vue3 UI コンポーネントライブラリ) をインストールしますか？」
- Yes: ステップ2-3へ
- No: ステップ4へ
```

### 2-3. PrimeVue セットアップ詳細 (PrimeVue=Yes の場合)

**PRIMEVUE_SETUP.md を参照** し、以下を提示：

1. **package.json への依存関係追加内容**
2. **src/main.ts への PrimeVue セットアップコード**
3. **src/assets/theme.scss (カスタマイズファイル)**
4. **App.vue への import**
5. **src/pages/Home.vue (サンプルコンポーネント)**
6. **router/index.ts への Home ルート**

その後、ステップ4へ進む。

---

## ステップ3: Vite=No の場合

### 3-1. シンプル構造を提示

**SIMPLE_STRUCTURE.md を参照** し、以下を提示：
```
packages/パッケージ名/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
├── README.md
├── .gitignore
└── ... (その他基本ファイル)
```

**TEMPLATES.md** から該当テンプレートを表示。

### 3-2. 処理終了

✓ スキル処理終了。ユーザーがファイル作成を実施。

---

## ステップ4: Firebase targets 取得 (Vite=Yes の場合)

```
「Firebase Hosting の target サイト名を入力してください」
注意: Firebase Console で既に作成済みのホスティング対象を入力してください。
例: hoge-site-test, hoge-site, example-site-test, example-site

複数個入力できます（通常はテスト用・本番用で2つ）
```

### 4-1. 最初のサイト名を取得

ユーザーからサイト名を受け取る。

### 4-2. 追加のサイト名確認

```
「追加のサイト名はありますか？」
- Yes: ステップ4-1 に戻る（サイト名を繰り返し入力）
- No: ステップ4-3へ進む
```

### 4-3. テスト環境の Firebase projectId を確認

```
「merge 時（テスト環境）のデプロイ先 Firebase projectId を入力してください」
例: my-project-test, staging-project など
```

また、そのプロジェクトに対応する GitHub Secrets のサービスアカウントキー名も確認する：

```
「テスト環境用 firebaseServiceAccount のシークレット名を入力してください」
例: FIREBASE_SERVICE_ACCOUNT_MY_PROJECT_TEST
（GitHub リポジトリの Settings > Secrets and variables > Actions で確認）
```

**結果**: 1〜複数個のサイト名リスト + テスト用 projectId + シークレット名

---

## ステップ5: npm スクリプト情報の取得 (Vite=Yes の場合)

### 5-1. dev コマンド内容を提示

**TEMPLATES.md** を参照して、以下のパターンを提示：

**サイト1つの場合:**
```
"dev:パッケージ名": "npm run dev -w @ism/パッケージ名"
```

**サイト2つ以上の場合:**

まず以下を質問する：
```
「dev:test スクリプトで使う cross-env Type の値を入力してください」
例: famitest, test, staging など
```
```
「dev:prod スクリプトで使う cross-env Type の値を入力してください」
例: famiprod, prod など
```

```
"dev:test:パッケージ名": "cross-env Type=<テスト用入力値> npm run dev -w @ism/パッケージ名"
"dev:prod:パッケージ名": "cross-env Type=<本番用入力値> npm run dev -w @ism/パッケージ名"
```

### 5-2. deploy コマンド用の Firebase project を確認

ステップ4-3 で取得したテスト用 projectId を使い、deploy コマンドを生成する。
**prod 用の deploy スクリプトは作成しない**（本番デプロイは release.yml で行う）。

deploy スクリプトには dev:test で使ったのと同じ `Type` 値を使う（改めて質問不要）。

### 5-3. deploy コマンド内容を提示

```
"deploy:パッケージ名:test": "cross-env Type=<テスト用入力値> npm run build -w @ism/パッケージ名 && firebase deploy --only hosting:<テスト用サイト名> --project <テスト用projectId>"
```

> **注意**: `firebase use` ではなく `--project` フラグを使うこと。
> prod 用スクリプト（deploy:パッケージ名:prod）は**追加しない**。

---

## ステップ6: firebase.json 更新 (Vite=Yes の場合)

### 6-1. 既存 firebase.json を参考

**TEMPLATES.md** を参照して、既存の hosting エントリをベースに新しい target を提示。

```json
{
  "hosting": [
    {
      "target": "パッケージ名-サイト1",
      "public": "packages/パッケージ名/dist",
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "パッケージ名-サイト2",
      "public": "packages/パッケージ名/dist",
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

提示の際、既存 firebase.json に「どこに」「何を」追加するのかを明確に指示。

### 6-2. .firebaserc 更新

`.firebaserc` に以下のターゲット定義も追加する必要があります。

テスト用projectId とサイト名を質問済みなので、以下形式で提示：

```json
"<テスト用projectId>": {
  "hosting": {
    "<テスト用サイト1>": [
      "<テスト用サイト1>"
    ],
    "<テスト用サイト2>": [
      "<テスト用サイト2>"
    ]
  }
},
"<本番用projectId>": {
  "hosting": {
    "<本番用サイト1>": [
      "<本番用サイト1>"
    ],
    "<本番用サイト2>": [
      "<本番用サイト2>"
    ]
  }
}
```

既存の `.firebaserc` 内の該当 `targets` セクションに、上記エントリを追加 or マージするよう指示。

---

## ステップ7: ISSUE_TEMPLATE 追加 (オプション)

```
「ISSUE_TEMPLATE に新しいテンプレートを追加しますか？」
- Yes: ステップ7-1へ
- No: ステップ8へ
```

### 7-1. Issue テンプレートファイル作成指示

**ISSUE_TEMPLATES.md** を参照して、以下4ファイルのテンプレート内容を提示：

```
.github/ISSUE_TEMPLATE/
├── -パッケージ名---bug-.md
├── -パッケージ名---new-.md
├── -パッケージ名---question-.md
└── -パッケージ名---uifix-.md
```

各テンプレートは、既存ファイルをベースにしてパッケージ名だけ置き換えたものを提示。

---

## ステップ8: ワークフロー統合 (オプション)

```
「GitHub Actions ワークフロー (merge.yml, pull-request.yml, release.yml) に統合しますか？」
- Yes: ステップ8-1へ
- No: スキル処理終了 ✓
```

### 8-1. デプロイ先 projectId の確認

ワークフロー統合前に、以下を確認する：

```
「merge 時（テスト環境）の Firebase projectId を入力してください」
例: my-project-test

「テスト環境用 firebaseServiceAccount のシークレット名を入力してください」
例: FIREBASE_SERVICE_ACCOUNT_MY_PROJECT_TEST
```

```
「release 時（本番環境）の Firebase projectId を入力してください」
例: my-project-prod

「本番環境用 firebaseServiceAccount のシークレット名を入力してください」
例: FIREBASE_SERVICE_ACCOUNT_MY_PROJECT_PROD
```

### 8-2. ワークフロー統合内容を提示

**WORKFLOWS_PATTERNS.md** を参照。

以下3つのファイルに対して、**「どこに」「何を」追加するのか**を明確に提示：

1. **merge.yml** - ビルド + Firebase deploy ステップ（テスト用 projectId を使用）
2. **pull-request.yml** - ビルドジョブ追加
3. **release.yml** - ビルド + Firebase deploy ステップ（本番用 projectId を使用）

各ファイルについて、既存パターンを見つけて統合ポイントを提示。

---

## エラー対応

### 既存パッケージが存在する場合
```
⚠️ 警告: packages/パッケージ名/ は既に存在します。
上書きしますか？
- Yes: 続行
- No: キャンセル
```

### firebase.json が見つからない場合
```
⚠️ 警告: firebase.json が見つかりません。
Firebase targets の設定をスキップします。
手動で firebase.json を作成後、該当内容を追加してください。
```

### deploy コマンドパターンが見つからない場合
```
⚠️ 注意: 既存の deploy コマンドパターンが見つかりません。
ターゲット名を直接入力してください。
例: test, prod, custom-target
```

---

## スキル処理の完了

最終出力：

```
✅ ディレクトリ構造・ファイル一覧
✅ 実装チェックリスト
   - [ ] ディレクトリ作成
   - [ ] package.json 作成
   - [ ] 各設定ファイル作成
   - [ ] (PrimeVue有) main.ts セットアップ
   - [ ] (Vite有) firebase.json に target 追加
   - [ ] (Vite有) ルート package.json に dev/deploy コマンド追加
   - [ ] (ISSUE_TEMPLATE有) テンプレートファイル作成
   - [ ] (ワークフロー有) ワークフローファイルに統合コード追加
   - [ ] npm install 実行
   - [ ] git add/commit/push
✅ 次のステップ（開発開始）
```
