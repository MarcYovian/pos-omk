<!-- components/ui/AppModal.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg' | 'full'
    persistent?: boolean
  }>(),
  {
    size: 'md',
    persistent: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const close = () => {
  if (!props.persistent) {
    emit('update:modelValue', false)
  }
}

const modalWidth = computed(() => {
  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'max-w-full m-4'
  }
  return widths[props.size]
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm"
        @click="close"
      ></div>

      <!-- Modal Content -->
      <div
        class="relative w-full bg-white rounded-2xl shadow-xl transition-all duration-300 transform scale-100 flex flex-col max-h-[90vh]"
        :class="modalWidth"
      >
        <!-- Header -->
        <div v-if="title || $slots.header" class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <slot name="header">
            <h3 class="text-lg font-bold text-slate-900">{{ title }}</h3>
          </slot>
          <button
            v-if="!persistent"
            @click="close"
            class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto flex-grow">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
