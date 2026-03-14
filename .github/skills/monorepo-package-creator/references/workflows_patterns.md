# GitHub Workflows 統合パターン

Vite パッケージを既存の GitHub Actions ワークフローに統合するための指示内容を記載しています。

---

## 概要

以下の3つのワークフローファイルに新しいパッケージを追加します：

1. **.github/workflows/merge.yml** - マージ時のテスト・ビルド
2. **.github/workflows/pull-request.yml** - PR 時の Lint・フォーマットチェック
3. **.github/workflows/release.yml** - リリース時のビルド・デプロイ

---

## 1. merge.yml 統合パターン

### 事前確認: デプロイ先 projectId

merge.yml はテスト環境への自動デプロイを行います。
ステップ4-3・8-1 で取得した値を使用します。

### 探す場所
`jobs.build_and_deploy` セクション内で、既存パッケージのビルド・デプロイステップが列挙されている箇所。

### 追加パターン

ビルドステップと Firebase deploy ステップの両方を追加します：

```yaml
      # ↓ ここに追加 ↓
      - name: Run build script (パッケージ名)
        run: npm run build -w @ism/パッケージ名

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.<テスト環境シークレット名> }}'
          channelId: live
          projectId: <テスト用 projectId>
          target: <テスト用サイト名>
```

---

## 2. pull-request.yml 統合パターン

### 探す場所
既存の `build-*` ジョブが列挙されている箇所の後。

### 追加パターン

```yaml
  build-パッケージ名:
    needs: [install-dependencies, filter]
    if: ${{ needs.filter.outputs.isChange == 'true' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - uses: actions/cache@v4
        id: node_modules_cache_id
        env:
          cache-name: cache-node-modules
        with:
          path: '**/node_modules'
          key: ${{ runner.os }}-build-${{ env.cache-name }}-${{ hashFiles('./package-lock.json') }}

      - name: Run build script (パッケージ名)
        run: npm run build -w @ism/パッケージ名
```

> **注意**: `key` のハッシュ対象は既存ジョブに合わせること（src-capacitor の package.json が含まれる場合はそれも追加する）。

---

## 3. release.yml 統合パターン

### 事前確認: デプロイ先 projectId

release.yml は本番環境への手動リリース時のデプロイです。
ステップ8-1 で取得した値を使用します。

### 探す場所
`jobs.build_and_deploy` セクション内で、既存パッケージのビルド・デプロイブロックの後。

### 追加パターン（Firebase deploy の例）

```yaml
      - name: Run build script (パッケージ名)
        run: npm run build -w @ism/パッケージ名

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.<本番環境シークレット名> }}'
          channelId: live
          target: <本番用サイト名>
          projectId: <本番用 projectId>
```

---

## 実装チェックリスト

- [ ] merge.yml に build + deploy ステップ追加
- [ ] pull-request.yml に build-パッケージ名 ジョブ追加
- [ ] release.yml に build + deploy ステップ追加
- [ ] ワークフローをテスト（PR 作成で確認）

