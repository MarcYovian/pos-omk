// composables/useToast.ts
import { ref } from 'vue'

export interface ToastMessage {
  id: number
  type: 'success' | 'warning' | 'danger'
  message: string
}

const toasts = ref<ToastMessage[]>([])
let toastIdCounter = 0

export const useToast = () => {
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = ++toastIdCounter
    const newToast = { id, ...toast }
    toasts.value.push(newToast)

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    addToast,
    removeToast,
  }
}
