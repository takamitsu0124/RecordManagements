<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useRouter } from 'vue-router'

const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const router = useRouter()
</script>

<template>
  <div class="pre-login-page">
    <Card class="pre-login-card">
      <template #content>
        <div class="pre-login-card__content">
          <div class="pre-login-card__logo">
            <img src="~/assets/logo.png" alt="RecordManagement logo" />
          </div>

          <RMPageHeader
            title="RecordManagement"
            subtitle="必要な情報へすぐ入れるログイン導線"
            description="アカウント作成は管理者のみ可能です。招待や登録が必要な場合は、管理者へ依頼してください。"
            centered
          />

          <ul class="pre-login-card__points">
            <li>登録済みメールアドレスでそのままログインできます。</li>
            <li>所属ギルドやユーザー作成の相談先は管理者です。</li>
            <li>ログイン後はホームから各操作へ最短で移動できます。</li>
          </ul>

          <RMButton
            class="pre-login-card__button"
            @click="router.push('/RMMailLogin')"
            label="メールでログインする"
            :buttonShape="'ellipse'"
            :buttonType="'standard'"
            bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style lang="scss" scoped>
.pre-login-page {
  width: 100%;
  min-height: var(--rm-viewport-height);
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: v-bind(bgImgPath);
  background-size: cover;
}

.pre-login-card {
  width: min(100%, 560px);
}

.pre-login-card__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 22px 18px;
}

.pre-login-card__logo {
  width: 148px;
  margin: 0 auto;
}

.pre-login-card__points {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  color: var(--rm-text-soft);
  line-height: 1.7;
}

.pre-login-card__button {
  width: 100% !important;
}

@media (min-width: 768px) {
  .pre-login-card__content {
    padding: 28px 24px;
  }
}

@media (max-width: 767px) {
  .pre-login-card__content {
    gap: 18px;
    padding: 18px 16px;
  }

  .pre-login-card__logo {
    width: 132px;
  }
}

@media (max-width: 767px) and (max-height: 820px) {
  .pre-login-page {
    padding-top: max(10px, env(safe-area-inset-top));
    padding-bottom: max(10px, env(safe-area-inset-bottom));
  }

  .pre-login-card__content {
    gap: 14px;
    padding: 16px 14px;
  }

  .pre-login-card__logo {
    width: 118px;
  }

  .pre-login-card__points {
    gap: 6px;
    line-height: 1.55;
  }

  .pre-login-card__content :deep(.rm-page-header .p-toolbar) {
    gap: 10px;
    padding: 12px;
  }

  .pre-login-card__content :deep(.rm-page-header__body) {
    gap: 6px;
  }

  .pre-login-card__content :deep(.rm-page-header__description) {
    line-height: 1.5;
  }
}
</style>
