# ISSUE_TEMPLATE テンプレート

新しいパッケージ用の Issue テンプレートを作成する際のガイドです。

---

## テンプレート命名規則

```
.github/ISSUE_TEMPLATE/-パッケージ名---タイプ-.md
```

例：
- `-hogeservice---bug-.md`
- `-hogeservice---new-.md`
- `-hogeservice---question-.md`
- `-hogeservice---uifix-.md`

---

## 4つのテンプレートタイプ

### 1. Bug Report テンプレート (`-パッケージ名---bug-.md`)

```markdown
---
name: "【パッケージ名 - Bug】"
about: バグ報告
title: "【パッケージ名 - Bug】"
labels: パッケージ名, bug
assignees: ''

---

**デバイス:**
※記入をお願いします
 - Device: [例. iPhone6, MacBook]
 - OS: [例. iOS8.1, android, MacOS]
 - Browser: [例. Chrome, safari]

**バグの説明**
タイトルでわかりにくいと感じたら記入

**再現方法**
スクショなどでもわかりにくいと思った場合記入
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**スクリーンショット**
必要であれば説明の補足としてアップロード
```

### 2. New Feature リクエスト (`-パッケージ名---new-.md`)

```markdown
---
name: "【パッケージ名 - 新規】"
about: 新機能のリクエスト
title: "【パッケージ名 - 新規】"
labels: パッケージ名
assignees: ''

---

## 機能の説明
(実装したい機能の説明を記入)

## 必要な背景
(なぜこの機能が必要か、どのような問題を解決するのか記入)

## 期待される動作
(期待される使用例を記入)
```

### 3. Question (`-パッケージ名---question-.md`)

```markdown
---
name: "【パッケージ名 - 質問】"
about: 質問や相談
title: "【パッケージ名 - 質問】"
labels: パッケージ名, question
assignees: ''

---

## 質問内容
(質問の内容を記入)

## 試したこと
(すでに試したことを記入)

## 期待していた結果
(期待していた結果を記入)

## 実際の結果
(実際の結果を記入)

## 追加情報
(その他情報があれば記入)
```

### 4. UI Fix リクエスト (`-パッケージ名---uifix-.md`)

```markdown
---
name: "【パッケージ名 - UI Fix】"
about: UI/UX に関する改善提案
title: "【パッケージ名 - UI Fix】"
labels: パッケージ名, ui-fix
assignees: ''

---

## 改善内容
(UI/UX のどの部分を改善するのか記入)

## 現在の状態
(現在の UI/UX を説明)

## 改善後の期待状態
(改善後の UI/UX を説明)

## スクリーンショット
(現在と改善後のスクリーンショットがあれば添付)
```

---

## 実装手順

### 1. テンプレートファイル作成

```bash
touch .github/ISSUE_TEMPLATE/-パッケージ名---bug-.md
touch .github/ISSUE_TEMPLATE/-パッケージ名---new-.md
touch .github/ISSUE_TEMPLATE/-パッケージ名---question-.md
touch .github/ISSUE_TEMPLATE/-パッケージ名---uifix-.md
```

### 2. 各ファイルに上記テンプレート内容を記入

### 3. Git にコミット

```bash
git add .github/ISSUE_TEMPLATE/-パッケージ名---*.md
git commit -m "Add issue templates for パッケージ名"
```

---

## YAML frontmatter の詳細

### name
Issue 作成時のドロップダウンに表示される名前。形式は `【パッケージ名 - タイプ】`

### about
説明文（短く簡潔に）

### title
デフォルトタイトル。形式は `【パッケージ名 - タイプ】`

### labels
自動的に付与されるラベル（パッケージ名、タイプを含める）

### assignees
デフォルトアサイニー（通常は空）

