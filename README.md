# RecordManagements

## skill_master import flow

`skill_master` の**正本は Firestore**です。  
ローカルの `.json` / `.csv` は、Firestore の `skill_master` に投入・更新するための**一時インポートソース**としてだけ使います。

```bash
npm run skill-master:import -- --file ./path/to/skill-master.json --validate-only
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json --dry-run
FIREBASE_AUTH_EMAIL=admin@example.com FIREBASE_AUTH_PASSWORD=secret npm run skill-master:import -- --file ./path/to/skill-master.json
```

### Bulk image upload flow

`skill_master` の画像を**一括で Storage に上げたい場合**は、先に `skill-master:upload-images` を使います。  
画像の元ファイルは repo 内の固定ディレクトリ必須ではありませんが、運用上は**武器種ごと**に次のように置くのを推奨します。

```text
scripts/skill-master/
  skill-master.csv
  source-images/
    sword/
      skill-fire-sword-link-001.png
    bow/
      skill-water-bow-002.webp
    ability/
      skill-light-ability-003.png
```

フラットに平置きでも動きます。

```text
scripts/skill-master/
  skill-master.csv
  source-images/
    skill-fire-sword-link-001.png
    skill-water-bow-002.webp
```

推奨フォルダ名は次の通りです。

| 種別 | 推奨フォルダ名 |
| --- | --- |
| 片手直剣 | `sword` |
| 細剣 | `rapier` |
| 棍棒 | `club` |
| 短剣 | `dagger` |
| 斧 | `axe` |
| 槍 | `spear` |
| 弓 | `bow` |
| 盾 | `shield` |
| アビリティ | `ability` |
| バースト/フルバースト | `burst-fullburst` |
| フリー | `free` |

`skill-master.csv` / `skill-master.json` の `image` 列には、Firebase Storage URL ではなく**ローカル画像への相対パス**または**ファイル名**を書きます。

```csv
id,name,attr,type,cool,swGauge,brGauge,image
skill-fire-sword-link-001,火剣リンク,火,片手直剣(リンク),10,20,30,sword/skill-fire-sword-link-001.png
skill-water-bow-002,水弓,水,弓,10,20,30,bow/skill-water-bow-002.webp
```

実行例:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
  npm run skill-master:upload-images -- \
  --file ./scripts/skill-master/skill-master.csv \
  --image-base-dir ./scripts/skill-master/source-images \
  --output ./scripts/skill-master/skill-master.storage.csv
