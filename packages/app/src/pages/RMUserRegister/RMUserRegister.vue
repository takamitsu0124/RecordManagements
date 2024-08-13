<script lang="ts" setup>
import { globalRegisterForm } from './register'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMLogo from 'src/components/RMLogo/RMLogo.vue'

const { registerInfo, defaultRegisterInfo, validateRegisterInfo } =
  globalRegisterForm()
const router = useRouter()
const errors = ref<{ field: string; message: string }>({
  field: '',
  message: '',
})
const bgImgPath = ref(
  'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Fregister_background.jpeg?alt=media&token=2a3fd22a-6f76-4c06-90a0-83152a09179f") no-repeat center'
)
const onFocus = ref<number>(0)

const registerConfirm = () => {
  errors.value.message = validateRegisterInfo(registerInfo.value)?.message ?? ''
  errors.value.field = validateRegisterInfo(registerInfo.value)?.field ?? ''
  if (errors.value.message === '')
    router.push({ name: 'RMUserRegisterConfirm' })
  else return
}
</script>

<template>
  <div class="_user_register_outer_container">
    <div class="_user_register_inner_container">
      <div class="_user_register_form">
        <div class="_app_logo_area">
          <RMLogo margin_bottom="20px" />
        </div>
        <RMInput
          v-model="registerInfo.email"
          :class="['_register_input', { _input_active: onFocus === 1 }]"
          label="メールアドレス"
          type="text"
          requiredText="※必須"
          placeholder="sample@gmail.com"
          shadow
          @onFocus="onFocus = 1"
          @onBlur="onFocus = 0"
          :error2="errors.field === 'email'"
        />
        <RMInput
          v-model="registerInfo.password"
          :class="['_register_input', { _input_active: onFocus === 2 }]"
          label="パスワード"
          type="password"
          requiredText="※必須"
          placeholder="aa1234"
          shadow
          @onFocus="onFocus = 2"
          @onBlur="onFocus = 0"
          :error2="errors.field === 'password'"
        />
        <RMInput
          v-model="registerInfo.name"
          :class="['_register_input', { _input_active: onFocus === 3 }]"
          label="キャラネーム"
          type="text"
          requiredText="※必須"
          placeholder="characterName"
          shadow
          @onFocus="onFocus = 3"
          @onBlur="onFocus = 0"
          :error2="errors.field === 'name'"
        />
        <RMInput
          v-model="registerInfo.nameKana"
          :class="['_register_input', { _input_active: onFocus === 4 }]"
          label="キャラネーム（カタカナ）"
          type="text"
          requiredText="※必須"
          placeholder="キャラクターネーム"
          shadow
          @onFocus="onFocus = 4"
          @onBlur="onFocus = 0"
          :error2="errors.field === 'nameKana'"
        />
        <RMInput
          v-model="registerInfo.birthDateAt"
          :class="['_register_input', { _input_active: onFocus === 5 }]"
          label="誕生日"
          type="text"
          placeholder="20240101"
          :inputmode="'numeric'"
          maxlength="8"
          shadow
          @onFocus="onFocus = 5"
          @onBlur="onFocus = 0"
          :error2="errors.field === 'birthDateAt'"
        />
        <div class="_error_area" v-if="errors.message">
          {{ errors.message }}
        </div>
        <div class="_error_area" v-else></div>
        <div class="_to_login_area">
          <div
            class="_to_login"
            @click="
              () => {
                router.push({ name: 'RMPreLogin' })
              }
            "
          >
            ログイン画面へ
          </div>
        </div>
        <div class="_btn_area">
          <RMButton
            class="_select_btn"
            @click="registerConfirm"
            :button-shape="'ellipse'"
            :button-type="'standard'"
            label="登録確認"
            bgColor="linear-gradient(180deg, #C79BD2, #7B4D81)"
          />
          <RMButton
            class="_select_btn"
            @click="
              () => {
                registerInfo = defaultRegisterInfo()
              }
            "
            :button-shape="'ellipse'"
            :button-type="'standard'"
            label="キャンセル"
            bgColor="linear-gradient(180deg, #D3D3D3, #696969)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="sass" scoped>
// SP
._user_register_outer_container
  background: v-bind(bgImgPath)
  background-size: cover
  display: block
  overflow: scroll
  position: fixed
  left: 0
  right: 0
  bottom: 0
  top: 0
._user_register_inner_container
  padding: 10px
  width: 100%
._user_register_form
  height: 100%
  padding: 20px
  > div
    margin: 10px 0
._app_logo_area
  display: flex
  justify-content: center
  align-items: center
._error_area
  height: 20px
  font-size: 16px
  font-weight: bold
  color: #d20000
  text-align: center
._to_login_area
  display: flex
  justify-content: center
  align-items: center
  padding-top: 10px
  width: 100%
._to_login
  color: blue
  font-size: 20px
  text-decoration: underline
  cursor: pointer
  width: fit-content

._btn_area
  display: flex
  gap: 10px
  margin-bottom: 20px
._select_btn
  width: 100% !important
  height: 50px !important
  margin-top: 20px
  user-select: none
._input_active::v-deep(._standard_or_shadow_width)
  outline: 1px solid #707070
// PC
@media screen and (min-width: 768px)
  ._user_register_inner_container
    padding: 50px 400px
    position: fixed
    left: 0
    bottom: 40px
    width: 100%
  ._user_register_form
    height: 100%
    padding: 30px
    display: flex
    flex-direction: column
    justify-content: center
    align-items: center
    > div
      margin: 10px 0
  ._register_input
    width: 100%
  ._btn_area
    width: 100%
    display: flex
    gap: 10px
    margin-bottom: 20px
</style>
