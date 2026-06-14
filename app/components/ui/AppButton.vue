<!-- components/ui/AppButton.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    fullWidth: false
  }
)

const buttonClasses = computed(() => {
  const base = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
  
  const variants = {
    primary: 'bg-brand-900 text-white hover:bg-brand-700 focus:ring-brand-500',
    secondary: 'bg-brand-100 text-brand-900 hover:bg-brand-200 focus:ring-brand-500',
    danger: 'bg-danger text-white hover:bg-red-700 focus:ring-danger',
    ghost: 'bg-transparent text-brand-600 hover:bg-brand-50 focus:ring-brand-500'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs', // matches the default styling requested (text-xs px-3.5 py-2)
    lg: 'px-5 py-2.5 text-sm'
  }

  return [
    base,
    variants[props.variant],
    sizes[props.size],
    props.fullWidth ? 'w-full' : '',
  ].join(' ')
})
</script>

<template>
  <button
    :disabled="disabled || loading"
    :class="buttonClasses"
    class="relative"
  >
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <svg class="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>
    <span :class="{ 'opacity-0': loading }">
      <slot />
    </span>
  </button>
</template>
