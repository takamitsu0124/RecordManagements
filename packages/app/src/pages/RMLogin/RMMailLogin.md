# RMMailLogin 仕様書

- 対応ファイル: `src/pages/RMLogin/RMMailLogin.vue`
- ルート: `/RMMailLogin`
- レイアウト: `layoutBeforeLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
メールアドレスとパスワードでログインする認証ページです。Firebase Auth のエラー内容を画面用メッセージへ変換して表示します。

## 主な表示要素
- メールアドレス入力
- パスワード入力
- エラーメッセージ表示
- ログインボタン
- ロゴ / タイトル領域

## 主な操作
- `mailLogin()` を呼び出して認証する
- 処理中はスピナーを表示して操作をブロックする
- 成功時はトースト表示後に `RMHome` へ遷移する
- 失敗時は認証エラーを文言変換して表示する

## 利用データ・依存
- `auth`、`mailLogin()`
- `useSpinner()`、`useToast()`
- `RMInput`、`RMButton`

## 備考
- パスワード再設定導線は未実装です。
- セキュリティ配慮のため、認証失敗メッセージはある程度まとめられています。
