import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@rm/db'
import { Router } from 'vue-router'
import { boot } from 'quasar/wrappers'
import { ref } from 'vue'

export const globalPrePath = ref<string>('')

const checkRouter = (router: Router) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // userがある場合
      router.push({ name: 'RMHome' })
    } else {
      // userがない場合
      // router.push({ name: 'RMPreLogin' }) 完成までコメントアウト
    }
  })
}

export default boot(async ({ router }) => {
  checkRouter(router)
  router.beforeEach((to, from, next) => {
    // 前のpathを記録
    globalPrePath.value = from.path
    next()
  })
})
