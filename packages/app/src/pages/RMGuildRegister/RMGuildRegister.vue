<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'

const router = useRouter()
const $q = useQuasar()

const guildName = ref('')
const guildDescription = ref('')
const formRef = ref<HTMLFormElement | null>(null)

const onSubmit = async () => {
  if (formRef.value) {
    const isValid = await formRef.value.validate()
    if (!isValid) {
      $q.notify({
        type: 'negative',
        message: '入力内容に誤りがあります。',
        position: 'top',
      })
      return
    }
  }

  $q.loading.show({
    message: 'ギルドを登録しています...',
  })

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log('Registering Guild:', {
      name: guildName.value,
      description: guildDescription.value,
    })

    $q.notify({
      type: 'positive',
      message: 'ギルドが正常に登録されました。',
      position: 'top',
    })
    router.push('/')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'ギルドの登録に失敗しました。',
      position: 'top',
    })
    console.error('Guild registration failed:', error)
  } finally {
    $q.loading.hide()
  }
}

const onCancel = () => {
  router.push('/')
}

const requiredRule = (val: string) =>
  (val && val.length > 0) || 'このフィールドは必須です。'
</script>

<template>
  <div class="flex flex-center _guild_register_page">
    <q-card class="_guild_register_card">
      <q-card-section>
        <div class="text-h6 text-center _card_title">ギルド登録</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form @submit="onSubmit" ref="formRef" class="q-gutter-md">
          <RMInput
            v-model="guildName"
            label="ギルド名 *"
            hint="ギルドの名称を入力してください"
            :rules="[requiredRule]"
            shadow
          />

          <RMInput
            v-model="guildDescription"
            label="ギルド説明"
            type="textarea"
            hint="ギルドの説明を入力してください (任意)"
            shadow
          />

          <q-card-actions class="_btn_area">
            <RMButton label="キャンセル" flat color="grey" @click="onCancel" />
            <RMButton label="登録" type="submit" color="primary" />
          </q-card-actions>
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>

<style lang="sass" scoped>
._guild_register_page
  background-color: #f8f9fa
  min-height: 100vh

._guild_register_card
  width: 100%
  max-width: 550px
  padding: 30px
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08)
  border-radius: 12px
  background-color: #ffffff

._card_title
  font-size: 28px
  font-weight: 600
  color: #343a40
  margin-bottom: 30px

.q-gutter-md
  gap: 20px

.q-card-actions
  margin-top: 30px
._btn_area
  display: flex
  justify-content: center
  gap: 10px

// レスポンシブ調整
@media screen and (max-width: 600px)
  ._guild_register_card
    margin: 20px
    padding: 20px
  ._card_title
    font-size: 24px
    margin-bottom: 20px
</style>
