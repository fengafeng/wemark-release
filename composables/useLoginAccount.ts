import { StorageSerializers } from '@vueuse/core';
import type { LoginAccount } from '~/types/types';

/**
 * Original useLoginAccount composable — kept for backward compatibility.
 * Stores the current active login account in localStorage.
 */
export default () => {
  return useLocalStorage<LoginAccount>('login', null, {
    serializer: StorageSerializers.object,
  });
};

/**
 * Enhanced login account manager that bridges single-account useLoginAccount
 * with the multi-account system (useMultiAccount).
 *
 * Provides addAccount / removeAccount / switchAccount / accounts / activeAccount,
 * and keeps the legacy useLoginAccount ref in sync.
 */
export function useLoginAccountManager() {
  const loginAccount = useLoginAccount();
  const multi = useMultiAccount();

  /**
   * Add a new account after a successful login.
   * Updates both the multi-account list and the legacy loginAccount ref.
   */
  async function addAccountFromLogin(authKey: string, account: LoginAccount): Promise<void> {
    await multi.addAccount({
      authKey,
      nickname: account.nickname,
      avatar: account.avatar,
      loginAt: Date.now(),
      expiresAt: account.expires,
    });
    // Sync legacy ref
    loginAccount.value = account;
  }

  /**
   * Remove an account and sync the legacy ref.
   */
  async function removeAccount(id: string): Promise<void> {
    await multi.removeAccount(id);
  }

  /**
   * Switch the active account and sync the legacy ref.
   */
  async function switchAccount(id: string): Promise<void> {
    await multi.switchAccount(id);
  }

  /**
   * Initialize the multi-account system.
   * Call once on app startup.
   */
  async function init(): Promise<void> {
    await multi.init();
  }

  return {
    accounts: multi.accounts,
    activeAccount: multi.activeAccount,
    activeCount: multi.activeCount,
    addAccount: addAccountFromLogin,
    removeAccount,
    switchAccount,
    init,
  };
}
