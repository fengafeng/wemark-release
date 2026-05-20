<script setup lang="ts">
/**
 * Enhanced progress overlay component.
 * Shows a full-screen semi-transparent overlay with a centered progress card.
 * Displays current phase, progress bar, counts, and estimated remaining time.
 */

withDefaults(
  defineProps<{
    visible: boolean;
    phase: string;
    completed: number;
    total: number;
    estimatedTime?: string;
  }>(),
  {
    estimatedTime: '',
  },
);
</script>

<template>
  <UModal :model-value="visible" prevent-close>
    <UCard>
      <div class="space-y-4 min-w-[360px]">
        <!-- Phase label -->
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide:loader" class="size-5 text-blue-500 animate-spin" />
          <span class="font-medium text-sm">{{ phase }}</span>
        </div>

        <!-- Progress bar -->
        <UProgress :value="total > 0 ? Math.round((completed / total) * 100) : 0" />

        <!-- Stats row -->
        <div class="flex items-center justify-between text-sm text-slate-500">
          <span>已完成 {{ completed }} / {{ total }}</span>
          <span v-if="estimatedTime" class="text-xs">预计剩余: {{ estimatedTime }}</span>
        </div>
      </div>
    </UCard>
  </UModal>
</template>
