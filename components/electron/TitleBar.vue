<script setup lang="ts">
/**
 * Custom Electron titlebar component.
 * Replaces the system default titlebar in frameless window mode.
 * Left: app icon + name
 * Center: draggable area
 * Right: window controls (minimize, maximize/restore, close)
 */
import { websiteName } from '~/config';

const { isElectron, api } = useElectron();

const isMaximized = ref(false);

async function checkMaximized() {
  if (api.value) {
    isMaximized.value = await api.value.window.isMaximized();
  }
}

function minimize() {
  api.value?.window.minimize();
}

function toggleMaximize() {
  api.value?.window.maximize();
  isMaximized.value = !isMaximized.value;
}

function closeWindow() {
  api.value?.window.close();
}

onMounted(() => {
  checkMaximized();
});
</script>

<template>
  <div
    v-if="isElectron"
    class="flex items-center h-[32px] flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 select-none"
  >
    <!-- App icon & name -->
    <div class="flex items-center gap-1.5 pl-3 pr-2">
      <UIcon name="i-lucide:bookmark" class="size-4 text-blue-500" />
      <span class="text-xs font-medium text-slate-600 dark:text-slate-300">{{ websiteName }}</span>
    </div>

    <!-- Draggable spacer -->
    <div class="flex-1 h-full" style="-webkit-app-region: drag" />

    <!-- Window controls -->
    <div class="flex h-full" style="-webkit-app-region: no-drag">
      <button
        class="flex items-center justify-center w-[46px] h-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        title="最小化"
        @click="minimize"
      >
        <UIcon name="i-lucide:minus" class="size-3.5 text-slate-500" />
      </button>
      <button
        class="flex items-center justify-center w-[46px] h-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        :title="isMaximized ? '还原' : '最大化'"
        @click="toggleMaximize"
      >
        <UIcon
          :name="isMaximized ? 'i-lucide:copy' : 'i-lucide:square'"
          class="size-3.5 text-slate-500"
        />
      </button>
      <button
        class="flex items-center justify-center w-[46px] h-full hover:bg-red-500 hover:text-white transition-colors"
        title="关闭"
        @click="closeWindow"
      >
        <UIcon name="i-lucide:x" class="size-4 text-slate-500 hover:text-white" />
      </button>
    </div>
  </div>
</template>
