# RecordManagements

## skill_master import flow

`skill_master` の**正本は Firestore**です。  
ローカルの `.json` / `.csv` は、Firestore の `skill_master` に投入・更新するための**一時インポートソース**としてだけ使います。

```bash
npm run skill-master:import -- --file ./path/to/skill-master.json --validate-only
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json --dry-run
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json
```

### Input format

- Required keys: `id`, `name`, `attr`, `type`, `cool`, `swGauge`, `brGauge`, `image`
- Supported file types: `.json`, `.csv`
- JSON can be either an array or `{ "skills": [...] }`
- Re-import is **id-based upsert**

### Firestore schema

```ts
type SkillMaster = {
  id: string
  name: string
  attr: string
  type: string
  cool: string
  swGauge: string
  brGauge: string
  image: string
}
```

### Normalization rules

- `attr` is normalized to: `火`, `水`, `土`, `聖`, `闇`, `風`, `無`
- `type` is normalized to the detailed Firestore categories used for search and ownership registration
- Weapon skills support:
  - `片手直剣`, `細剣`, `棍棒`, `短剣`, `斧`, `槍`, `弓`, `盾`
  - plus each variant: `(覚醒)`, `(アクセル)`, `(MOD)`, `(コネクト)`, `(チェイン)`, `(リンク)`
- Ability skills support:
  - `アビリティ`
  - plus variants: `(覚醒)`, `(アクセル)`, `(チェイン)`, `(リンク)`
- Existing coarse categories such as `バースト/フルバースト`, `フリー` are still accepted for compatibility
- Synonyms like `fire`, `dark`, `sword_link`, `ability:chain` are converted automatically

### Safe update policy

- Default behavior is **insert / update only**
- Existing `skill_master` documents are **not deleted** unless `--prune-missing` is specified
- `--prune-missing` aborts if any missing skill ID is still referenced by `user_skills`

## legacy schema migration flow

Issue #51 に対応するため、旧 `user` / `guild` / `skillRecord` / `proficiencyLevel` から、新しい `users` / `user_skills` 運用へ安全に移す CLI を追加しています。

```bash
npm run schema-migration:migrate -- --validate-only --mapping-file ./secure/migration-map.json
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run schema-migration:migrate -- --dry-run --mapping-file ./secure/migration-map.json --user-ids uid1,uid2
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run schema-migration:migrate -- --apply --mapping-file ./secure/migration-map.json
```

- 実行ファイル: `scripts/schema-migration/migrate.mjs`
- マッピング雛形: `scripts/schema-migration/mapping.example.json`
- **実データを含む mapping JSON は repo に commit しない**でください

### 旧 -> 新スキーマ対応表

| Legacy source | New destination | Rule |
| --- | --- | --- |
| `user/{uid}.charaName` | `users/{uid}.displayName` | 既存 `users.displayName` を優先し、空なら legacy から補完 |
| `user/{uid}.contact.email` | `users/{uid}.email` | 既存 `users.email` を優先し、空なら legacy から補完 |
| `user/{uid}.guildId` | `users/{uid}.guildId` | 既存 `users.guildId` を優先し、空なら legacy から補完。`guild` に存在しない ID は blocking error |
| `user/{uid}.role` | `users/{uid}.role` | `管理者 -> admin`、それ以外は `member`。`guild_admin` は legacy から自動判定できないため `roleOverrides` で明示 |
| `user/{uid}.skillRecord.*` | `user_skills/{uid}.ownedSkills[]` | 画像だけでは `skillId` を安全に推測できないため、mapping JSON で bucket ごとに `skill_master` ID を指定 |
| `user/{uid}.proficiencyLevel.*` | `user_skills/{uid}.ownedSkills[].level` | `level` 明示値を優先。未指定時は `levelSource`、さらに未指定時は bucket と同名の熟練度を使用。該当なしは `0` |
| `user/{uid}.imageUrls` / `skillRecord` 内画像参照 | 旧 `user` を継続利用 | 現行 app はプロフィール/画像で legacy `user` も参照しているため、**並行運用中は削除しない** |
| `guild/{guildId}` | 既存 `guild` を継続利用 | 今回の migration では delete / rewrite しない。`users.guildId` の整合確認だけ行う |

