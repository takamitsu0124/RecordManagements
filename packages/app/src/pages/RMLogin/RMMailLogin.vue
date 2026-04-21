<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useRouter } from 'vue-router'
import { mailLogin } from '@rm/utils'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { auth } from '@rm/db'
import { notifySuccess } from 'src/composables/useAppNotifications'

const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const signIn = async () => {
  await useSpinner(async () => {
    await mailLogin(auth, email.value, password.value, router, '/RMHome')
      .then(() => {
        notifySuccess('ログインしました')
        return router.push('/RMHome')
      })
      .catch((error) => {
        console.log('ログインエラー', error.code)

        if (error.code === 'auth/too-many-requests') {
          errorMessage.value =
            '入力上限に達しました。パスワードの再設定をお願いします'
          return
        }

        errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
      })
  })
}
</script>

<template>
  <div class="login-page">
    <Card class="login-card">
      <template #content>
        <form class="login-card__content" @submit.prevent="signIn">
          <div class="login-card__logo">
            <img src="~/assets/logo.png" alt="RecordManagement logo" />
          </div>

          <RMPageHeader
            title="RecordManagement"
            subtitle="メールアドレスでログイン"
            description="検索と閲覧を素早く始められるよう、必要な入力だけを残したシンプルな導線にしています。"
            centered
          />

          <p class="login-card__support">
            登録済みメールアドレスでログインします。うまく入れない場合は、管理者にアカウント状態を確認してください。
          </p>

          <div class="rm-form-stack">
            <RMInput
              v-model="email"
              type="email"
              label="ログインID"
              placeholder="sample@gmail.com"
              autocomplete="username"
              :error2="!!errorMessage"
              shadow
            />
            <RMInput
              v-model="password"
              type="password"
              label="パスワード"
              placeholder="aa12345678"
              autocomplete="current-password"
              :error2="!!errorMessage"
              shadow
            />
          </div>

          <p v-if="errorMessage" class="login-card__error">
            {{ errorMessage }}
          </p>

          <div class="rm-actions">
            <RMButton
              label="戻る"
              flat
              color="grey"
              @click="router.push({ name: 'RMPreLogin' })"
            />
            <RMButton
              type="submit"
              label="ログイン"
              bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
            />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  width: 100%;
  min-height: var(--rm-viewport-height);
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: v-bind(bgImgPath);
  background-size: cover;
}

.login-card {
  width: min(100%, 480px);
}

.login-card__content {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 18px;
}

.login-card__logo {
  width: 132px;
  margin: 0 auto;
}

.login-card__support {
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(215, 222, 232, 0.9);
  color: var(--rm-text-soft);
  line-height: 1.7;
}

.login-card__error {
  margin: 0;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  text-align: center;
  font-weight: 700;
  color: var(--rm-danger);
}

@media (min-width: 768px) {
  .login-card__content {
    padding: 24px 22px;
  }
}

@media (max-width: 767px) {
  .login-card__content {
    gap: 16px;
    padding: 18px 16px;
  }

  .login-card__logo {
    width: 120px;
  }

  .login-card__support {
    padding: 10px 12px;
  }
}

@media (max-width: 767px) and (max-height: 820px) {
  .login-page {
    padding-top: max(10px, env(safe-area-inset-top));
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .login-card__content {
    gap: 14px;
    padding: 16px 14px;
  }

  .login-card__logo {
    width: 108px;
  }

  .login-card__support,
  .login-card__error {
    padding: 10px 12px;
    line-height: 1.55;
  }

  .login-card__content :deep(.rm-page-header .p-toolbar) {
    gap: 10px;
    padding: 12px;
  }

  .login-card__content :deep(.rm-page-header__body) {
    gap: 6px;
  }

  .login-card__content :deep(.rm-page-header__description) {
    line-height: 1.5;
  }
}
</style>
