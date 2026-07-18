# AGENTS.md

RecordManagements は npm workspaces + lerna (independent versioning) で管理するモノレポです。SAOIF（ソードアート・オンライン インテグラル・ファクター）のギルド運営支援 Web アプリ（Quasar/Vue3）と、それを支える Firebase バックエンドで構成されています。

## パッケージ構成 (packages/*)

| パッケージ | 役割 |
| --- | --- |
| `app` | 本番の Quasar/Vue3 SPA（メインアプリ） |
| `vite-project` | 実験用の Vite プロジェクト（本番外・検証用） |
| `db` (`@rm/db`) | Magnetar + Firestore のデータアクセス層 |
| `types` (`@rm/types`) | `app` / `functions` 間で共有する型定義 |
| `utils` (`@rm/utils`) | 共通ユーティリティ（日付フォーマット、バリデーション等） |
| `functions` (`@rm/functions`) | Firebase Cloud Functions |

`app` は `@rm/db` / `@rm/types` / `@rm/utils` に依存します。パッケージ間で型・ロジックを共有する場合は該当パッケージに追加し、`app` 側で重複実装しないでください。

## ビルド・Lint・型チェック

- `npm run lint -w app` — ESLint（`@typescript-eslint` + `eslint-plugin-vue`）
- `npm run dev -w app` — Quasar dev server（SPA mode）
- `npm run build -w app` — lint 実行後に Quasar build
- `npx vue-tsc --noEmit -p packages/app/tsconfig.json` — `app` の型チェック。編集直後は `get_errors` がキャッシュされた古い診断を返すことがあるため、型を変更したら必ずこのコマンドで再確認すること
- `npm run build -w @rm/functions` — `tsc` によるビルド
- プレーンな `.mjs` スクリプト（`scripts/**`）は `node --check <file>.mjs` で構文確認
- 自動テストはほぼ未整備（`app` / `db` の `test` スクリプトは no-op スタブ）。変更後はビルド・lint・型チェックで代替検証すること

## UI 構成

Quasar v2（メイン SPA フレームワーク。Dialog / Loading / Notify プラグインを使用）と PrimeVue v4（Aura テーマ）を併用しています。独自コンポーネントは `RM` プレフィックス（`RMButton`, `RMCard` など、`packages/app/src/components/`）で統一されています。新規コンポーネントもこの命名規約に従ってください。

## データモデル / Firestore

正本コレクション: `users`, `guilds`, `user_skills`, `skill_master`, `banner_master`, `guild_schedule_responses`, `guild_calendar_events`, `attendance_events`, `attendance_responses`。

レガシーコレクション（`user`, `guild` の一部フィールド、`skillRecord`, `proficiencyLevel`）は migration/backfill 用の参照元としてのみ残存しています。新規実装では正本コレクションのみを使用してください。移行ルールの詳細は [README.md](README.md) の `legacy schema migration flow` を参照。

`skill_master` の正本は Firestore で、ローカルの CSV/JSON は投入用の一時インポートソースにすぎません。インポート／画像アップロード手順は [README.md](README.md) と [scripts/skill-master/README.md](scripts/skill-master/README.md) を参照してください。

アクセス制御は `firestore.rules` / `storage.rules` にロールベース（`admin` / `guild_admin` / `member`）で実装されています。認可ロジックを変更する場合は必ずこれらのファイルも合わせて確認・更新してください。

## 注意点

- `secrets/`（サービスアカウント鍵）と `tmp/`（一時データ）は Git 管理外。コミットしないこと
- スクリプト実行に Firebase 認証情報が必要な場合が多い（`GOOGLE_APPLICATION_CREDENTIALS` や `FIREBASE_AUTH_EMAIL`/`FIREBASE_AUTH_PASSWORD`）。詳細は各スクリプトの README または実行コマンドのコメントを参照
- ESLint の `no-restricted-syntax` セレクタは Vue テンプレート AST（`VElement` 等）にはマッチしない。テンプレート内の独自 lint チェックは `scripts/check-img-lazy-loading.mjs` のような素の Node スクリプトで実装する
