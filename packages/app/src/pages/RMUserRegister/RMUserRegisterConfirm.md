# RMUserRegisterConfirm 仕様書

- 対応ファイル: `src/pages/RMUserRegister/RMUserRegisterConfirm.vue`
- ルート: `/RMUserRegisterConfirm`
- レイアウト: `layoutBeforeLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
ユーザー登録内容の確認ページです。前画面で入力した内容を読み取り専用で表示し、Firebase Auth と Firestore への保存を実行します。

## 主な表示要素
- ロゴ
- 確認カード
  - メールアドレス
  - マスク済みパスワード
  - キャラ名
  - キャラ名かな
  - 整形済み生年月日
- 登録 / 戻るボタン

## 主な操作
- 登録ボタン押下で Auth ユーザー作成を行う
- 続けて Firestore にユーザー情報を保存する
- 成功時はトースト表示後にホームへ遷移する
- 失敗時はポップアップでエラーを通知する
- 戻るで入力画面へ戻る

## 利用データ・依存
- `globalRegisterForm()`
- `createUser()`
- `dbUserCreate()`
- `stringDateFormat()`、`maskPassword()`
- `useSpinner()`、`usePopupFun()`、`useToast()`
- `RMCard`、`RMLogo`、`RMButton`

## 備考
- Auth 作成と DB 保存の 2 段階処理です。
- 登録後はログイン済み状態へ遷移する前提のフローになっています。
