import { ref, computed } from 'vue'

export interface Toast {
  id: string
  title: string
  description?: string
  color?: 'success' | 'warning' | 'error' | 'info'
  timeout?: number
}

const toasts = ref<Toast[]>([])

export function useToast() {
  const add = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      timeout: 5000,
      ...toast
    }
    toasts.value.push(newToast)

    if (newToast.timeout) {
      setTimeout(() => {
        remove(id)
      }, newToast.timeout)
    }

    return id
  }

  const remove = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clear = () => {
    toasts.value = []
  }

  return {
    add,
    remove,
    clear,
    toasts: computed(() => toasts.value)
  }
}
