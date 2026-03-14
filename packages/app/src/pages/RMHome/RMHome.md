# RMHome 仕様書

- 対応ファイル: `src/pages/RMHome/RMHome.vue`
- ルート: `/RMHome`
- レイアウト: `layoutAfterLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
ログイン後のホーム画面です。ギルド登録、ギルド選択、マイページ編集など、主要導線へ遷移するハブとして機能します。

## 主な表示要素
- アクションカード群
  - ギルド登録
  - ギルド選択
  - マイページ
- 読み込み状態に応じた導線制御
- モバイル中心のカードレイアウト

## 主な操作
- ユーザー / ギルド情報を取得し、所属状況を判定する
- ギルド未所属時のみ「ギルド登録」を表示する
- 所属ギルドがあれば `RMGuildDetail/:guildId` へ遷移する
- `RMUserEdit/:userId` へ遷移する

## 利用データ・依存
- `dbUserModule`、`dbGuildModule`
- `globalLoginUserData`
- 独自カード `RMCard`
- Quasar の通知機能

## 備考
- カード幅は固定寄りで、デザインの自由度はやや低めです。
- ギルド取得失敗時の専用エラー UI は限定的です。
