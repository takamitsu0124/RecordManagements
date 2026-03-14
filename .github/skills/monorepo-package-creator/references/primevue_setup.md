# PrimeVue セットアップ詳細

このドキュメントは、Vite + PrimeVue 選択時に提示される詳細なセットアップ手順を記載しています。

---

## 1. package.json への依存関係追加

PrimeVue を使用する場合、以下の依存関係を package.json に追加してください：

### dependencies セクション

```json
{
  "dependencies": {
    "vue": "^3.4.x",
    "vue-router": "^4.x.x",
    "primevue": "^4.x.x",
    "primeicons": "^6.x.x"
  }
}
```

### devDependencies セクション

```json
{
  "devDependencies": {
    "@primevue/themes": "^4.x.x",
    "@vitejs/plugin-vue": "^5.x.x",
    "vite": "^6.0.0",
    "typescript": "^5.x.x",
    "sass": "^1.70.x",
    "sass-loader": "^14.x.x"
  }
}
```

その後、`npm install` を実行してください。

---

## 2. src/main.ts セットアップコード

main.ts を以下のように設定してください：

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// PrimeVue
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// PrimeVue コンポーネント（必要に応じて追加）
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

// PrimeVue アイコン
import 'primeicons/primeicons.css'

// Aura テーマ
// Aura テーマは @primevue/themes パッケージに含まれているため、CSS の個別 import は不要

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark'
    }
  }
})

// グローバルコンポーネント登録（よく使うコンポーネント）
app.component('PButton', Button)
app.component('PInputText', InputText)
app.component('PCard', Card)
app.component('PDialog', Dialog)
app.component('PDataTable', DataTable)
app.component('PColumn', Column)

app.use(router)
app.mount('#app')
```

### 注意事項

- **コンポーネント登録** - 上記は一般的なコンポーネント例です。プロジェクトに必要なもののみ登録してください。
- **Aura テーマ** - Aura はデフォルトテーマです。他のテーマ（Material, Bootstrap, Lara など）も利用可能です。
- **ダークモード** - `darkModeSelector: '.dark'` は HTML に `class="dark"` がある時に自動でダークモード適用します。

---

## 3. src/assets/theme.scss（カスタマイズファイル）

theme.scss ファイルを作成し、PrimeVue のカスタマイズを行います：

```scss
// PrimeVue Aura テーマ カスタマイズ用
// 色やサイズを変更したい場合はここを編集してください

// 例：プライマリカラー変更
// :root {
//   --primary-color: #3b82f6;
//   --primary-50: #eff6ff;
//   --primary-100: #dbeafe;
//   --primary-200: #bfdbfe;
//   --primary-300: #93c5fd;
//   --primary-400: #60a5fa;
//   --primary-500: #3b82f6;
//   --primary-600: #2563eb;
//   --primary-700: #1d4ed8;
//   --primary-800: #1e40af;
//   --primary-900: #1e3a8a;
// }

// 例：サーフェスカラーの変更
// :root {
//   --surface-ground: #f9fafb;
//   --surface-50: #f9fafb;
//   --surface-100: #f3f4f6;
//   --surface-200: #e5e7eb;
// }

// グローバルスタイル
body {
  font-family: var(--font-family);
  color: var(--text-color);
  background-color: var(--surface-ground);
}

// ダークモード対応例
.dark {
  color-scheme: dark;
}
```

### App.vue で import

App.vue で theme.scss をインポートしてください：

```vue
<script setup lang="ts">
import '@/assets/theme.scss'
</script>

<template>
  <div>
    <RouterView />
  </div>
