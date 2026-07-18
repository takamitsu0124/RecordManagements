import RMSpinner from './RMSpinner.vue'
import { h, createApp } from 'vue'

export const useSpinner = async <T>(f: () => Promise<T>) => {
  const componentVNode = h(RMSpinner)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(componentVNode)
  app.mount(container)

  try {
    const result = await f()
    return result
  } finally {
    app.unmount()
  }
}
