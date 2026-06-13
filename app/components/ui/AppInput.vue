<!-- components/ui/AppInput.vue -->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    label?: string
    placeholder?: string
    type?: 'text' | 'number' | 'email' | 'password' | 'tel'
    error?: string
    hint?: string
    inputMode?: 'numeric' | 'decimal' | 'text'
    required?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'text',
    required: false,
    disabled: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col w-full gap-1">
    <label v-if="label" class="text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-danger">*</span>
    </label>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :inputmode="inputMode"
      :disabled="disabled"
      :required="required"
      @input="handleInput"
      class="w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:cursor-not-allowed min-h-[48px] min-w-[48px] border-slate-300"
      :class="{ 'border-danger focus:ring-danger': error }"
    />
    <p v-if="error" class="text-xs text-danger font-medium mt-0.5">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-slate-500 mt-0.5">{{ hint }}</p>
  </div>
</template>
