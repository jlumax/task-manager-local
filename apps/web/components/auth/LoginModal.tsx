'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { X, Smartphone, MessageSquare, Loader2, User, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LoginTab = 'phone' | 'password' | 'wechat';

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { sendPhoneCode, signInWithPhone, signInWithWechat, signInWithPassword, signUpWithPassword } = useAuth();

  const [tab, setTab] = useState<LoginTab>('phone');
  const [isRegister, setIsRegister] = useState(false);

  // Phone
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  // Password
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setCode('');
      setUsername('');
      setPassword('');
      setError('');
      setCountdown(0);
      setIsRegister(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.setAttribute('data-login-modal-open', 'true');
    return () => {
      document.body.removeAttribute('data-login-modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setIsSending(true);
    try {
      await sendPhoneCode(phone);
      setCountdown(60);
      intervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e?.message || '验证码发送失败');
    } finally {
      setIsSending(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone || !code) {
      setError('请输入手机号和验证码');
      return;
    }
    setError('');
    setIsLoggingIn(true);
    try {
      await signInWithPhone(phone, code);
      onClose();
    } catch (e: any) {
      setError(e?.message || '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!username || !password) {
      setError('请输入账号和密码');
      return;
    }
    setError('');
    setIsLoggingIn(true);
    try {
      if (isRegister) {
        await signUpWithPassword(username, password);
      } else {
        await signInWithPassword(username, password);
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || (isRegister ? '注册失败' : '登录失败'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleWechatLogin = async () => {
    setError('');
    try {
      await signInWithWechat();
    } catch (e: any) {
      setError(e?.message || '微信登录初始化失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">
            {isRegister ? '注册账号' : '登录 / 注册'}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-accent rounded-lg p-1 mb-5">
          {([
            { key: 'phone', label: '手机号' },
            { key: 'password', label: '账号密码' },
            { key: 'wechat', label: '微信' },
          ] as { key: LoginTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); setIsRegister(false); }}
              className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
                tab === t.key
                  ? 'bg-card text-foreground font-medium shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Phone Login */}
        {tab === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">手机号</label>
              <div className="flex items-center gap-2 bg-accent border border-border rounded-lg px-3 py-2">
                <Smartphone size={16} className="text-muted" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">验证码</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-accent border border-border rounded-lg px-3 py-2">
                  <MessageSquare size={16} className="text-muted" />
                  <input
                    id="code"
                    name="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6位验证码"
                    className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
                  />
                </div>
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isSending}
                  className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
                >
                  {isSending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}s`
                  ) : (
                    '获取验证码'
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handlePhoneLogin}
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 size={16} className="animate-spin" />}
              登录
            </button>
          </div>
        )}

        {/* Password Login */}
        {tab === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">
                {isRegister ? '邮箱 / 用户名' : '邮箱 / 用户名'}
              </label>
              <div className="flex items-center gap-2 bg-accent border border-border rounded-lg px-3 py-2">
                <User size={16} className="text-muted" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入邮箱或用户名"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">密码</label>
              <div className="flex items-center gap-2 bg-accent border border-border rounded-lg px-3 py-2">
                <Lock size={16} className="text-muted" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handlePasswordSubmit}
              disabled={isLoggingIn}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 size={16} className="animate-spin" />}
              {isRegister ? '注册' : '登录'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-sm text-primary hover:underline"
              >
                {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
              </button>
            </div>
          </div>
        )}

        {/* WeChat Login */}
        {tab === 'wechat' && (
          <div className="space-y-4 py-4">
            <p className="text-center text-sm text-muted">
              点击按钮使用微信扫码登录
            </p>
            <button
              onClick={handleWechatLogin}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
              </svg>
              微信登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
