import { cookieStore } from '~/server/utils/CookieStore';

interface DebugQuery {
  key: string;
}

export default defineEventHandler(async event => {
  // Disable debug endpoint in Electron production mode (security)
  if (process.env.ELECTRON === 'true') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const { key } = getQuery<DebugQuery>(event);
  if (key && key === process.env.DEBUG_KEY) {
    return cookieStore.toJSON();
  } else {
    return 'not set debug key';
  }
});
