# SAOIF image analysis README

SAOIF の画像解析向けに、Python から **Firebase Storage** と **Gemini** を使うための準備手順をまとめた資料です。

## 対象ファイル

- `scripts/saoif_image_analysis/firebase_setup.py`
- `scripts/saoif_image_analysis/requirements.txt`
- `scripts/saoif_image_analysis/bootstrap.py`
- `scripts/saoif_image_analysis/storage_uploader.py`
- `scripts/saoif_image_analysis/gemini_skill_csv.py`

## 前提

### 1. サービスアカウント JSON

サービスアカウントは次のパスに置きます。

```text
secrets/recordmanagements-service-account.json
```

`bootstrap.py` は、このパスを既定値として自動で読み込みます。  
別ファイルを使いたい場合だけ `--service-account` または `GOOGLE_APPLICATION_CREDENTIALS` で上書きします。

### 2. Gemini API キー

Gemini API キーは次のどちらかで渡します。

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`

## インストール

```bash
npm run saoif:image-analysis:setup
```

この setup は、`.venv` が存在しない場合は作成し、壊れている場合は自動で作り直します。  
依存関係や Python 実行環境に変更がなければ、毎回の再インストールは走りません。

ルート `package.json` には、`.venv` を自動修復しながら実行できる npm scripts も用意しています。

```bash
npm run saoif:image-analysis:setup
GOOGLE_APPLICATION_CREDENTIALS=./secrets/recordmanagements-service-account.json \
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:axe-pipeline

GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:gemini -- \
  --folder ./scripts/skill-master/source-images/rapier \
  --model gemini-2.5-flash-lite \
  --output ./tmp/saoif_skills.csv
```

インストール対象:

- `firebase-admin`
- `google-generativeai`
- `pandas`
- `Pillow`

## 初期化だけ確認する

```bash
GEMINI_API_KEY=your-gemini-api-key \
python3 scripts/saoif_image_analysis/bootstrap.py
```

成功すると、次の内容が表示されます。

- `requirements.txt` のインストールコマンド
- 読み込んだサービスアカウント JSON のパス
- 初期化された Firebase Storage バケット名
- Gemini API キー設定完了メッセージ

## オプション付き実行例

### サービスアカウント JSON を明示する

```bash
GEMINI_API_KEY=your-gemini-api-key \
python3 scripts/saoif_image_analysis/bootstrap.py \
  --service-account ./secrets/recordmanagements-service-account.json
```

### Storage バケット名を上書きする

```bash
GEMINI_API_KEY=your-gemini-api-key \
python3 scripts/saoif_image_analysis/bootstrap.py \
  --storage-bucket recordmanagements-756bf.appspot.com
```

### Gemini API キーを引数で渡す

```bash
python3 scripts/saoif_image_analysis/bootstrap.py \
  --gemini-api-key your-gemini-api-key
```

## Python から使う

`bootstrap.py` の `build_context()` を使うと、Firebase Storage と Gemini の初期化済みコンテキストをまとめて取得できます。

```python
from scripts.saoif_image_analysis.bootstrap import build_context

context = build_context()

bucket = context.storage_bucket
service_account_path = context.service_account_path
gemini_api_key = context.gemini_api_key
```

明示的に上書きしたい場合:

```python
from scripts.saoif_image_analysis.bootstrap import build_context

context = build_context(
    service_account_path="./secrets/recordmanagements-service-account.json",
    storage_bucket_name="recordmanagements-756bf.appspot.com",
    gemini_api_key="your-gemini-api-key",
)
```

## フォルダ内画像を Storage に一括アップロードする

`storage_uploader.py` の `upload_images_in_folder()` を使うと、指定フォルダ配下の画像を Firebase Storage にアップロードし、ファイル名とダウンロード URL をリスト形式で取得できます。

アップロード対象のローカルフォルダ名は、`ability` / `axe` / `bow` / `club` / `dagger` / `rapier` / `shield` / `spear` / `sword` / `test` だけ受け付けます。  
Storage 上の保存先は常に `skill-master/source-images/<folder>/...` です。

```python
from scripts.saoif_image_analysis.storage_uploader import upload_images_in_folder

results = upload_images_in_folder(
    folder_path="./scripts/skill-master/source-images/sword",
)
```

返却される各要素の例:

```python
{
    "file_name": "sample.png",
    "relative_path": "sample.png",
    "storage_path": "skill-master/source-images/sword/sample.png",
    "download_url": "https://firebasestorage.googleapis.com/...",
    "status": "uploaded",
    "error": None,
}
```

- `status="uploaded"`: 正常アップロード
- `status="error"`: そのファイルだけ失敗
- `status="dry-run"`: 保存先だけ解決して未アップロード

1件失敗しても、他の画像の処理は継続します。

### CLI 実行例

```bash
npm run --silent saoif:image-analysis:storage -- \
  --folder ./scripts/skill-master/source-images/sword
