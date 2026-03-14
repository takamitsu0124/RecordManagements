# RMComponent 仕様書

- 対応ファイル: `src/pages/RMComponent/RMComponent.vue`
- ルート: `/RMComponent`
- レイアウト: `MainLayout.vue` 配下
- ステータス: 開発用ページ

## 画面概要
独自 UI コンポーネントの表示確認や動作試験を行うためのサンプルページです。本番業務フローではなく、開発中の確認用途に使われます。

## 主な表示要素
- `RMHeader`、`RMCard`、`RMDrawer`、`RMUnderDrawer`
- `RMInput`、`RMButton`、`RMTab`、`RMLogo`
- スピナーやポップアップの動作確認用 UI

## 主な操作
- 各コンポーネントの外観確認
- ポップアップやスピナーの試験操作

## 備考
- 本番導線に含める想定ではないため、実運用画面と分離して扱うのが望ましいです。
- デザイン改修時は、共通コンポーネントの確認ページとして価値があります。
