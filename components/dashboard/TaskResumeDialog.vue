<script setup lang="ts">
import { formatDistance } from 'date-fns';
import { removeSnapshot } from '~/store/v2/task-snapshot';

const props = defineProps<{
  tasks: DownloadSnapshot[];
}>();

const emit = defineEmits<{
  (e: 'resume', snapshot: DownloadSnapshot): void;
  (e: 'ignore-all'): void;
}>();

const modal = useModal();

const typeLabel: Record<string, string> = {
  html: '文章内容',
  metadata: '阅读量',
  comments: '留言内容',
  fakeid: '修复fakeid',
};

const statusLabel: Record<string, string> = {
  running: '运行中',
  paused: '已暂停',
  interrupted: '已中断',
  completed: '已完成',
};

const statusColor: Record<string, string> = {
  running: 'text-blue-500',
  paused: 'text-yellow-500',
  interrupted: 'text-red-500',
  completed: 'text-green-500',
};

function formatTime(timestamp: number): string {
  return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
}

function getProgress(snapshot: DownloadSnapshot): number {
  if (snapshot.totalUrls.length === 0) return 0;
  const done = snapshot.completedUrls.length + snapshot.deletedUrls.length;
  return Math.round((done / snapshot.totalUrls.length) * 100);
}

async function ignoreTask(id: string) {
  await removeSnapshot(id);
  const idx = props.tasks.findIndex((t) => t.id === id);
  if (idx > -1) {
    props.tasks.splice(idx, 1);
  }
  if (props.tasks.length === 0) {
    modal.close();
  }
}

function resumeTask(snapshot: DownloadSnapshot) {
  emit('resume', snapshot);
  modal.close();
}

function ignoreAll() {
  emit('ignore-all');
  modal.close();
}
</script>

<template>
  <UModal prevent-close>
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-solid:arrow-path" class="size-6 text-blue-500" />
          <span class="font-medium text-lg">发现未完成的下载任务</span>
        </div>
      </template>

      <div class="space-y-3 max-h-96 overflow-y-auto">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ task.nickname || task.fakeid }}</span>
              <UBadge variant="subtle" size="xs">{{ typeLabel[task.type] || task.type }}</UBadge>
              <span :class="['text-xs', statusColor[task.status]]">{{ statusLabel[task.status] }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ formatTime(task.createdAt) }}</span>
          </div>

          <div class="flex items-center gap-4 text-sm text-gray-500 mb-2">
            <span>共 {{ task.totalUrls.length }} 篇</span>
            <span>已完成 {{ task.completedUrls.length }} 篇</span>
            <span v-if="task.failedUrls.length > 0" class="text-red-400">失败 {{ task.failedUrls.length }} 篇</span>
            <span v-if="task.deletedUrls.length > 0" class="text-gray-400">已删 {{ task.deletedUrls.length }} 篇</span>
          </div>

          <!-- 进度条 -->
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
            <div
              class="bg-blue-500 h-1.5 rounded-full transition-all"
              :style="{ width: getProgress(task) + '%' }"
            />
          </div>

          <div class="flex items-center justify-end gap-2">
            <UButton size="xs" variant="ghost" color="gray" @click="ignoreTask(task.id)">忽略</UButton>
            <UButton size="xs" color="blue" @click="resumeTask(task)">恢复下载</UButton>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <UButton color="gray" variant="ghost" @click="ignoreAll">全部忽略</UButton>
          <UButton color="gray" @click="modal.close()">稍后处理</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
