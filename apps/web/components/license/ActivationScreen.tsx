'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, HardDrive, KeyRound, LoaderCircle, MessagesSquare, ShieldCheck, WifiOff } from 'lucide-react';

interface ActivationScreenProps {
  configurationError?: string;
  onActivate: (code: string) => Promise<void>;
}

export default function ActivationScreen({ configurationError, onActivate }: ActivationScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(configurationError || '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (configurationError || submitting) return;
    if (code.replace(/[^a-zA-Z0-9]/g, '').length < 24) {
      setError('请输入完整激活码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onActivate(code);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '激活失败，请稍后重试');
      setSubmitting(false);
    }
  };

  return (
    <main className="license-gate">
      <div className="license-gate-glow" aria-hidden="true" />
      <section className="license-intro" aria-labelledby="license-title">
        <span className="license-kicker"><ShieldCheck size={15} /> LOCAL EDITION</span>
        <h1 id="license-title">一次激活，<br />把进度留在自己手里</h1>
        <p>任务、进展和图片仍只保存在当前浏览器。激活完成后无需登录，日常使用也不要求联网。</p>
        <div className="license-promises">
          <span><HardDrive size={18} /><strong>本地保存</strong><small>业务数据不上传</small></span>
          <span><WifiOff size={18} /><strong>离线可用</strong><small>许可证本机验证</small></span>
          <span><KeyRound size={18} /><strong>永久许可</strong><small>同一浏览器长期有效</small></span>
        </div>
      </section>

      <section className="license-form-panel" aria-labelledby="activation-heading">
        <div className="license-seal" aria-hidden="true"><KeyRound size={28} /></div>
        <span className="license-serial">TASK MANAGER · PERMANENT LICENSE</span>
        <h2 id="activation-heading">激活本地版</h2>
        <p>输入激活码</p>
        <form onSubmit={submit}>
          <label htmlFor="activation-code">激活码</label>
          <input
            id="activation-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="TM-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={submitting || !!configurationError}
          />
          <div className="license-form-status" role="status" aria-live="polite">
            {error || '激活信息仅保存在当前浏览器，请勿清除浏览记录中的本站数据，以免激活失效'}
          </div>
          <button type="submit" disabled={submitting || !!configurationError}>
            {submitting ? <><LoaderCircle className="license-spinner" size={18} />正在激活</> : <>验证并激活<ArrowRight size={18} /></>}
          </button>
        </form>
        <small className="license-support">
          激活遇到问题：<span><MessagesSquare size={14} aria-hidden="true" />Dove_Research</span>
        </small>
      </section>
    </main>
  );
}
