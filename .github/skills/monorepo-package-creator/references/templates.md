# テンプレート集 - Package.json, tsconfig.json, README.md など

このドキュメントには、新しいパッケージ作成時に使用するテンプレートが含まれています。

## 目次

1. [Vite/Vue3 構造](#vitevue3-構造)
2. [シンプル構造](#シンプル構造)
3. [設定ファイル共通](#設定ファイル共通)

---

## Vite/Vue3 構造

### package.json テンプレート (Vite/Vue3, PrimeVue なし)

```json
{
  "name": "@ism/パッケージ名",
  "version": "0.0.1",
  "description": "パッケージの説明",
  "type": "module",
  "private": true,
  "scripts": {
    "lint": "eslint -c ./eslint.config.js \"./src/**/*.{ts,js,vue}\"",
    "format": "prettier --write \"**/*.{js,ts,vue,scss,html,md,json}\" --ignore-path .gitignore",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.x",
    "vue-router": "^4.x.x"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.x.x",
    "vite": "^6.x.x",
    "typescript": "^5.x.x",
    "@types/node": "^20.x.x"
  }
}
```

### package.json テンプレート (Vite/Vue3 + PrimeVue)

```json
{
  "name": "@ism/パッケージ名",
  "version": "0.0.1",
  "description": "パッケージの説明",
  "type": "module",
  "private": true,
  "scripts": {
    "lint": "eslint -c ./eslint.config.js \"./src/**/*.{ts,js,vue}\"",
    "format": "prettier --write \"**/*.{js,ts,vue,scss,html,md,json}\" --ignore-path .gitignore",
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.x",
    "vue-router": "^4.x.x",
    "primevue": "^4.x.x",
    "primeicons": "^6.x.x"
  },
  "devDependencies": {
    "@primevue/themes": "^4.x.x",
    "@vitejs/plugin-vue": "^5.x.x",
    "vite": "^6.x.x",
    "typescript": "^5.x.x",
    "@types/node": "^20.x.x",
    "sass": "^1.70.x",
    "sass-loader": "^14.x.x"
  }
}
```

### vite.config.ts テンプレート

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
```

### tsconfig.json テンプレート

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### index.html テンプレート

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>パッケージ名</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### App.vue テンプレート (基本)

```vue
<script setup lang="ts">
</script>

<template>
  <div>
    <RouterView />
  </div>
</template>

<style scoped>
</style>
```

### App.vue テンプレート (PrimeVue + theme.scss)

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

### main.ts テンプレート (基本)

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)
app.mount('#app')
```

### router/index.ts テンプレート

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

### README.md テンプレート (Vite/Vue3)

```markdown
# @ism/パッケージ名

パッケージの説明

## セットアップ

\`\`\`bash
npm install
\`\`\`

## 開発

\`\`\`bash
npm run dev
\`\`\`

## ビルド

\`\`\`bash
npm run build
\`\`\`

## その他

- **Lint**: \`npm run lint\`
- **Format**: \`npm run format\`
```

---

## シンプル構造

### package.json テンプレート (シンプル構造)

```json
{
  "name": "@ism/パッケージ名",
  "version": "0.0.1",
  "description": "パッケージの説明",
  "main": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "typescript": "^5.x.x",
    "@types/node": "^20.x.x"
  }
}
```

### tsconfig.json テンプレート (シンプル構造)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### README.md テンプレート (シンプル構造)

```markdown
# @ism/パッケージ名

パッケージの説明

## インストール

\`\`\`bash
npm install @ism/パッケージ名
\`\`\`

## 使用例

\`\`\`typescript
import { ... } from '@ism/パッケージ名'
\`\`\`

## ビルド

\`\`\`bash
npm run build
\`\`\`
```

---

## 設定ファイル共通

### .gitignore テンプレート

```
# Vite
dist/
.vite/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# OS
.DS_Store
```

