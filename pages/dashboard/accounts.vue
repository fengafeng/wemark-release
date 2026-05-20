<script setup lang="ts">
/**
 * Multi-account management page.
 * Displays a grid of account cards with stats and add/logout actions.
 */
import AccountCard from '~/components/dashboard/AccountCard.vue';
import EmptyState from '~/components/common/EmptyState.vue';
import LoginModal from '~/components/modal/Login.vue';
import { websiteName } from '~/config';

useHead({
  title: `账号管理 | ${websiteName}`,
});

const { accounts, activeAccount, activeCount, removeAccount, switchAccount, init } = useMultiAccount();
const modal = useModal();
const initialized = ref(false);

onMounted(async () => {
  await init();
  initialized.value = true;
});

const totalCount = computed(() => accounts.value.length);

function openLogin() {
  modal.open(LoginModal);
}

async function handleLogout(id: string) {
  await removeAccount(id);
}

async function handleSwitch(id: string) {
  await switchAccount(id);
}
</script>

<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">账号管理</h1>
    </Teleport>

    <div v-if="initialized" class="h-full overflow-scroll">
      <!-- Stats bar -->
      <div v-if="totalCount > 0" class="flex items-center gap-4 mb-6 px-4">
        <div class="wemark-card flex items-center gap-2">
          <UIcon name="i-lucide:users" class="size-5 text-blue-500" />
          <span class="text-sm text-slate-600 dark:text-slate-300">总账号: <strong>{{ totalCount }}</strong></span>
        </div>
        <div class="wemark-card flex items-center gap-2">
          <UIcon name="i-lucide:check-circle" class="size-5 text-green-500" />
          <span class="text-sm text-slate-600 dark:text-slate-300">活跃: <strong>{{ activeCount }}</strong></span>
        </div>
        <div class="flex-1" />
        <UButton icon="i-lucide:plus" size="sm" @click="openLogin">添加账号</UButton>
      </div>

      <!-- Account cards grid -->
      <div
        v-if="totalCount > 0"
        class="grid gap-4 px-4 pb-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <AccountCard
          v-for="account in accounts"
          :key="account.id"
          :account="account"
          @switch="handleSwitch"
          @logout="handleLogout"
        />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        icon="i-lucide:user-plus"
        title="暂无登录账号"
        description="扫码登录微信公众号后，账号将出现在这里"
      >
        <UButton icon="i-lucide:plus" @click="openLogin">扫码登录新账号</UButton>
      </EmptyState>

      <!-- Bottom add button when accounts exist -->
      <div v-if="totalCount > 0" class="px-4 pb-8 mt-4">
        <UButton variant="outline" icon="i-lucide:plus" size="sm" @click="openLogin">
          添加新账号
        </UButton>
      </div>

      <div class="h-[20vh]" />
    </div>

    <!-- Loading state -->
    <div v-else class="flex items-center justify-center h-64">
      <UIcon name="i-lucide:loader" class="size-8 text-blue-500 animate-spin" />
    </div>
  </div>
</template>
