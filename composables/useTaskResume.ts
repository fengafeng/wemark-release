import { loadIncompleteSnapshots, removeSnapshot, cleanCompletedSnapshots } from '~/store/v2/task-snapshot';

/**
 * 断点续传恢复 composable
 * 检测未完成的下载任务，提供恢复/删除快照的能力
 */
export function useTaskResume() {
  const isResuming = ref(false);
  const incompleteTasks = ref<DownloadSnapshot[]>([]);
  const showDialog = ref(false);

  /**
   * 检查未完成的任务快照
   * 返回所有 running / paused / interrupted 状态的快照
   */
  async function checkIncompleteTasks(): Promise<DownloadSnapshot[]> {
    try {
      const snapshots = await loadIncompleteSnapshots();
      incompleteTasks.value = snapshots;
      if (snapshots.length > 0) {
        showDialog.value = true;
      }
      return snapshots;
    } catch (error) {
      console.error('检查未完成任务失败:', error);
      return [];
    }
  }

  /**
   * 删除指定快照
   */
  async function deleteSnapshot(id: string): Promise<void> {
    try {
      await removeSnapshot(id);
      incompleteTasks.value = incompleteTasks.value.filter((s) => s.id !== id);
      if (incompleteTasks.value.length === 0) {
        showDialog.value = false;
      }
    } catch (error) {
      console.error('删除快照失败:', error);
    }
  }

  /**
   * 删除所有未完成的快照
   */
  async function deleteAllSnapshots(): Promise<void> {
    try {
      const ids = incompleteTasks.value.map((s) => s.id);
      for (const id of ids) {
        await removeSnapshot(id);
      }
      incompleteTasks.value = [];
      showDialog.value = false;
    } catch (error) {
      console.error('删除所有快照失败:', error);
    }
  }

  /**
   * 恢复指定快照的下载任务
   * 返回快照数据供 useDownloader 使用
   */
  function resumeTask(snapshot: DownloadSnapshot): DownloadSnapshot {
    isResuming.value = true;
    showDialog.value = false;
    return snapshot;
  }

  /**
   * 清理已完成的旧快照（7天前）
   */
  async function cleanupOldSnapshots(): Promise<number> {
    try {
      return await cleanCompletedSnapshots(7);
    } catch (error) {
      console.error('清理旧快照失败:', error);
      return 0;
    }
  }

  /**
   * 关闭对话框（不删除快照）
   */
  function dismissDialog(): void {
    showDialog.value = false;
  }

  onMounted(() => {
    checkIncompleteTasks();
  });

  return {
    isResuming,
    incompleteTasks,
    showDialog,
    checkIncompleteTasks,
    resumeTask,
    deleteSnapshot,
    deleteAllSnapshots,
    cleanupOldSnapshots,
    dismissDialog,
  };
}
