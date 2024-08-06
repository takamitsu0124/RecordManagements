import { createApp, h, ref } from 'vue'
import RMToast from './RMToast.vue'

export const currentIndexNum = ref(0)

/**
 * トーストを表示する関数
 * @param payload toastTitle: string, toastMovingTime?: number, fromTopHeight: string
 */
export function useToast(payload: {
  toastTitle: string
  toastMovingTime?: number
  fromTopHeight?: string
  toastFromTop?: boolean
  toastColor?: string
  isCheckCircle?: boolean
}): Promise<void> {
  currentIndexNum.value++
  const componentVNode = h(RMToast, {
    toastText: payload.toastTitle,
    toastMovingTime: payload?.toastMovingTime ?? 7,
    fromTopHeight: payload?.fromTopHeight ?? '120px',
    toastFromTop: payload?.toastFromTop ?? false,
    toastColor: payload?.toastColor ?? '#3BD4F0',
    isCheckCircle: payload?.isCheckCircle ?? true,
  })

  const container = document.createElement('div')
  const app = createApp(componentVNode)

  app.mount(container)
  return new Promise((resolve) => {
    setTimeout(() => {
      app.unmount()
      container.remove()
      currentIndexNum.value--
      resolve()
    }, (payload.toastMovingTime ?? 7) * 1000 * 2)
  })
}
