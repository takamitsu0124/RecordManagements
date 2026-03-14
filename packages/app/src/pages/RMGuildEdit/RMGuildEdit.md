# RMGuildEdit 仕様書

- 対応ファイル: `src/pages/RMGuildEdit/RMGuildEdit.vue`
- ルート: `/RMGuildEdit/:guildId`
- レイアウト: `layoutAfterLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
既存ギルド情報を更新する編集ページです。テキスト情報の更新に加えて、ギルドロゴ画像のアップロードと削除に対応しています。

## 主な表示要素
- ギルド名入力
- ギルド説明入力
- 存続状況選択
- 設立日入力 / 日付選択
- ギルドロゴの現在表示またはプレビュー
- 新規ロゴアップロード入力
- ロゴ削除ボタン
- キャンセル / 更新ボタン

## 主な操作
- `guildId` をもとに既存データを取得して初期表示する
- 入力値を検証してギルド情報を保存する
- 新しいロゴファイル選択時は Firebase Storage へアップロードする
- 既存ロゴ削除時は Storage と DB の参照を更新する
- 更新完了後は `RMGuildDetail` へ戻る

## 利用データ・依存
- `dbGuildModule` による取得 / 更新
- `uploadFile()`、`deleteFileByUrl()` によるファイル操作
- 独自入力 `RMInput`、独自ボタン `RMButton`

## 備考
- ロゴ差し替え時に旧ファイルの完全整理が不足する可能性があります。
- 日付は画面表示用文字列と保存用 `Date` を相互変換しています。
