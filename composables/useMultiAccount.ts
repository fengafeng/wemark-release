/**
 * Multi-account management composable.
 *
 * Manages a list of AccountProfile objects stored in the secure store.
 * Supports adding, removing, switching, and migrating accounts.
 * Uses useSecureStore for encrypted storage (Electron) or localStorage (Web).
 */

export interface AccountProfile {
  /** Unique identifier (hash of authKey) */
  id: string;
  /** Server-side authentication key */
  authKey: string;
  /** Display nickname */
  nickname: string;
  /** Avatar URL */
  avatar: string;
  /** Login timestamp (ms) */
  loginAt: number;
  /** Expiry time ISO string */
  expiresAt: string;
  /** Whether this is the currently active account */
  isActive: boolean;
}

const ACCOUNTS_KEY = 'accounts';

/**
 * Generate a simple hash-based ID from an authKey.
 * Falls back to nickname+timestamp when authKey is empty.
 */
function generateId(authKey: string, fallback?: string): string {
  const source = authKey || fallback || Date.now().toString();
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function useMultiAccount() {
  const { getSecure, setSecure } = useSecureStore();
  const loginAccount = useLoginAccount();

  const accounts = ref<AccountProfile[]>([]);
  const loaded = ref(false);

  /** The currently active account */
  const activeAccount = computed(() => {
    return accounts.value.find((a) => a.isActive) ?? null;
  });

  /** Number of active (non-expired) accounts */
  const activeCount = computed(() => {
    const now = new Date();
    return accounts.value.filter((a) => new Date(a.expiresAt) > now).length;
  });

  /**
   * Load accounts from secure storage.
   */
  async function loadAccounts(): Promise<void> {
    if (loaded.value) return;
    const stored = await getSecure<AccountProfile[]>(ACCOUNTS_KEY);
    if (stored) {
      accounts.value = stored;
    }
    loaded.value = true;
  }

  /**
   * Persist accounts to secure storage.
   */
  async function saveAccounts(): Promise<void> {
    await setSecure(ACCOUNTS_KEY, accounts.value);
  }

  /**
   * Add a new account to the list.
   * If this is the first account or the current active account is expired,
   * the new account becomes active.
   */
  async function addAccount(profile: Omit<AccountProfile, 'id' | 'isActive'>): Promise<AccountProfile> {
    const id = generateId(profile.authKey, profile.nickname);
    const existing = accounts.value.find((a) => a.id === id);
    if (existing) {
      // Update existing account
      Object.assign(existing, {
        nickname: profile.nickname,
        avatar: profile.avatar,
        loginAt: profile.loginAt,
        expiresAt: profile.expiresAt,
        authKey: profile.authKey,
      });
      await saveAccounts();
      return existing;
    }

    const shouldActivate = accounts.value.length === 0 || !activeAccount.value;
    const newAccount: AccountProfile = {
      ...profile,
      id,
      isActive: shouldActivate,
    };

    if (shouldActivate) {
      // Deactivate all others
      for (const acc of accounts.value) {
        acc.isActive = false;
      }
    }

    accounts.value.push(newAccount);
    await saveAccounts();
    return newAccount;
  }

  /**
   * Remove an account by ID.
   * If the removed account was active, activate the first remaining account.
   */
  async function removeAccount(id: string): Promise<void> {
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx === -1) return;

    const wasActive = accounts.value[idx].isActive;
    accounts.value.splice(idx, 1);

    if (wasActive && accounts.value.length > 0) {
      accounts.value[0].isActive = true;
    }

    await saveAccounts();

    // Sync the active account to useLoginAccount
    syncToLoginAccount();
  }

  /**
   * Switch the active account by ID.
   */
  async function switchAccount(id: string): Promise<void> {
    const target = accounts.value.find((a) => a.id === id);
    if (!target) return;

    for (const acc of accounts.value) {
      acc.isActive = acc.id === id;
    }

    await saveAccounts();
    syncToLoginAccount();
  }

  /**
   * Sync data from the existing useLoginAccount to the multi-account list.
   * Called on first init if the multi-account store is empty.
   */
  async function syncFromLogin(): Promise<void> {
    if (!loginAccount.value) return;

    const existing = accounts.value.find((a) => a.nickname === loginAccount.value!.nickname);
    if (existing) return;

    await addAccount({
      authKey: '',
      nickname: loginAccount.value.nickname,
      avatar: loginAccount.value.avatar,
      loginAt: Date.now(),
      expiresAt: loginAccount.value.expires,
    });
  }

  /**
   * Sync the current active account back to useLoginAccount for backward compatibility.
   */
  function syncToLoginAccount(): void {
    if (activeAccount.value) {
      loginAccount.value = {
        nickname: activeAccount.value.nickname,
        avatar: activeAccount.value.avatar,
        expires: activeAccount.value.expiresAt,
      };
    } else {
      loginAccount.value = null;
    }
  }

  /**
   * Initialize: load from secure store, migrate if needed.
   */
  async function init(): Promise<void> {
    await loadAccounts();
    if (accounts.value.length === 0 && loginAccount.value) {
      await syncFromLogin();
    }
  }

  return {
    accounts,
    activeAccount,
    activeCount,
    addAccount,
    removeAccount,
    switchAccount,
    syncFromLogin,
    init,
  };
}