```

ポイント:

- `--image-base-dir` を付けた場合、`image` 列の相対パスはそのディレクトリ基準で解決されます
- `--image-base-dir` を省略した場合、相対パスは入力 CSV / JSON ファイルが置かれているディレクトリ基準で解決されます
- 必要なら `sword/link/...` のように**武器フォルダ配下でさらに細かく分けても**動作します
- 実行後は `image` 列が Storage URL に置き換わった `.storage.csv` / `.storage.json` が出力されるので、その**出力ファイル**を `npm run skill-master:import` に渡してください
- Storage 上の保存先は `skill_master_images/{prefix}/{skillId}/source.{ext}` です
- 対応拡張子の判定は `.png` / `.jpg` / `.jpeg` / `.webp` / `.gif` / `.svg` / `.avif` / `.bmp` です

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

Issue #51 に対応するため、旧 `user` / `guild` / `skillRecord` / `proficiencyLevel` から、新しい `users` / `user_skills` 運用へ安全に移す CLI を追加しています。現在の app runtime は `users` / `user_skills` を正本として扱い、legacy `user` は migration/backfill 用の参照元としてだけ残しています。

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
| `user/{uid}.charaNameKana` | `users/{uid}.displayNameKana` | 既存 `users.displayNameKana` を優先し、空なら legacy から補完 |
| `user/{uid}.contact.email` | `users/{uid}.email` | 既存 `users.email` を優先し、空なら legacy から補完 |
| `user/{uid}.guildId` | `users/{uid}.guildId` | 既存 `users.guildId` を優先し、空なら legacy から補完。`guild` に存在しない ID は blocking error |
| `user/{uid}.role` | `users/{uid}.role` | `管理者 -> admin`、それ以外は `member`。`guild_admin` は legacy から自動判定できないため `roleOverrides` で明示 |
| `user/{uid}.affiliationDate` | `users/{uid}.affiliationDate` | 既存 `users.affiliationDate` を優先し、空なら legacy から補完 |
| `user/{uid}.affiliationNum` | `users/{uid}.affiliationNum` | 既存 `users.affiliationNum` を優先。未設定相当なら legacy から補完 |
| `user/{uid}.situation` | `users/{uid}.situation` | `現役 / 隠居 / 引退 / ''` のみ許可し、既存値を優先 |
| `user/{uid}.gameStartDateAt` | `users/{uid}.gameStartDateAt` | 既存 `users.gameStartDateAt` を優先し、空なら legacy から補完 |
| `user/{uid}.contact.phone` | `users/{uid}.phone` | 既存 `users.phone` を優先し、空なら legacy から補完 |
| `user/{uid}.birthDateAt` | `users/{uid}.birthDateAt` | 既存 `users.birthDateAt` を優先し、空なら legacy から補完 |
| `user/{uid}.imageUrls` / `skillRecord` 内画像参照 | `users/{uid}.imageUrls` | 既存 `users.imageUrls` を優先。空の場合だけ legacy `imageUrls`、さらに空なら `skillRecord` から平坦化して backfill |
| `user/{uid}.skillRecord.*` | `user_skills/{uid}.ownedSkills[]` | 画像だけでは `skillId` を安全に推測できないため、mapping JSON で bucket ごとに `skill_master` ID を指定 |
| `user/{uid}.proficiencyLevel.*` | `user_skills/{uid}.ownedSkills[].level` | `level` 明示値を優先。未指定時は `levelSource`、さらに未指定時は bucket と同名の熟練度を使用。該当なしは `0` |
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
- `users.imageUrls` が空で legacy に画像参照がある場合は、`users.imageUrls` に backfill する
- `users` のプロフィール項目 (`displayNameKana`, `affiliationDate`, `affiliationNum`, `situation`, `gameStartDateAt`, `phone`, `birthDateAt`) も legacy から backfill 対象
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

- `users` は認証後表示名・プロフィール・画像・ロール・ギルド所属の唯一の参照先
- `user_skills` は所持スキルの唯一の参照先
- `user` は app runtime からは参照せず、migration / backfill / operator 確認用の legacy ソースとしてだけ残す
- `guild` は現行の所属管理ソースとして残す

### 移行後の確認観点

1. `users/{uid}.displayName` / `guildId` / `role` がログイン後 UI と一致している
2. `users/{uid}.imageUrls` だけでマイページとギルド向け画像管理画面が成立する
3. `user_skills/{uid}.ownedSkills` だけで所持スキル表示/更新が成立する
4. `packages/app/src/boot/main.ts` に legacy `user` backfill が残っていない
5. `RMUserWorkspace` が legacy `skillRecord` / 画像 fallback を使っていない

## アプリ内イベントカレンダー

Issue #78 に対応するため、イベントカレンダーは **Google Calendar 依存を持たない Firestore 管理** へ切り替えています。  
表示レイヤーは `@fullcalendar/vue3` を維持し、予定データだけをアプリ内で完結する構成にしています。

### 前提アーキテクチャ

- カレンダー画面は `/RMCalendar`
- 予定データは Firestore の `guild_calendar_events` collection で管理
- 表示は FullCalendar、入力は既存フォーム部品と PrimeVue DatePicker ベースの `RMInput` を利用
- Google OAuth / Google Calendar API / shared calendar ID は使わない

### データモデル

`guild_calendar_events` の主な項目:

| 項目 | 型 | 用途 |
| --- | --- | --- |
| `id` | string | ドキュメント ID |
| `guildId` | string | 所属ギルド単位の参照・権限制御 |
| `title` | string | 予定タイトル |
| `description` | string | 補足メモ |
| `location` | string | 場所 |
| `startAt` | timestamp | 開始日時 |
| `endAt` | timestamp | 終了日時 |
| `allDay` | boolean | 終日予定かどうか |
| `createdAt` / `updatedAt` | timestamp | 監査用 |
| `createdBy` / `updatedBy` | string | 操作ユーザー |

補足:

- 終日予定は `endAt` を **終了日の翌日 00:00** で保存し、FullCalendar の end-exclusive 仕様に合わせる
- 表示時は終日予定の終了日を 1 日戻してフォームへ表示する

### 権限方針

| 対象 | 閲覧 | 編集 |
| --- | --- | --- |
| guild shared calendar | `member`, `guild_admin`, `admin` | `guild_admin`, `admin` のみ |

- 読み取りは `canReadGuildSchedule(guildId)` に準拠
- 作成 / 更新 / 削除は `canManageGuild(guildId)` に準拠

### env 運用

追跡対象の雛形:

- `packages/app/.env.example`

Git へ commit しないファイル:

- `packages/app/.env`
- `packages/app/.env.local`
- `packages/app/.env.*.local`

現時点では、**イベントカレンダーのために必須な public env はありません。**

### 実装 / 運用メモ

- ギルド所属ユーザーだけがイベントカレンダーを利用できます
- `member` は閲覧のみ、`guild_admin` / `admin` は予定の追加・更新・削除ができます
- `RMGuildEdit` 画面に Google Calendar ID の入力はありません
- Google 連携の再設定なしでローカル開発・本番利用ができます
