import { db } from './db';

/**
 * 保存下载任务快照
 * 如果 id 已存在则更新，否则新增
 */
export async function saveSnapshot(snapshot: DownloadSnapshot): Promise<void> {
  await db.taskSnapshot.put(snapshot);
}

/**
 * 加载指定 ID 的快照
 */
export async function loadSnapshot(id: string): Promise<DownloadSnapshot | undefined> {
  return db.taskSnapshot.get(id);
}

/**
 * 加载所有未完成的任务快照（running / paused / interrupted）
 */
export async function loadIncompleteSnapshots(): Promise<DownloadSnapshot[]> {
  return db.taskSnapshot
    .where('status')
    .anyOf(['running', 'paused', 'interrupted'])
    .toArray();
}

/**
 * 删除指定 ID 的快照
 */
export async function removeSnapshot(id: string): Promise<void> {
  await db.taskSnapshot.delete(id);
}

/**
 * 更新快照的部分字段
 */
export async function updateSnapshot(id: string, data: Partial<DownloadSnapshot>): Promise<void> {
  await db.taskSnapshot.update(id, {
    ...data,
    updatedAt: Date.now(),
  });
}

/**
 * 清理已完成的旧快照
 * @param daysOld 保留最近多少天的已完成快照，默认 7 天
 * @returns 清理的快照数量
 */
export async function cleanCompletedSnapshots(daysOld: number = 7): Promise<number> {
  const threshold = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const oldCompleted = await db.taskSnapshot
    .where('status')
    .equals('completed')
    .filter((snapshot) => snapshot.updatedAt < threshold)
    .toArray();

  if (oldCompleted.length === 0) {
    return 0;
  }

  await db.taskSnapshot.bulkDelete(oldCompleted.map((s) => s.id));
  return oldCompleted.length;
}

/**
 * 清理中断的旧快照
 * @param daysOld 保留最近多少天的中断快照，默认 30 天
 * @returns 清理的快照数量
 */
export async function cleanInterruptedSnapshots(daysOld: number = 30): Promise<number> {
  const threshold = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  const oldInterrupted = await db.taskSnapshot
    .where('status')
    .equals('interrupted')
    .filter((snapshot) => snapshot.updatedAt < threshold)
    .toArray();

  if (oldInterrupted.length === 0) {
    return 0;
  }

  await db.taskSnapshot.bulkDelete(oldInterrupted.map((s) => s.id));
  return oldInterrupted.length;
}

/**
 * 获取指定 fakeid 的所有快照
 */
export async function loadSnapshotsByFakeid(fakeid: string): Promise<DownloadSnapshot[]> {
  return db.taskSnapshot.where('fakeid').equals(fakeid).toArray();
}
