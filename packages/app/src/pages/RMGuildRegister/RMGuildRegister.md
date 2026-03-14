# RMGuildRegister 仕様書

- 対応ファイル: `src/pages/RMGuildRegister/RMGuildRegister.vue`
- ルート: `/RMGuildRegister`
- レイアウト: `layoutAfterLoginNavigator.vue` / `layoutBeforeLoginNavigator.vue` の両方から参照
- ステータス: 実装済み

## 画面概要
新しいギルドを作成するフォームページです。ギルド未所属ユーザーがホーム画面から利用する想定で、作成時にログイン中ユーザーを初期メンバーとして設定します。

## 主な表示要素
- ギルド名入力
- ギルド説明 / メモ入力
- キャンセル / 登録ボタン
- 中央寄せのフォームカード

## 主な操作
- 必須項目を検証してギルド情報を新規作成する
- 初期状態として「存続」「正式メンバー数 1」を設定する
- ログインユーザーをメンバー一覧へ追加して保存する
- キャンセル時はホームへ戻る

## 利用データ・依存
- `dbGuildModule.insert()` による新規作成
- `globalLoginUserData` によるログインユーザー情報参照
- `RMInput`、`RMButton`

## 備考
- 登録後の遷移で `RMGuildDetail` に必要な `guildId` パラメータ不足の懸念があります。
- ロゴ設定や詳細項目はこの画面では扱いません。
- ログイン前レイアウト / ログイン後レイアウトの両方から参照されている点は整理対象です。
