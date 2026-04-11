<script lang="ts" setup>
import { hasAdmin, hasGuildId, globalLoginUserData, lacksGuildId } from 'src/boot/main'
import RMCard from 'src/components/RMCard/RMCard.vue'
import RMIcon from 'src/components/RMIcon/RMIcon.vue'
import { useRouter } from 'vue-router'
import { notifyError } from 'src/composables/useAppNotifications'

const router = useRouter()

const registerGuild = () => {
	router.push({ name: 'RMGuildRegister' })
}

const registerUser = () => {
	router.push({ name: 'RMUserRegister' })
}

const goToSkillMasterAdmin = () => {
	router.push({ name: 'RMSkillMasterAdmin' })
}

const selectGuild = () => {
	if (!globalLoginUserData.value.guildId) {
		notifyError('所属ギルド情報が見つかりません。')
		return
	}

	router.push({
		name: 'RMGuildDetail',
		params: { guildId: globalLoginUserData.value.guildId },
	})
}

const goToUserEdit = () => {
	if (!globalLoginUserData.value.id) {
		notifyError('ユーザー情報が見つかりません。')
		return
	}

	router.push({
		name: 'RMUserEdit',
		params: { userId: globalLoginUserData.value.id },
	})
}
</script>

<template>
  <div class="rm-page rm-page--top">
    <div class="_home_inner_container">
      <RMCard
        v-if="hasAdmin"
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerUser"
      >
        <RMIcon class="_icon_setting" name="person_add" />
        <div class="_content_text">ユーザー登録</div>
      </RMCard>

      <RMCard
        v-if="hasAdmin"
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="goToSkillMasterAdmin"
      >
        <RMIcon class="_icon_setting" name="edit" />
        <div class="_content_text">スキルマスター管理</div>
      </RMCard>

      <RMCard
        v-if="lacksGuildId"
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="registerGuild"
      >
        <RMIcon class="_icon_setting" name="add_home" />
        <div class="_content_text">ギルド登録</div>
      </RMCard>

      <RMCard
        v-if="hasGuildId"
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="selectGuild"
      >
        <RMIcon class="_icon_setting" name="touch_app" />
        <div class="_content_text">ギルド選択</div>
      </RMCard>

      <RMCard
        class="_card_content"
        :cardShape="'roundM'"
        :shadowDirection="'allSide'"
        @click="goToUserEdit"
      >
        <RMIcon class="_icon_setting" name="edit" />
        <div class="_content_text">マイページ</div>
      </RMCard>
    </div>
  </div>
</template>

<style lang="sass" scoped>
._home_inner_container
  width: min(100%, 920px)
  display: flex
  flex-wrap: wrap
  justify-content: center
  align-items: center
  gap: 24px
  padding: 8px

._card_content
  width: 160px
  min-height: 160px
  display: flex
  flex-direction: column
  justify-content: center
  align-items: center
  gap: 14px
  cursor: pointer
  border: 1px solid rgba(255,255,255,0.72)
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,248,252,0.94))
  transition: all 0.3s ease
  &:hover
    transform: translateY(-6px) scale(1.02)
    box-shadow: 0 20px 36px rgba(15, 23, 42, 0.14)
    border-color: rgba(161, 194, 225, 0.8)

._icon_setting
  font-size: 78px
  color: #5c6bc0
  transition: color 0.3s ease

._content_text
  font-size: 18px
  font-weight: 600
  color: #334155
  transition: color 0.3s ease

._card_content:hover ._icon_setting
  color: #3f51b5

._card_content:hover ._content_text
  color: #3f51b5

@media screen and (min-width: 768px)
  ._card_content
    width: 190px
    min-height: 190px
  ._icon_setting
    font-size: 88px
  ._content_text
    font-size: 20px
</style>
