import { ref } from 'vue'

const registerInfo = ref({
  email: '',
  password: '',
  name: '',
  nameKana: '',
  birthDateAt: '',
})

const defaultRegisterInfo = () => ({
  email: '',
  password: '',
  name: '',
  nameKana: '',
  birthDateAt: '',
})

export const globalRegisterForm = () => ({
  registerInfo,
  defaultRegisterInfo,
})
