# RMCalendarPage 仕様書

- 対応ファイル: `src/pages/RMCalendarPage/RMCalendarPage.vue`
- ルート: `/RMCalendar`
- レイアウト: `layoutAfterLoginNavigator.vue`
- ステータス: 実装済み

## 画面概要
Google Calendar の予定を FullCalendar で表示し、PrimeVue `Dialog` から必要範囲を編集する画面です。guild shared calendar と personal calendar を role / feature flag に応じて切り替えられます。

## 主な表示要素
- カレンダー表示先の切り替えボタン
- Google 接続状態 / scope / calendar ID のステータス表示
- FullCalendar 本体
- 予定クリックで開く詳細 / 編集 Dialog

## 主な操作
- Google Identity Services token model で readonly / edit scope を段階取得する
- guild ドキュメントの `googleCalendarId` を shared calendar の参照先として利用する
- Google Calendar API から予定を取得し、表示範囲に応じて再読込する
- Dialog でタイトル / 期間 / 場所 / メモを編集し、PATCH 結果を即時反映する

## 利用データ・依存
- `@fullcalendar/vue3`, `@fullcalendar/daygrid`, `@fullcalendar/list`, `@fullcalendar/interaction`
- `src/services/googleCalendar.ts`
- `src/config/googleCalendar.ts`
- `dbGuildModule`

## 備考
- guild shared calendar は `member` が閲覧専用、`guild_admin` / `admin` が編集可能です。
- personal calendar は feature flag 有効時のみ表示されます。
