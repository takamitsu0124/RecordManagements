import { ref } from 'vue';

export const menu = ref<{ name: string; url: string }[]>([
  { name: 'TOP', url: '/top' },
  { name: '物件詳細', url: '/propertyDetail' },
  { name: '住宅履歴', url: '/propertyHistory' },
  { name: '点検スケジュール確認', url: '/inspectionSchedule' },
  { name: '書類データ', url: '/documentData' },
  { name: '住宅会社情報', url: '/companyInfo' },
  { name: '物件情報引継', url: '/propertyHandover' },
  { name: '物件切替', url: '/propertySwitching' },
  { name: 'アカウント設定', url: '/setting' },
  { name: 'ログアウト', url: '' },
]);
