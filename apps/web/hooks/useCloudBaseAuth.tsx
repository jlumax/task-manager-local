'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import { getCloudBaseAuth } from '@/lib/cloudbase';
import { exchangeCloudBaseToken, clearAuthToken, setAuthToken, apiFetch, smsApi } from '@/lib/api';
import { isLocalMode } from '@/lib/app-mode';

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const maybe = e as { message?: unknown; code?: unknown };
    if (typeof maybe.message === 'string') return maybe.message;
    if (typeof maybe.code === 'string') return maybe.code;
  }
  return '';
}

function getOptionalString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapCloudBaseError(e: unknown): string {
  const msg = getErrorMessage(e);
  if (/domain|whitelist|安全域名|不在.*域名/.test(msg)) {
    return '当前域名未加入 CloudBase 安全域名白名单，请在 CloudBase 控制台 → 安全配置 → 安全域名中添加';
  }
  if (/login.*not.*enable|登录方式|not.*allow|disabled/.test(msg)) {
    return '该登录方式未在 CloudBase 控制台启用，请前往 用户管理 → 登录设置 中开启';
  }
  if (/appid|app_id|wechat.*config/.test(msg)) {
    return '微信登录配置有误，请检查 NEXT_PUBLIC_WECHAT_APPID 环境变量和 CloudBase 微信登录配置';
  }
  if (/sms|短信|template|signature/.test(msg)) {
    return '短信服务未配置，请在 CloudBase 控制台 → 云开发 → 短信 中配置短信模板和签名';
  }
  if (/code.*error|验证码|code.*invalid|code.*expired/.test(msg)) {
    return '验证码错误或已过期，请重新获取';
  }
  if (/init|初始化/.test(msg)) {
    return 'CloudBase SDK 初始化失败，请检查 NEXT_PUBLIC_CLOUDBASE_ENV_ID 和 NEXT_PUBLIC_CLOUDBASE_ACCESS_KEY 环境变量';
  }
  return msg || '操作失败，请重试';
}

type CloudBaseOtpVerifier = (params: { token: string }) => Promise<{
  data?: unknown;
  error?: unknown;
}>;

interface CloudBaseUser {
  uid: string;
  phone?: string;
  nickName?: string;
  avatarUrl?: string;
  email?: string;
}

interface AuthContextType {
  isSignedIn: boolean;
  user: CloudBaseUser | null;
  isLoading: boolean;
  signInWithPhone: (phone: string, code: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  sendBindPhoneCode: (phone: string) => Promise<void>;
  signInWithWechat: () => Promise<void>;
  signInWithPassword: (username: string, password: string) => Promise<void>;
  signUpWithPassword: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  bindPhone: (phone: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const localAuth: AuthContextType = {
  isSignedIn: true,
  user: { uid: 'local-user', nickName: '本地用户' },
  isLoading: false,
  signInWithPhone: async () => {},
  sendPhoneCode: async () => {},
  sendBindPhoneCode: async () => {},
  signInWithWechat: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  signOut: async () => {},
  bindPhone: async () => {},
};

export function CloudBaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<CloudBaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const otpVerifiersRef = useRef(new Map<string, CloudBaseOtpVerifier>());

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('task_manager_jwt');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            uid: payload.id || payload.sub || '',
            email: payload.email || undefined,
            phone: payload.phone || undefined,
            nickName: payload.name || payload.email || undefined,
          });
          setIsSignedIn(true);
          return;
        } catch {
          // token parsing failed, try CloudBase
        }
      }

      try {
        const auth = getCloudBaseAuth();
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          setUser({
            uid: currentUser.uid || '',
            phone: getOptionalString(currentUser, 'phoneNumber') || getOptionalString(currentUser, 'phone'),
            nickName: currentUser.name || undefined,
            email: currentUser.email || undefined,
          });
          setIsSignedIn(true);
          await exchangeCloudBaseToken().catch(() => {});
          return;
        }
      } catch {
        // CloudBase auth not available
      }

      setUser(null);
      setIsSignedIn(false);
      clearAuthToken();
    } catch {
      setUser(null);
      setIsSignedIn(false);
      clearAuthToken();
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const sendPhoneCode = useCallback(async (phone: string) => {
    const auth = getCloudBaseAuth();
    await auth.signOut().catch(() => {});
    clearAuthToken();
    setUser(null);
    setIsSignedIn(false);
    const { data, error } = await auth.signInWithOtp({ phone });
    if (error) {
      throw new Error(mapCloudBaseError(error));
    }
    if (!data.verifyOtp) {
      throw new Error('验证码发送失败，请检查 CloudBase 手机号登录配置');
    }
    otpVerifiersRef.current.set(phone, data.verifyOtp);
  }, []);

  const signInWithPhone = useCallback(
    async (phone: string, code: string) => {
      const verifyOtp = otpVerifiersRef.current.get(phone);
      if (!verifyOtp) {
        throw new Error('请先获取验证码');
      }

      const { error } = await verifyOtp({ token: code });
      if (error) {
        throw new Error(mapCloudBaseError(error));
      }

      otpVerifiersRef.current.delete(phone);
      await exchangeCloudBaseToken(phone);
      await refreshUser();
    },
    [refreshUser]
  );

  const sendBindPhoneCode = useCallback(async (phone: string) => {
    await smsApi.sendCode(phone, 'bind');
  }, []);

  const bindPhone = useCallback(
    async (phone: string, code: string) => {
      await smsApi.bindPhone(phone, code);
      await refreshUser();
    },
    [refreshUser]
  );

  const signInWithWechat = useCallback(async () => {
    const auth = getCloudBaseAuth();
    const wechatAppId = process.env.NEXT_PUBLIC_WECHAT_APPID;
    if (!wechatAppId) {
      throw new Error('Missing NEXT_PUBLIC_WECHAT_APPID');
    }
    const { error } = await auth.signInWithOAuth({
      provider: 'WECHAT-OPEN',
      options: {
        queryParams: { appid: wechatAppId },
      },
    });
    if (error) {
      throw new Error(mapCloudBaseError(error));
    }
  }, []);

  const signInWithPassword = useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: username, password }),
      });
      setAuthToken(data.token);
      await refreshUser();
    },
    [refreshUser]
  );

  const signUpWithPassword = useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: username, password }),
      });
      setAuthToken(data.token);
      await refreshUser();
    },
    [refreshUser]
  );

  const signOut = useCallback(async () => {
    const auth = getCloudBaseAuth();
    await auth.signOut();
    clearAuthToken();
    setIsSignedIn(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        user,
        isLoading,
        signInWithPhone,
        sendPhoneCode,
        sendBindPhoneCode,
        signInWithWechat,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        bindPhone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (isLocalMode) return localAuth;
  if (!ctx) throw new Error('useAuth must be used within CloudBaseAuthProvider');
  return ctx;
}
