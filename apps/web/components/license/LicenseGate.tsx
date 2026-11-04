'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { triggerFireworks } from '@/lib/fireworks';
import { activateLocalLicense, checkLocalLicense, isLicenseRequired } from '@/lib/license-client';
import ActivationScreen from './ActivationScreen';

const licenseFontMap: Record<string, string> = {
  'noto-sans': "'Noto Sans SC', sans-serif",
  wenkai: "'LXGW WenKai', 'KaiTi', 'STKaiti', serif",
  longcang: "'Long Cang', cursive",
  'zen-old-mincho': "'Zen Old Mincho', serif",
  'klee-one': "'Klee One', cursive",
  system: "'Noto Sans SC', sans-serif",
};

type GateState =
  | { status: 'checking' }
  | { status: 'licensed' }
  | { status: 'unlicensed'; configurationError?: string };

export default function LicenseGate({ children }: { children: ReactNode }) {
  const theme = useTaskStore((state) => state.theme);
  const fontFamily = useTaskStore((state) => state.fontFamily);
  const [state, setState] = useState<GateState>(isLicenseRequired ? { status: 'checking' } : { status: 'licensed' });

  useEffect(() => {
    if (!isLicenseRequired) return;
    let active = true;
    checkLocalLicense().then((result) => {
      if (!active) return;
      if (result.status === 'licensed') setState({ status: 'licensed' });
      else setState({
        status: 'unlicensed',
        configurationError: result.status === 'configuration-error' ? result.message : undefined,
      });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (state.status !== 'licensed') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.setProperty('--font-sans', licenseFontMap[fontFamily] || licenseFontMap['noto-sans']);
    }
  }, [fontFamily, state.status, theme]);

  if (state.status === 'checking') {
    return <div className="local-loading"><span />正在验证本机许可证…</div>;
  }
  if (state.status === 'unlicensed') {
    return (
      <ActivationScreen
        configurationError={state.configurationError}
        onActivate={async (code) => {
          await activateLocalLicense(code);
          setState({ status: 'licensed' });
          window.setTimeout(() => triggerFireworks(), 180);
        }}
      />
    );
  }
  return <>{children}</>;
}
