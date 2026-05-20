<script setup lang="ts">
/**
 * Account card component for the multi-account management page.
 * Displays avatar, nickname, status, expiry, and action buttons.
 */
import { formatDistance } from 'date-fns';
import { IMAGE_PROXY } from '~/config';
import type { AccountProfile } from '~/composables/useMultiAccount';

const props = defineProps<{
  account: AccountProfile;
}>();

const emit = defineEmits<{
  (e: 'switch', id: string): void;
  (e: 'logout', id: string): void;
}>();

const isExpired = computed(() => {
  return new Date(props.account.expiresAt) <= new Date();
});

const expiresIn = computed(() => {
  if (isExpired.value) return '已过期';
  return formatDistance(new Date(props.account.expiresAt), new Date(), { addSuffix: true });
});

const loginTime = computed(() => {
  return formatDistance(new Date(props.account.loginAt), new Date(), { addSuffix: true });
});
</script>

<template>
  <UCard
    class="transition-all cursor-pointer"
    :class="[
      account.isActive
        ? 'ring-2 ring-green-400 dark:ring-green-500 shadow-md'
        : 'hover:shadow-md hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600',
      isExpired ? 'opacity-70' : '',
    ]"
    @click="emit('switch', account.id)"
  >
    <div class="flex items-start gap-3">
      <!-- Avatar -->
      <img
        v-if="account.avatar"
        :src="IMAGE_PROXY + account.avatar"
        alt=""
        class="rounded-full size-12 ring-2 flex-shrink-0"
        :class="account.isActive ? 'ring-green-400' : 'ring-slate-200 dark:ring-slate-600'"
      />
      <div
        v-else
        class="rounded-full size-12 bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"
      >
        <UIcon name="i-lucide:user" class="size-6 text-slate-400" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm truncate">{{ account.nickname || '未知用户' }}</span>
          <UBadge v-if="account.isActive" variant="subtle" color="green" size="xs">活跃</UBadge>
          <UBadge v-if="isExpired" variant="subtle" color="red" size="xs">已过期</UBadge>
        </div>
        <p class="text-xs text-slate-500 mt-1">过期: {{ expiresIn }}</p>
        <p class="text-xs text-slate-400">登录: {{ loginTime }}</p>
      </div>

      <!-- Logout button -->
      <UTooltip text="登出此账号">
        <UButton
          variant="ghost"
          size="2xs"
          icon="i-lucide:log-out"
          color="gray"
          class="flex-shrink-0 hover:text-red-500"
          @click.stop="emit('logout', account.id)"
        />
      </UTooltip>
    </div>
  </UCard>
</template>
