<!-- components/ui/AppToast.vue -->
<script setup lang="ts">
import { useToast } from '~/composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-sm w-full">
      <TransitionGroup
        enter-active-class="transform ease-out duration-300 transition"
        enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
        enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-start p-4 rounded-xl shadow-lg border text-sm"
          :class="{
            'bg-green-50 border-green-200 text-green-800': toast.type === 'success',
            'bg-amber-50 border-amber-200 text-amber-800': toast.type === 'warning',
            'bg-red-50 border-red-200 text-red-800': toast.type === 'danger'
          }"
        >
          <!-- Icons -->
          <div class="flex-shrink-0 mr-3">
            <Icon
              v-if="toast.type === 'success'"
              name="heroicons:check-circle-solid"
              class="w-5 h-5 text-success"
            />
            <Icon
              v-else-if="toast.type === 'warning'"
              name="heroicons:exclamation-triangle-solid"
              class="w-5 h-5 text-warning"
            />
            <Icon
              v-else
              name="heroicons:x-circle-solid"
              class="w-5 h-5 text-danger"
            />
          </div>

          <!-- Message -->
          <div class="flex-grow font-medium">
            {{ toast.message }}
          </div>

          <!-- Close -->
          <button
            @click="removeToast(toast.id)"
            class="flex-shrink-0 ml-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
