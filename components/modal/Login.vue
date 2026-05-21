<script setup lang="ts">
import { request } from '#shared/utils/request';
import type { LoginAccount, ScanLoginResult, StartLoginResult } from '~/types/types';

const modal = useModal();

const qrcodeSrc = ref('');
const loading = ref(false);
const msg = ref('');

const checkTimer = ref<number | null>(null);

// Max consecutive poll errors before giving up
const MAX_POLL_ERRORS = 5;
const pollErrorCount = ref(0);

const loginAccount = useLoginAccount();
const { addAccount, init: initMultiAccount } = useLoginAccountManager();

const emit = defineEmits<{
  (e: 'login-success', account: LoginAccount): void;
}>();

onMounted(async () => {
  // Ensure multi-account system is initialized before any login attempt
  await initMultiAccount();
  getQrcode();
});

function closeModal() {
  modal.close();

  window.clearTimeout(checkTimer.value!);
  checkTimer.value = null;
}

/**
 * 创建新的登录会话
 *
 * 该请求会在response中设置一个唯一的uuid(cookie)作为会话id
 */
async function newLoginSession() {
  const sid = new Date().getTime().toString() + Math.floor(Math.random() * 100);
  const resp = await request<StartLoginResult>(`/api/web/login/session/${sid}`, { method: 'POST' });
  if (!resp || !resp.base_resp || resp.base_resp.ret !== 0) {
    throw new Error(`${resp?.base_resp?.err_msg || '获取登录会话失败'}`);
  }
}

// 获取登录二维码
async function getQrcode() {
  try {
    loading.value = true;
    msg.value = '获取登录二维码';
    pollErrorCount.value = 0;
    await newLoginSession();
    qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`;
    msg.value = '';

    // 启动计时器开始轮训检查
    _check();
  } catch (e: any) {
    msg.value = e.message;
    qrcodeSrc.value = 'https://placehold.co/320?text=qrcode';
  } finally {
    loading.value = false;
  }
}

function _check() {
  window.clearTimeout(checkTimer.value!);

  if (modal.isOpen.value) {
    checkTimer.value = window.setTimeout(checkQrcodeStatus, 2000);
  }
}

// 检查二维码扫描状态
async function checkQrcodeStatus() {
  try {
    const resp = await request<ScanLoginResult>('/api/web/login/scan');
    // Reset error count on successful response
    pollErrorCount.value = 0;
    if (resp && resp.base_resp && resp.base_resp.ret === 0) {
      switch (resp.status) {
        case 0:
          _check();
          break;
        case 1:
          // 登录成功
          msg.value = '已确认，正在登录中';
          await bizLogin();
          break;
        case 2:
        case 3:
          // 刷新二维码
          qrcodeSrc.value = `/api/web/login/getqrcode?rnd=${Math.random()}`;
          _check();
          break;
        case 4:
        case 6:
          if (resp.acct_size >= 1) {
            loading.value = true;
            msg.value = '扫码成功，等待确认';
            qrcodeSrc.value = '';
          } else {
            msg.value = '没有可登录账号';
          }
          _check();
          break;
        case 5:
          // 未绑定邮箱，不能扫描登录
          msg.value = '该账号尚未绑定邮箱';
          _check();
          break;
      }
    } else if (resp && resp.base_resp && resp.base_resp.ret !== 0) {
      msg.value = resp.base_resp.err_msg || '扫码状态检查失败';
      _check();
    }
  } catch (e: any) {
    // Network or other error — log and decide whether to continue polling
    console.error('[Login] checkQrcodeStatus error:', e);
    pollErrorCount.value++;
    if (pollErrorCount.value >= MAX_POLL_ERRORS) {
      msg.value = `扫码状态检查连续失败 ${MAX_POLL_ERRORS} 次，请关闭重试`;
    } else {
      msg.value = `扫码状态检查异常: ${e.message || '未知错误'}，重试中...`;
      _check();
    }
  }
}

async function bizLogin() {
  try {
    loading.value = true;
    const resp = await request<LoginAccount>('/api/web/login/bizlogin', {
      method: 'POST',
    });
    if (resp.err) {
      throw new Error(`${resp.err}`);
    }

    msg.value = '登录成功';
    loginAccount.value = resp;

    // Use authKey from response body (HttpOnly cookie is not readable from JS)
    const authKey = resp.authKey || '';
    await addAccount(authKey, resp);

    // Emit login-success event
    emit('login-success', resp);

    closeModal();
  } catch (e: any) {
    msg.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal prevent-close>
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">登录微信公众号</h2>
        <UButton
          square
          variant="link"
          color="gray"
          icon="i-lucide:x"
          class="absolute right-3 top-3"
          @click="closeModal"
        />
      </template>

      <!-- 二维码图片展示区 -->
      <div class="flex flex-col justify-center items-center mx-auto size-80">
        <UIcon v-if="loading" name="i-lucide:loader" :size="28" class="animate-spin text-slate-500" />
        <p v-if="msg" class="text-rose-500">{{ msg }}</p>
        <img v-if="qrcodeSrc" :src="qrcodeSrc" alt="" class="w-full rounded-md" />
      </div>
    </UCard>
  </UModal>
</template>
