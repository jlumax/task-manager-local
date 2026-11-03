import cloudbase from '@cloudbase/js-sdk';

const envId = process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
const accessKey =
  process.env.NEXT_PUBLIC_CLOUDBASE_ACCESS_KEY ||
  process.env.NEXT_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY;
const region = process.env.NEXT_PUBLIC_CLOUDBASE_REGION || 'ap-shanghai';

let app: ReturnType<typeof cloudbase.init> | null = null;
let initWarned = false;

export function getCloudBaseApp() {
  if (!app) {
    if (!envId) {
      throw new Error('缺少 NEXT_PUBLIC_CLOUDBASE_ENV_ID 环境变量，手机/微信登录不可用');
    }
    app = cloudbase.init({
      env: envId,
      region,
      ...(accessKey ? { accessKey } : {}),
      auth: { detectSessionInUrl: true },
    });
    if (!initWarned) {
      initWarned = true;
      console.log('[CloudBase] SDK 初始化完成，envId:', envId);
    }
  }
  return app;
}

export function getCloudBaseAuth() {
  return getCloudBaseApp().auth();
}

export async function getCloudBaseToken(): Promise<string | null> {
  try {
    const auth = getCloudBaseAuth();
    const result = await auth.getAccessToken();
    return result.accessToken;
  } catch {
    return null;
  }
}

export async function getCloudBaseUid(): Promise<string | null> {
  try {
    const auth = getCloudBaseAuth();
    const sessionResult = await auth.getSession();
    const sessionUser = sessionResult.data?.session?.user || sessionResult.data?.user;
    if (sessionUser?.id) return sessionUser.id;
    if (sessionUser?.user_metadata?.uid) return sessionUser.user_metadata.uid;

    const user = await auth.getCurrentUser();
    return user?.uid || null;
  } catch {
    return null;
  }
}
