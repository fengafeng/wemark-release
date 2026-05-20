<script setup lang="ts">
/**
 * Generic empty state component.
 * Displays a centered icon, title, optional description, and optional action slot.
 */

withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
  }>(),
  {
    icon: 'i-lucide:inbox',
    description: '',
  },
);
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4">
    <UIcon :name="icon" class="size-16 text-slate-300 dark:text-slate-600 mb-4" />
    <h3 class="text-lg font-medium text-slate-400 dark:text-slate-500 mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-slate-400 dark:text-slate-500 text-center max-w-sm">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
