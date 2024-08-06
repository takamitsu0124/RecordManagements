import { createApp, h, ref, Component } from 'vue'
import RMPopupFun from './RMPopupFun.vue'

export type PopupColorKinds = 'primary' | 'black' | 'gray' | 'white' | 'red'
export const isBlur = ref(false)
export function usePopupFun(payload: {
  question?: string
  supplement?: string
  rightText?: string
  leftText?: string
  rightColor?: PopupColorKinds
  leftColor?: PopupColorKinds
  subjectNum?: number
  onLeftButtonClick?: () => void
  onRightButtonClick?: () => void
  originalComponent?: Component
  originalComponentProps?: Record<
    string,
    string | object | boolean | Date | number
  >
}) {
  isBlur.value = true

  const componentVNode = h(
    payload?.originalComponent ? payload?.originalComponent : RMPopupFun,
    {
      question: payload?.question ?? '',
      supplement: payload?.supplement ?? '',
      rightText: payload?.rightText ?? '',
      leftText: payload?.leftText ?? '',
      rightColor: payload?.rightColor,
      leftColor: payload?.leftColor,
      subjectNum: payload?.subjectNum ?? 1,
      ...payload?.originalComponentProps,
      onLeftButtonClick: () => {
        if (payload.onLeftButtonClick) payload.onLeftButtonClick()
        unmount()
      },
      onRightButtonClick: () => {
        if (payload.onRightButtonClick) payload.onRightButtonClick()
        unmount()
      },
    }
  )
  const unmount = () => {
    // transitionの時間を待ってからunmountする
    return setTimeout(() => {
      app.unmount()
      container.remove()
      isBlur.value = false
    }, 500)
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp({
    setup() {
      return () => componentVNode
    },
  })
  app.mount(container)
  return { componentVNode, unmount }
}
