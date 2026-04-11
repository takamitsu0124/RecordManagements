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
