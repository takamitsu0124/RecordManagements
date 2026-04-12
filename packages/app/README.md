# Quasar App (app)

A Quasar Project

## Install the dependencies
```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Lint the files
```bash
yarn lint
# or
npm run lint
```


### Format the files
```bash
yarn format
# or
npm run format
```



### Build the app for production
```bash
quasar build
```

### Google Calendar OAuth public env

Google Calendar 連携の public 設定は `packages/app/.env.example` を元に `.env.local` などへ配置します。

```bash
APP_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=
APP_PUBLIC_GOOGLE_CALENDAR_DISCOVERY_DOC=https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest
APP_PUBLIC_GOOGLE_CALENDAR_REDIRECT_PATH=/google-calendar/oauth/callback
APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_GUILD_CALENDAR=true
APP_PUBLIC_GOOGLE_CALENDAR_ENABLE_PERSONAL_CALENDAR=false
```

- **入れてよいのは public 値だけ**です
- client secret / refresh token / service account key はここへ置かないでください
- OAuth / scope / token policy の詳細は root `README.md` を参照してください

### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-webpack/quasar-config-js).