```

`--dry-run` を付けると、Storage へ書き込まずに保存先と結果形式だけ確認できます。

```bash
npm run --silent saoif:image-analysis:storage -- \
  --folder ./scripts/skill-master/source-images/sword \
  --dry-run
```

## Gemini で画像を解析して CSV を作る

`gemini_skill_csv.py` は Firebase Storage の公開 URL またはローカル画像ファイルを Gemini (`gemini-2.5-flash-lite` が既定) に送り、解析結果を `pandas.DataFrame` にまとめて `saoif_skills.csv` に保存します。

指定したモデル名は、実行時に `list_models()` で確認し、現在の SDK/API で使える versioned model に自動解決します。  
たとえば `gemini-1.5-flash` 指定時に `gemini-1.5-flash-002` が使えるなら、そちらへ自動で寄せます。

生画像をそのまま 1 枚投げるのではなく、内部で次の補助画像も作って Gemini に渡します。

1. カード全体
2. タイトル帯
3. レアリティ付近
4. 右側タブ領域
5. 下部ステータス領域
6. スキルヘッダー領域
7. 属性アイコン枠
8. 攻撃属性アイコン枠
9. 右下アイコン領域

コストを抑えるため、送信前に各補助画像は **必要な領域と判定精度を保ったまま、過剰な拡大を避けるサイズ** に整えています。  
解析対象の 9 領域、判定ルール、出力カラムはそのままです。  
武器スキル系では、現在は **`characterName` / `skillName` / `effect`** を分けて読み取るようにしています。

アビリティカードの誤判定を減らすため、現在は **「アビリティかどうか」を最優先で判定** します。  
`equipmentType` が `アビリティ` と判断された場合、`element` と `attackType` は常に `null` に正規化します。

さらに、右下アイコンの色をローカルで見て `skillType` の補助ヒントにも使います。

追加のコスト削減として、現在は次も既定で有効です。

- **同一内容の画像は 1 回だけ Gemini に送る**
- **同じ設定・同じモデルで再実行した場合、既存の `*.debug.jsonl` から成功済み結果を再利用する**
- **Paid で利用可能な場合は、固定プロンプトを Gemini の explicit prompt cache に載せる**

出力カラム:

```text
id,name,characterName,rarity,cost,equipmentType,sp,element,skillType,attackType,breakGauge,switchGauge,cooldown,skillName,effect,image
```

### ローカルフォルダをまとめて解析する

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:gemini -- \
  --folder ./scripts/skill-master/source-images/sword-test
```

### Firebase Storage の URL リストを解析する

`urls.txt` に 1 行ずつ URL を並べます。

```text
https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/...
https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/...
```

実行:

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:gemini -- \
  --input-file ./urls.txt
```

`storage_uploader.py` が出力した JSON を `--input-file` に渡した場合は、  
`download_url` を CSV の `image` 列に残しつつ、対応する `scripts/skill-master/source-images/...` のローカル元画像が見つかれば **そちらを Gemini 解析に使います**。  
そのため、Storage URL の SSL 取得に失敗する環境でも、`upload -> gemini --input-file storage.json` の順でそのまま流せます。

### 出力ファイル名を指定する

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:gemini -- \
  --folder ./scripts/skill-master/source-images/sword-test \
  --output ./tmp/saoif_skills.csv
```

この場合、CSV とあわせて次のデバッグファイルも自動で出力されます。

```text
./tmp/saoif_skills.csv.debug.jsonl
```

各行に、Gemini の生レスポンス、正規化後レコード、失敗理由を記録します。

モデル自体が未対応の場合は、空 CSV を量産せず **preflight で停止**し、その理由を debug JSONL に残します。

再実行時は、この `debug JSONL` を見て **同じ解析シグネチャの成功済み行だけ自動で再利用**します。  
プロンプトや切り出し設定が変わると解析シグネチャも変わるため、古い結果を誤って流用しません。

### Python から使う

```python
from scripts.saoif_image_analysis.gemini_skill_csv import (
    analyze_skill_images_to_dataframe,
)

data_frame = analyze_skill_images_to_dataframe(
    image_sources=[
        "./scripts/skill-master/source-images/sword-test/0ae2faec7e7c92ee.png",
        "https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/...",
    ],
    output_path="saoif_skills.csv",
    sleep_seconds=2.0,
    resume_ok=True,
    dedupe_by_content=True,
    use_explicit_prompt_cache=True,
)
```

