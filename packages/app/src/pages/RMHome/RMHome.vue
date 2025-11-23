<script lang="ts" setup>
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { globalLoginUserData, lacksGuildId, hasGuildId } from 'src/boot/main'
import RMCard from 'src/components/RMCard/RMCard.vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router' // useRouterをインポート

const router = useRouter() // routerインスタンスを取得

onMounted(async () => {
  await dbUserModule.doc(globalLoginUserData.value.id).fetch()
})

const registerGuild = () => {
  router.push('RMGuildRegister') // ギルド登録ページへ遷移
}
</script>

<template>
  <div class="_home_outer_container">
    <!-- ギルドに所属しておらず、roleがエンドユーザー -->
    <div class="_home_inner_container">
      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerGuild"
        v-if="lacksGuildId"
      >
        <q-icon class="_icon_setting" name="add_home" />
        <div class="_content_text">ギルド登録</div>
      </RMCard>
      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerGuild"
        v-if="hasGuildId"
      >
        <q-icon class="_icon_setting" name="o_touch_app" />
        <div class="_content_text">ギルド選択</div>
      </RMCard>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._home_outer_container
  padding: 40px

._home_inner_container
  display: flex
  flex-wrap: wrap
  justify-content: center
  align-items: center
  gap: 25px

._card_content
  width: 150px
  height: 150px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  gap: 10px
  cursor: pointer
  border: 1px solid #e0e0e0
  border-radius: 12px
  background-color: #ffffff
  transition: all 0.3s ease
  &:hover
    transform: translateY(-5px) scale(1.02)
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1)
    border-color: #b0c4de

._icon_setting
  font-size: 80px
  color: #5c6bc0
  transition: color 0.3s ease

._content_text
  font-size: 18px
  font-weight: 500
  color: #424242
  transition: color 0.3s ease

._card_content:hover ._icon_setting
  color: #3f51b5

._card_content:hover ._content_text
  color: #3f51b5

// PC
@media screen and (min-width: 768px)
  ._home_outer_container
    padding: 60px
  ._home_inner_container
    max-width: 900px
    margin: 0 auto
  ._card_content
    width: 180px
    height: 180px
  ._icon_setting
    font-size: 90px
  ._content_text
    font-size: 20px
</style>
