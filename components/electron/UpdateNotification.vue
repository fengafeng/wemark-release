<script setup lang="ts">
/**
 * Auto-update notification component for Electron.
 * Shows update availability, download progress, and install prompt.
 * Only renders in Electron environment.
 */
import type { UpdateInfo } from '~/types/electron';

const { isElectron, api } = useElectron();

const updateAvailable = ref(false);
const updateInfo = ref<UpdateInfo | null>(null);
const downloading = ref(false);
const downloadProgress = ref(0);
const downloaded = ref(false);
const dismissed = ref(false);

const visible = computed(() => {
  return isElectron.value && updateAvailable.value && !dismissed.value;
});

function dismiss() {
  dismissed.value = true;
}

async function downloadUpdate() {
  if (!api.value) return;
  downloading.value = true;
  try {
    await api.value.updater.downloadUpdate();
  } catch (error) {
    console.error('[UpdateNotification] Download failed:', error);
    downloading.value = false;
  }
}

async function quitAndInstall() {
  if (!api.value) return;
  api.value.updater.quitAndInstall();
}

async function checkForUpdates() {
  if (!api.value) return;
  try {
    await api.value.updater.checkForUpdates();
  } catch (error) {
    console.error('[UpdateNotification] Check failed:', error);
  }
}

onMounted(() => {
  if (!api.value) return;

  // Listen for update available
  const unsubAvailable = api.value.updater.onUpdateAvailable((info: UpdateInfo) => {
    updateInfo.value = info;
    updateAvailable.value = true;
    dismissed.value = false;
  });

  // Listen for download progress
  const unsubProgress = api.value.updater.onDownloadProgress((progress) => {
    downloadProgress.value = progress.percent;
  });

  // Listen for update downloaded
  const unsubDownloaded = api.value.updater.onUpdateDownloaded(() => {
    downloading.value = false;
    downloaded.value = true;
  });

  // Auto-check on mount
  checkForUpdates();

  onUnmounted(() => {
    unsubAvailable();
    unsubProgress();
    unsubDownloaded();
  });
});
</script>

<template>
  <div v-if="visible" class="fixed bottom-4 right-4 z-50 w-80">
    <UCard>
      <div class="space-y-3">
        <!-- Header -->
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide:download" class="size-5 text-blue-500" />
            <span class="font-semibold text-sm">发现新版本</span>
          </div>
          <UButton variant="ghost" size="2xs" icon="i-lucide:x" @click="dismiss" />
        </div>

        <!-- Version info -->
        <div v-if="updateInfo" class="text-sm text-slate-600 dark:text-slate-300">
          <p>新版本: <span class="font-mono font-medium">v{{ updateInfo.version }}</span></p>
          <p v-if="updateInfo.releaseNotes" class="mt-1 text-xs text-slate-500 line-clamp-2">
            {{ updateInfo.releaseNotes }}
          </p>
        </div>

        <!-- Download progress -->
        <div v-if="downloading">
          <UProgress :value="downloadProgress" class="mb-1" />
          <p class="text-xs text-slate-400 text-right">{{ Math.round(downloadProgress) }}%</p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <template v-if="downloaded">
            <UButton size="sm" color="green" class="flex-1" @click="quitAndInstall">
              重启安装
            </UButton>
          </template>
          <template v-else-if="!downloading">
            <UButton size="sm" color="blue" class="flex-1" @click="downloadUpdate">
              立即更新
            </UButton>
            <UButton size="sm" variant="ghost" color="gray" @click="dismiss">
              稍后提醒
            </UButton>
          </template>
        </div>
      </div>
    </UCard>
  </div>
</template>