### ownedSkills 変換ルール

`skillRecord` は旧画面では**画像バケット**であり、`skill_master.id` を直接保持していません。  
そのため migration CLI は、**推測で `ownedSkills` を作りません**。

代わりに、operator が secure な mapping JSON を用意して bucket ごとに移行対象スキルを明示します。

```json
{
  "roleOverrides": {
    "sample-guild-admin-uid": "guild_admin"
  },
  "users": {
    "sample-user-uid": {
      "bucketMappings": {
        "sword": [
          "skill-fire-sword-001",
          { "skillId": "skill-fire-sword-link-002", "levelSource": "sword" }
        ],
        "weaponConnect": [
          { "skillId": "skill-dark-sword-connect-003", "levelSource": "sword" }
        ],
        "ability": [
          { "skillId": "skill-light-ability-001", "level": 0 }
        ]
      }
    }
  }
}
```

CLI の挙動:

- legacy `skillRecord` に画像がある bucket は、`user_skills` 未作成ユーザーに対して **mapping 必須**
- bucket を書いただけの空配列 (`"sword": []`) は不可
- `user_skills` が既に存在するユーザーは、新側を優先し、mapping がない bucket は warning 扱い
- mapping 内の `skillId` は `skill_master` に存在しないと apply できない
- 既存 `user_skills` にある `skillId` は上書きせず、migration は**不足分だけ backfill**
- Firestore への書き込みは `--apply` を付けたときだけ実行される

### 運用手順

1. **バックアップ**
   - Firestore の managed export を先に取得する
   - 例: `gcloud firestore export gs://<backup-bucket>/recordmanagements/schema-migration-$(date +%Y%m%d-%H%M%S) --collection-ids=user,users,user_skills,guild,skill_master`
2. **mapping 作成**
   - `scripts/schema-migration/mapping.example.json` を元に secure な場所で実データ版を作る
   - `guild_admin` は `roleOverrides` で明示する
3. **試験移行**
   - `--validate-only` で JSON 形式確認
   - `--dry-run --user-ids uid1,uid2` で少人数 diff を確認
4. **本移行**
   - dry-run の blocking issue を解消してから apply
5. **ロールバック**
   - 原則は managed export から restore
   - 今回の CLI は legacy `user` / `guild` を破壊しないため、新コレクション側だけを戻す判断もしやすい

### 並行運用ポリシー

- `users` は認証・ロール・ギルド所属の新しい参照先
- `user_skills` は所持スキルの新しい参照先
- `user` はプロフィール・画像参照の暫定参照先として残す
- `guild` は現行の所属管理ソースとして残す

### 旧画面依存を段階的に外す見通し

1. `users` / `user_skills` の migration を完了する
2. プロフィール・画像の保存先を legacy `user` から新 schema へ分離する
3. `packages/app/src/boot/main.ts` の login 時 legacy backfill を除去する
4. `RMUserWorkspace` の legacy `skillRecord` / 画像 fallback を除去する

## Google Calendar OAuth / secret management

Issue #52 に対応するため、Google Calendar 連携の前提を **SPA で秘密を持たない構成** に整理しています。  
実装の受け皿は `packages/app/src/config/googleCalendar.ts` と `packages/app/.env.example` にあります。

### 前提アーキテクチャ

- フロントエンドは **Google Identity Services token model** を使う
- ブラウザが直接 Calendar REST API を叩くときは **access token のみ** を扱う
- **client secret / refresh token / service account key は frontend に持ち込まない**
- shared guild calendar と personal calendar は role と token owner で境界を分ける

### Google Cloud 設定手順

1. Google Cloud で対象 project を作成または選択する
2. **Google Calendar API** を有効化する
3. OAuth consent screen を設定する
4. OAuth client を **Web application** で作成する
5. Authorized JavaScript origins に少なくとも以下を追加する
   - `http://localhost:8080`
   - 本番 app の origin（例: Firebase Hosting の app origin）
