// 下载任务快照类型定义
// 用于断点续传，将下载状态持久化到 IndexedDB

declare interface DownloadSnapshot {
  // 唯一标识，格式: `${fakeid}:${type}:${timestamp}`
  id: string;

  // 下载类型
  type: DownloadType;

  // 公众号 fakeid
  fakeid: string;

  // 公众号昵称
  nickname: string;

  // 需要下载的全部 URL 列表
  totalUrls: string[];

  // 已完成下载的 URL 列表
  completedUrls: string[];

  // 下载失败的 URL 列表
  failedUrls: string[];

  // 已删除的 URL 列表
  deletedUrls: string[];

  // 下载选项
  options: Required<DownloadOptions>;

  // 创建时间（时间戳 ms）
  createdAt: number;

  // 最后更新时间（时间戳 ms）
  updatedAt: number;

  // 任务状态
  status: TaskStatus;
}

declare type TaskStatus = 'running' | 'paused' | 'completed' | 'interrupted';

// DownloadType 定义，与 Downloader.ts 中的类型保持一致
declare type DownloadType = 'html' | 'metadata' | 'comments' | 'fakeid';
