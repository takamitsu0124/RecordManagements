<script lang="ts" setup>
import { dbUserModule } from '@rm/db/src/fireStore/User'
import { globalLoginUserData, lacksGuildId, hasGuildId } from 'src/boot/main'
import RMCard from 'src/components/RMCard/RMCard.vue'
import { onMounted } from 'vue'

onMounted(async () => {
  await dbUserModule.doc(globalLoginUserData.value.id).fetch()
})

const registerGuild = () => {
  console.log('register')
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
  padding: 20px
._home_inner_container
  display: flex
  flex-wrap: wrap
  justify-content: flex-start
  align-items: center
  gap: 15px
._card_content
  width: 105px
  height: 105px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  gap: 5px
  cursor: pointer
._icon_setting
  font-size: 70px
  color: #707070
._content_text
  font-size: 20px
  color: blue
// PC
@media screen and (min-width: 768px)
</style>
