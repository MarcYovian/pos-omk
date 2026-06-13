// composables/useSessionDate.ts
import { ref, computed } from 'vue'

export const useSessionDate = () => {
  const todayDate = ref(getTodayJakarta())

  const formattedToday = computed(() => {
    return formatDateIndonesian(todayDate.value)
  })

  return {
    todayDate,
    formattedToday,
  }
}
