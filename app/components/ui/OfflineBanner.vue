<!-- components/ui/OfflineBanner.vue -->
<script setup lang="ts">
import { useNetworkStatus } from '~/composables/useNetworkStatus'

const { isOnline } = useNetworkStatus()
</script>

<template>
  <div
    v-if="!isOnline"
    class="sticky top-0 z-40 bg-danger text-white text-center py-2.5 px-4 font-semibold shadow-md flex items-center justify-center gap-2 text-sm"
  >
    <Icon name="heroicons:exclamation-triangle-solid" class="w-5 h-5 animate-pulse" />
    <span>Tidak ada koneksi. Mode offline aktif. Transaksi akan disimpan secara lokal.</span>
  </div>
</template>
