import { useToast } from 'src/components/RMToast/RMToast'

export const notifySuccess = (message: string) =>
  useToast({
    toastTitle: message,
    toastMovingTime: 3,
    toastColor: '#3bd4f0',
    isCheckCircle: true
  })

export const notifyError = (message: string) =>
  useToast({
    toastTitle: message,
    toastMovingTime: 4,
    toastColor: '#ef4444',
    isCheckCircle: false
  })

export const notifyInfo = (message: string) =>
  useToast({
    toastTitle: message,
    toastMovingTime: 3,
    toastColor: '#64748b',
    isCheckCircle: true
  })