6. Authorized redirect URIs に少なくとも以下を追加する
   - `http://localhost:8080/google-calendar/oauth/callback`
   - `${PRODUCTION_ORIGIN}/google-calendar/oauth/callback`

補足:

- 現行方針は popup token flow なので、通常の予定閲覧・編集では redirect callback は主経路ではありません
- ただし #48 以降で redirect UX や code model に切り替えても破綻しないよう、callback URI は先に予約しておきます

### scope 方針

不要に広い権限は取らず、基本は次の 2 段階です。

| 用途 | Scope | 理由 |
| --- | --- | --- |
| 閲覧のみ | `https://www.googleapis.com/auth/calendar.events.readonly` | 予定閲覧だけに限定する |
| 編集時のみ追加 | `https://www.googleapis.com/auth/calendar.events` | 共有カレンダー・個人カレンダーの予定更新に必要な最小単位 |

避けるもの:

- `https://www.googleapis.com/auth/calendar`  
  カレンダー全体の共有・削除まで含み広すぎるため、#52 時点では採用しません
- ACL / settings / calendars 系 scope  
  カレンダー権限変更や設定変更が要件にないため採用しません

### 公開情報 / 秘密情報の分類

| 区分 | 例 | 置き場所 |
| --- | --- | --- |
| Public | OAuth Client ID, discovery doc URL, redirect path, feature flags | `packages/app/.env` 系から Quasar build env へ注入 |
| Protected (repo に固定しない) | guild shared calendar ID, role ごとの calendar routing 情報 | Firestore / Firebase Remote Config / backend response など、認証後に返す |
| Secret | OAuth Client Secret, refresh token, service account key, admin-only integration secrets | Firebase Secret Manager / GitHub Actions secrets / 運用環境の secret store |

### env 運用

追跡対象の雛形:

- `packages/app/.env.example`

Git へ commit しないファイル:

- `packages/app/.env`
- `packages/app/.env.local`
- `packages/app/.env.*.local`

利用する public env:

```bash
APP_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=
APP_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC=https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
APP_PUBLIC_GOOGLE_CALENDAR_REDIRECT_PATH=/google-calendar/oauth/callback
APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_GUILD_CALENDAR=true
APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_PERSONAL_CALENDAR=false
```

### token の保存・更新・失効

- access token は **メモリのみ** に保持する
- `localStorage` / `sessionStorage` / Firestore に refresh token を保存しない
- token 期限切れ時は GIS の `requestAccessToken()` で再取得する
- revoke は `google.accounts.oauth2.revoke` を使い、同時にアプリ内メモリも消去する

### guild 共有カレンダー / personal calendar の境界

| 対象 | 閲覧 | 編集 | 備考 |
| --- | --- | --- | --- |
| guild shared calendar | `member`, `guild_admin`, `admin` | `guild_admin`, `admin` のみ | 共有予定の作成・更新は運営権限者に限定 |
| personal calendar | token owner のみ | token owner のみ | 他メンバーの個人予定は扱わない |

このポリシーは `packages/app/src/config/googleCalendar.ts` に定数化しています。

### #48 に向けた実装前提

- 画面初回表示では readonly scope だけ要求する
- 編集操作に入るときだけ追加で edit scope を要求する
- guild shared calendar ID は frontend にハードコードせず、認証済み経路から取得する
- backend が必要になった場合だけ code model + Secret Manager へ拡張し、client secret は browser に渡さない

### #48 実装後の運用メモ

- イベントカレンダー画面は `/RMCalendar` です
- guild shared calendar は `guild.googleCalendarId` を参照します
- `guild.googleCalendarId` は `RMGuildEdit` 画面の **共有 Google Calendar ID** 入力から設定します
- personal calendar は `primary` を使います
- shared calendar を編集できるのは、Google 側でその calendar に対して編集権限を持つ `guild_admin` / `admin` です
