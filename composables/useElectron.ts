/**
 * Composable for detecting Electron environment and accessing the IPC bridge.
 *
 * Provides a safe way for renderer code to check if it's running inside
 * Electron and to access the `window.electronAPI` with proper typing.
 */
export function useElectron() {
  const isElectron = computed(() => {
    return typeof window !== 'undefined' && !!window.electronAPI;
  });

  const api = computed(() => {
    if (!isElectron.value) {
      return null;
    }
    return window.electronAPI!;
  });

  /**
   * Call an IPC method safely. Returns null if not in Electron.
   */
  function callApi<K extends keyof ElectronAPI>(
    method: K,
    ...args: unknown[]
  ): Promise<unknown> | null {
    if (!api.value) return null;
    const fn = api.value[method];
    if (typeof fn === 'function') {
      return (fn as (...args: unknown[]) => Promise<unknown>)(...args);
    }
    return null;
  }

  return {
    isElectron,
    api,
    callApi,
  };
}
