<template>
  <div :class="isDev ? 'debug-screens' : ''" class="flex flex-col h-screen">
    <!-- Electron custom titlebar drag area -->
    <div v-if="isElectron" class="electron-titlebar" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <UNotifications />
    <UModals />
  </div>
</template>

<script setup lang="ts">
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise';
import { isDev } from '~/config';
import { isChromeBrowser } from '~/utils';

const runtimeConfig = useRuntimeConfig();
const isElectron = computed(() => !!window.electronAPI);

ModuleRegistry.registerModules([AllEnterpriseModule]);
LicenseManager.setLicenseKey(runtimeConfig.public.aggridLicense);

if (!isElectron.value && !isChromeBrowser()) {
  alert('为了更好的用户体验，推荐使用 Chrome 浏览器。');
}
</script>

<style>
@import 'style.css';

.electron-titlebar {
  height: 32px;
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
}
</style>