### 仕様メモ

- 1件ごとに **2 秒待機**して RPM を抑えます
- ただし、**resume / duplicate reuse で Gemini を呼ばなかった行には待機しません**
- 失敗した画像があっても処理は継続します
- 失敗した行も CSV に残し、判定できなかった列は空欄になります
- CSV と同時に `*.debug.jsonl` を出力し、空結果や失敗理由を追えるようにしています
- `requested model` / `resolved model` / `API error` も debug JSONL に記録します
- `analysis signature` / `imageSha256` / `resume` / `duplicate-content reuse` / `prompt cache` も debug JSONL に記録します
- `image` 列には入力 URL、またはローカル画像の絶対パスを保存します
- `id` は Gemini が確定できない場合、画像ソース名から `skill-...` 形式の draft ID を生成します
- `locale: en-US` のような設定はこのスクリプトでは使っていません。ファイル入出力は `utf-8` です

## アビリティ専用で CSV を作る

`gemini_ability_csv.py` は **アビリティカード専用** の Gemini 解析スクリプトです。  
武器スキル向けの属性・攻撃種別・右下アイコン色ヒントを使わず、次の 5 項目に集中して読み取ります。

- `name`: カード上部の表示名
- `characterName`: キャラクター名
- `rarity`: 星の数を数えた数値
- `cost`: コスト数値
- `effect`: 効果本文

次の列はスクリプト側で固定します。

```text
equipmentType=アビリティ
sp=null
element=null
skillType=アビリティ
attackType=null
breakGauge=null
switchGauge=null
cooldown=null
skillName=null
```

通常の `gemini_skill_csv.py` と同じく、入力はローカル画像フォルダ / URL リスト / JSON / CSV に対応し、`resume`, `duplicate-content reuse`, `prompt cache`, `debug JSONL` も使えます。

### ローカルのアビリティ画像をまとめて解析する

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:ability-gemini -- \
  --folder ./scripts/skill-master/source-images/ability
```

### まず 5 枚だけ試験実行する

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:ability-gemini-sample
```

このコマンドは `scripts/skill-master/source-images/ability` の先頭 5 枚だけを解析し、結果を `./tmp/saoif_abilities.sample.csv` に保存します。

### 出力ファイル名を指定する

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:ability-gemini -- \
  --folder ./scripts/skill-master/source-images/ability \
  --output ./tmp/saoif_abilities.csv
```

この場合、CSV とあわせて次のデバッグファイルも自動で出力されます。

```text
./tmp/saoif_abilities.csv.debug.jsonl
```

### Storage に upload して URL を `image` に残す

```bash
npm run saoif:image-analysis:ability-storage && \
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:ability-uploaded-gemini
```

または 1 コマンドで:

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:ability-pipeline
```

この経路では、まず `storage_uploader.py` が `./tmp/ability.storage.json` を作り、  
その `download_url` が CSV の `image` 列に入ります。  
Gemini 解析では、その JSON を `--input-file` として受け取り、`image` 以外の列を更新します。  
対応するローカル元画像が見つかる場合は、解析自体はそちらを使います。

### コスト最適化を無効にしたい場合

```bash
GEMINI_API_KEY=your-gemini-api-key \
npm run saoif:image-analysis:gemini -- \
  --folder ./scripts/skill-master/source-images/sword-test \
  --no-resume-ok \
  --no-dedupe-by-content \
  --disable-explicit-prompt-cache
```

## `build_context()` が行うこと

1. サービスアカウント JSON を読み込む
2. `project_id` から既定の Storage バケット名を決める
3. Firebase Admin SDK を初期化する
4. `storage.bucket()` で Storage バケットを取得する
5. Gemini API キーを `google.generativeai` に設定する

## 環境変数の優先順

### サービスアカウント JSON

1. `--service-account`
2. `GOOGLE_APPLICATION_CREDENTIALS`
3. `secrets/recordmanagements-service-account.json`

### Storage バケット名

1. `--storage-bucket`
2. `FIREBASE_STORAGE_BUCKET`
3. `<project_id>.appspot.com`

### Gemini API キー

1. `--gemini-api-key`
2. `GEMINI_API_KEY`
3. `GOOGLE_API_KEY`

## 補足

- `google-generativeai` は deprecated 警告が出ますが、今回の準備コードは依頼どおりこのパッケージを利用しています。
- `bootstrap.py` は同じ app 名 (`saoif-image-analysis`) で Firebase Admin SDK を再利用するため、同一プロセス内で複数回呼び出しても初期化を重複させません。
