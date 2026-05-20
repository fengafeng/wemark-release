<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">设置</h1>
    </Teleport>

    <div class="h-full overflow-scroll">
      <SettingProxy />
      <div class="flex flex-wrap">
        <SettingExport />
        <SettingMisc />
      </div>
      <!-- 安全与更新设置 -->
      <div class="mx-4 mt-10">
        <UCard>
          <template #header>
            <h3 class="text-2xl font-semibold">安全与更新</h3>
          </template>

          <div class="space-y-4">
            <!-- Encryption status -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">加密存储</p>
                <p class="text-xs text-slate-500">
                  {{ isElectron ? '已启用 AES-256-GCM 加密，凭证数据受机器密钥保护' : '当前使用本地存储，建议使用桌面版获取加密保护' }}
                </p>
              </div>
              <UBadge :color="isElectron ? 'green' : 'amber'" variant="subtle" size="sm">
                {{ isElectron ? '已启用' : '未启用' }}
              </UBadge>
            </div>

            <!-- Auto update toggle (Electron only) -->
            <div v-if="isElectron" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">自动更新</p>
                <p class="text-xs text-slate-500">检测到新版本时自动下载更新</p>
              </div>
              <UToggle v-model="autoUpdateEnabled" />
            </div>

            <!-- Manual check update (Electron only) -->
            <div v-if="isElectron" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium">检查更新</p>
                <p class="text-xs text-slate-500">手动检查是否有可用的新版本</p>
              </div>
              <UButton size="sm" variant="outline" :loading="checkingUpdate" @click="checkForUpdates">
                {{ checkingUpdate ? '检查中...' : '立即检查' }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
      <div class="h-[30vh]"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';

useHead({
  title: `设置 | ${websiteName}`,
});

const { isElectron, api } = useElectron();

const autoUpdateEnabled = ref(true);
const checkingUpdate = ref(false);

async function checkForUpdates() {
  if (!api.value) return;
  checkingUpdate.value = true;
  try {
    await api.value.updater.checkForUpdates();
  } catch (error) {
    console.error('[Settings] Check update failed:', error);
  } finally {
    // Keep the loading state for at least 1 second for visual feedback
    setTimeout(() => {
      checkingUpdate.value = false;
    }, 1000);
  }
}
</script>
