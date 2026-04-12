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
