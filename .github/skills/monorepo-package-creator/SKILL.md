---
name: monorepo-package-creator
description: Interactive guide for creating new packages in a Vite/Vue3/Capacitor/Firebase monorepo. Handles package name, scope, Vite configuration, PrimeVue integration, Firebase targets, npm scripts, GitHub workflows, and issue templates. Use when you need to scaffold a new package with complete configuration and boilerplate structure.

---

# Monorepo Package Creator

このスキルは、モノレポ内に新しいパッケージ（ディレクトリ）を作成する際のガイドを提供します。対話的に設定を決定し、作成すべきファイル・ディレクトリ・コマンド・ワークフロー統合を詳細に指示します。

## ワークフロー概要

スキルは以下のステップで進行します：

1. **パッケージ基本情報取得** - パッケージ名、スコープ、Vite有無を確認
2. **ディレクトリ構造提示** - Vite有無で分岐（シンプル構造 vs Vite/Vue3 構造）
3. **PrimeVue確認** (Vite=Yesの場合) - インストール有無と詳細セットアップ
4. **Firebase targets取得** (Vite=Yesの場合) - ホスティング用サイト名を確認
5. **npm スクリプト提示** (Vite=Yesの場合) - dev/deploy コマンド内容を提示
6. **firebase.json更新** (Vite=Yesの場合) - target エントリ追加内容を提示
7. **ISSUE_TEMPLATE追加** (オプション) - バグ・新機能・質問・UI修正テンプレート
8. **ワークフロー統合** (オプション) - merge.yml, pull-request.yml, release.yml への追加内容

詳細な実行フロー、テンプレート、ワークフロー統合パターンは [WORKFLOW.md](references/workflow.md) を参照してください。

## クイックスタート

ユーザーは以下のように投げることができます：

```
新しいパッケージ "hogeservice" を作成してください。
- パッケージ名: hogeservice
- スコープ: @ism/
- Vite使用: はい
- PrimeVue使用: はい
- Firebaseサイト名: hoge-site-test, hoge-site
- ISSUE_TEMPLATE: はい
- ワークフロー統合: はい
```

または最小限：

```
新しいパッケージ "mylib" を作成してください。
```

## リファレンスドキュメント

このスキルは以下のリファレンスファイルで詳細情報を提供します：

- **[WORKFLOW.md](references/workflow.md)** - 完全なステップバイステップワークフロー、条件判定ロジック
- **[TEMPLATES.md](references/templates.md)** - package.json, README.md, tsconfig.json, vite.config.ts, main.ts など
- **[PRIMEVUE_SETUP.md](references/primevue_setup.md)** - 依存関係、セットアップコード、サンプルコンポーネント
- **[VITE_STRUCTURE.md](references/vite_structure.md)** - Vite/Vue3 構造、ファイルレイアウト
- **[WORKFLOWS_PATTERNS.md](references/workflows_patterns.md)** - GitHub Actions ワークフロー統合パターン
- **[ISSUE_TEMPLATES.md](references/issue_templates.md)** - Issue テンプレート命名、内容サンプル
- **[SIMPLE_STRUCTURE.md](references/simple_structure.md)** - Vite 不使用時の構造（packages/types を参考）

## 実装時の重要ポイント

### スキルは指示文を提供
スキルが自動的にファイルやディレクトリを作成してはいけません。代わりに、**ユーザーが実装すべき内容**（ファイル構造、コマンド、テンプレート内容）を明確に提示します。

### テンプレート参照
提示する内容は既存パッケージを参考にして生成します：
- **シンプル構造の例**: packages/types/
- **Vite/Vue3 構造の例**: packages/benefit/
- **既存 Issue テンプレート**: .github/ISSUE_TEMPLATE/
- **既存ワークフロー**: .github/workflows/

### ユーザー入力の最小化
- デフォルト値を用意（@ism/, PrimeVue不要など）
- 選択肢から選ばせる（deploy ターゲットなど）
- Firebase サイト名は **手動入力**（既存 Firebase Console で作成済みのもの）
- 既存 deploy コマンド パターンを抽出して提案

### エラー対応
- **既存パッケージ警告** - 同名パッケージが存在する場合
- **firebase.json 見つからない** - Vite=Yes でも firebase.json がない場合
- **deploy コマンドなし** - 既存リポジトリにコマンドがない場合

## 使用例

### 例1: Vite + PrimeVue + 複数 Firebase サイト

```
ユーザー入力:
"hogeservice" を作成。Vite/PrimeVue、Firebase targets: hoge-site-test, hoge-site

スキル出力:
✅ ディレクトリ構造（src/, public/, vite.config.ts など）
✅ package.json テンプレート
✅ PrimeVue 依存関係と main.ts セットアップ
✅ dev:test:hogeservice, dev:prod:hogeservice, deploy:hogeservice:test, deploy:hogeservice:prod コマンド
✅ firebase.json target 追加内容
✅ ISSUE_TEMPLATE × 4 ファイル（bug, new, question, uifix）
✅ ワークフロー統合（merge.yml, pull-request.yml, release.yml）
```

### 例2: シンプル構造（Vite なし）

```
ユーザー入力:
"mylib" を作成。Vite 不使用。

スキル出力:
✅ シンプルなディレクトリ構造（src/, package.json, tsconfig.json, README.md）
✅ package.json テンプレート（@ism/mylib）
✅ それで完了
```

