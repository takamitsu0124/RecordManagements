# RMUserRegister 仕様書

- 対応ファイル: `src/pages/RMUserRegister/RMUserRegister.vue`
- ルート: `/RMUserRegister`
- レイアウト: `layoutBeforeLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
新規ユーザー登録の入力ページです。メールアドレス、パスワード、キャラクター名、生年月日などの基本情報を受け取り、確認画面へ遷移します。

## 主な表示要素
- ロゴ
- 入力フォーム
  - メールアドレス
  - パスワード
  - キャラ名
  - キャラ名かな
  - 生年月日（YYYYMMDD）
- バリデーションエラーメッセージ
- ログイン画面へのリンク
- 登録 / キャンセルボタン
- 背景画像

## 主な操作
- 入力内容を `validateRegisterInfo()` で検証する
- 問題がなければ `RMUserRegisterConfirm` へ遷移する
- キャンセル時は入力情報を初期化する
- ログイン導線から `RMPreLogin` へ戻る

## 利用データ・依存
- `globalRegisterForm()` による一時フォーム状態保持
- `validateRegisterInfo()`
- `RMInput`、`RMButton`、`RMLogo`

## 備考
- 入力内容は画面遷移をまたいで保持されます。
- 背景画像 URL は固定です。
- 日付入力は 8 桁数字前提で、区切り文字は使いません。