</template>
```

---

## 4. src/pages/Home.vue（サンプルコンポーネント集）

PrimeVue コンポーネントのサンプル page を作成：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref('')
const buttonClicked = ref(0)
const isDialogVisible = ref(false)

const handleButtonClick = () => {
  buttonClicked.value++
}

const showDialog = () => {
  isDialogVisible.value = true
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-6">PrimeVue Components Sample</h1>

    <!-- Card + Button Example -->
    <PCard class="mb-6">
      <template #title>Button Component</template>
      <template #content>
        <div class="flex gap-2 flex-wrap">
          <PButton
            label="Click Me"
            @click="handleButtonClick"
            icon="pi pi-check"
          />
          <PButton label="Secondary" severity="secondary" />
          <PButton label="Danger" severity="danger" />
          <PButton label="Dialog" @click="showDialog" />
        </div>
        <p class="mt-4">Button clicked: {{ buttonClicked }} times</p>
      </template>
    </PCard>

    <!-- Input Example -->
    <PCard class="mb-6">
      <template #title>Input Component</template>
      <template #content>
        <div>
          <label for="input1" class="block mb-2">Text Input:</label>
          <PInputText
            id="input1"
            v-model="inputValue"
            type="text"
            placeholder="Type something..."
            class="w-full"
          />
          <p class="mt-4">You typed: {{ inputValue }}</p>
        </div>
      </template>
    </PCard>

    <!-- Dialog Example -->
    <PDialog
      v-model:visible="isDialogVisible"
      modal
      header="Sample Dialog"
      :style="{ width: '50vw' }"
      @hide="isDialogVisible = false"
    >
      <p>This is a sample dialog component from PrimeVue.</p>
      <template #footer>
        <PButton
          label="Close"
          @click="isDialogVisible = false"
          severity="secondary"
        />
      </template>
    </PDialog>

    <!-- Info Card -->
    <PCard>
      <template #title>Getting Started</template>
      <template #content>
        <p>
          This is a sample page using PrimeVue components (Button, Input, Card, Dialog).
        </p>
        <p class="mt-2">
          To customize colors, edit <code>src/assets/theme.scss</code>
        </p>
        <p class="mt-2">
          Learn more about PrimeVue:
          <a href="https://primevue.org" target="_blank">primevue.org</a>
        </p>
      </template>
    </PCard>
  </div>
</template>

<style scoped>
code {
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

a {
  color: var(--primary-color);
  text-decoration: underline;
}

a:hover {
  color: var(--primary-600);
}
</style>
```

---

## 5. router/index.ts への Home ルート追加

router/index.ts に Home ページのルートを追加：

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '@/pages/Home.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  // 他のルートはここに追加
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

---

## 6. 追加コンポーネント参考

よく使う PrimeVue コンポーネントの例：

### Button バリエーション
```vue
<PButton label="Default" />
<PButton label="Primary" />
<PButton label="Secondary" severity="secondary" />
<PButton label="Success" severity="success" />
<PButton label="Info" severity="info" />
<PButton label="Warning" severity="warning" />
<PButton label="Danger" severity="danger" />
<PButton label="Rounded" rounded />
<PButton label="Outlined" outlined />
<PButton label="Text" text />
<PButton icon="pi pi-plus" rounded />
```

### Form Components
```vue
<div class="mb-4">
  <label for="inputText">Text Input</label>
  <PInputText id="inputText" v-model="value" class="w-full mt-2" />
</div>

<div class="mb-4">
  <label for="dropdown">Dropdown</label>
  <PDropdown
    id="dropdown"
    v-model="selected"
    :options="items"
    option-label="label"
    option-value="value"
    class="w-full mt-2"
  />
</div>

<div class="mb-4">
  <label for="checkbox">Checkbox</label>
  <PCheckbox id="checkbox" v-model="checked" binary class="mt-2" />
</div>
```

---

## セットアップチェックリスト

- [ ] `npm install` 実行
- [ ] package.json に依存関係追加
- [ ] main.ts に PrimeVue セットアップコード追加
- [ ] src/assets/theme.scss 作成
- [ ] App.vue で theme.scss import
- [ ] src/pages/Home.vue にサンプルコンポーネント作成
- [ ] router/index.ts に Home ルート追加
- [ ] `npm run dev` で動作確認

