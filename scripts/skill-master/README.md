# skill-master OCR / upload / import README

`skill_master` 登録用の画像から CSV 下書きを作り、必要なら Firebase Storage に画像をアップロードし、その CSV を Firestore に反映するまでの手順をまとめた資料です。

## 対象スクリプト

- `npm run skill-master:ocr`
- `npm run skill-master:annotate-regions`
- `npm run skill-master:upload-images`
- `npm run skill-master:import`

## 前提

### 1. 画像の配置

元画像は `scripts/skill-master/source-images` 配下に置きます。

```text
scripts/skill-master/source-images/
  sword-test/
    0ae2faec7e7c92ee.png
    0d325b63b1219853.jpeg
```

`--folder sword-test` を使う場合は、上のように `source-images` 直下のフォルダ名を指定します。

### 2. Storage upload 用の認証 JSON

Firebase Storage へアップロードする場合は、サービスアカウント JSON を次に置きます。

```text
secrets/recordmanagements-service-account.json
```

このパスは `.gitignore` 済みです。

## 生成される CSV のヘッダ

```csv
id,name,characterName,rarity,cost,equipmentType,sp,element,skillType,attackType,breakGauge,switchGauge,cooldown,skillName,effect,image
```

- `id`: OCR 結果とファイル名から生成した skill_master 用 ID
- `name`: カード表示名 (`【記死回生の一撃】キリト` など)
- `characterName`: キャラクター名 (`キリト` など)
- `rarity`: レアリティ
- `cost`: コスト
- `equipmentType`: 装備種別
- `sp`: 消費SP
- `element`: 自然属性 (`火` / `水` / `土` / `聖` / `闇` / `風` / `無`)
- `skillType`: スキル種別 (`通常` / `コネクト` / `チェイン` / `MOD` / `覚醒` / `アクセル` / `バースト` など)
- `attackType`: 攻撃属性 (`斬` / `突` / `打`)
- `breakGauge`: ブレイクゲージ増加量
- `switchGauge`: スイッチゲージ増加量
- `cooldown`: クールダウン
- `skillName`: 技名 (`スターバースト・ストリーム` など)
- `effect`: 効果内容
- `image`: ローカル画像パス、または Storage upload 後の URL

## 実行パターン

### 1. OCR だけ実行して下書き CSV を作る

```bash
npm run skill-master:ocr -- --folder sword-test
```

出力:

- `tmp/skill-master.ocr.sword-test.csv`
- `tmp/skill-master.ocr.sword-test.json`

このモードでは `image` 列は相対パスのままです。

### 2. OCR と同時に Storage upload まで行う

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/recordmanagements-service-account.json \
npm run skill-master:ocr -- --folder sword-test --upload-images
```

出力:

- `tmp/skill-master.ocr.sword-test.csv`
- `tmp/skill-master.ocr.sword-test.json`

このモードでは `image` 列が Firebase Storage の URL になります。

### 3. OCR 済み CSV をあとから Storage upload する

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/recordmanagements-service-account.json \
npm run skill-master:upload-images -- \
  --file ./tmp/skill-master.ocr.sword-test.csv \
  --image-base-dir ./scripts/skill-master/source-images \
  --output ./tmp/skill-master.ocr.sword-test.csv
```

`image` 列にローカル相対パスが入った CSV を URL 付き CSV に置き換えたい時の実行方法です。

### 4. Firestore 反映前に dry-run する

```bash
FIREBASE_AUTH_EMAIL=admin@example.com \
FIREBASE_AUTH_PASSWORD=secret \
npm run skill-master:import -- --file ./tmp/skill-master.ocr.sword-test.csv --dry-run
```

差分確認だけ行い、FireStore には書き込みません。

### 5. OCR の参照位置を画像に重ねて確認する

```bash
npm run skill-master:annotate-regions -- --folder sword-test
```

出力:

- `tmp/skill-master.ocr-regions.sword-test/*.annotated.png`
- `tmp/skill-master.ocr-regions.sword-test/annotations.json`

OCR がどこを見ているかを画像上で確認したい時に使います。

### 6. Firestore に反映する

```bash
FIREBASE_AUTH_EMAIL=admin@example.com \
FIREBASE_AUTH_PASSWORD=secret \
npm run skill-master:import -- --file ./tmp/skill-master.ocr.sword-test.csv
```

## 基本手順

1. 画像を `scripts/skill-master/source-images/<folder>` に置く
2. `npm run skill-master:ocr -- --folder <folder>` で下書き CSV を作る
3. URL 付き画像が必要なら `--upload-images` 付きで再実行する
4. `npm run skill-master:import -- --file ... --dry-run` で差分確認する
5. 問題なければ `npm run skill-master:import -- --file ...` で反映する

## よく使うコマンド

### sword-test を OCR 下書き化

```bash
npm run skill-master:ocr -- --folder sword-test
```

### sword-test を OCR + Storage upload

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/recordmanagements-service-account.json \
npm run skill-master:ocr -- --folder sword-test --upload-images
```

### 生成 CSV の先頭だけ確認

```bash
sed -n '1,6p' ./tmp/skill-master.ocr.sword-test.csv
```

### import の dry-run

```bash
FIREBASE_AUTH_EMAIL=admin@example.com \
FIREBASE_AUTH_PASSWORD=secret \
npm run skill-master:import -- --file ./tmp/skill-master.ocr.sword-test.csv --dry-run
```

### OCR 参照位置の注釈画像を出す

```bash
npm run skill-master:annotate-regions -- --folder sword-test
```

## 補足

- OCR 結果は下書きです。`skillName`、`rarity`、`cost`、`sp` などは目視確認してから import してください。
- `annotate-regions` は固定比率枠 (`TITLE-CROP` / `RARITY` / `ATTR`) と、OCR から選んだ動的枠 (`NAME` / `SKILL-*` / `SP-*` / `COOLDOWN-*` など) をまとめて可視化します。
- `--folder <name>` は `scripts/skill-master/source-images/<name>` を自動解決します。
- `--upload-images` は内部的に一時 CSV を作ってから `upload-images.mjs` を実行します。
- upload に失敗した場合、古い出力 CSV が残って誤認されないよう既存出力は先に削除されます。
- Storage 上の保存先は `skill_master_images/{prefix}/{skillId}/source.{ext}` です。
