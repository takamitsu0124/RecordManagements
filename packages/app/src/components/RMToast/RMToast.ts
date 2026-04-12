import { ref } from 'vue'
import ToastEventBus from 'primevue/toasteventbus'

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
  const life = (payload.toastMovingTime ?? 7) * 1000
  const severity =
    payload.isCheckCircle === false
      ? 'error'
      : payload.toastColor === '#64748b'
        ? 'secondary'
        : 'success'

  ToastEventBus.emit('add', {
    severity,
    summary: payload.toastTitle,
    life,
    group: payload.toastFromTop ? 'app-top' : 'app-bottom',
  })

  return new Promise((resolve) => {
    setTimeout(() => {
      currentIndexNum.value--
      resolve()
    }, life)
  })
}
