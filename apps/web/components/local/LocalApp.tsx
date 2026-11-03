'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Coffee, Database, X } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { LOCAL_WORKSPACE_ID } from '@/lib/app-mode';
import { seedLocalDemoDataIfNeeded } from '@/lib/local-demo-data';
import Header from '@/components/layout/Header';
import ViewToggle from '@/components/layout/ViewToggle';
import ProjectSelector from '@/components/layout/ProjectSelector';
import AppearanceSelector from '@/components/layout/AppearanceSelector';
import TaskList from '@/components/tasks/TaskList';
import GanttChart from '@/components/gantt/GanttChart';
import NotesView from '@/components/notes/NotesView';
import MobileFloatBar from '@/components/layout/MobileFloatBar';
import FireworksButton from '@/components/effects/FireworksButton';
import ThemeEffects from '@/components/effects/ThemeEffects';
import LocalDataPanel from './LocalDataPanel';
import ServiceWorkerRegistration from './ServiceWorkerRegistration';

const fontMap: Record<string, string> = {
  'noto-sans': "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  wenkai: "'LXGW WenKai', 'KaiTi', 'STKaiti', serif",
  longcang: "'Long Cang', cursive",
  'zen-old-mincho': "'Zen Old Mincho', serif",
  'klee-one': "'Klee One', cursive",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export default function LocalApp() {
  const {
    loadTasks,
    loadProjects,
    migrateFromLocalStorage,
    loadCelebrationTexts,
    theme,
    customThemeImage,
    customThemePalette,
    fontFamily,
    effectsEnabled,
    currentView,
    appTitle,
  } = useTaskStore();
  const [ready, setReady] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      useTaskStore.setState({ currentWorkspaceId: LOCAL_WORKSPACE_ID });
      await loadTasks();
      await migrateFromLocalStorage();
      if (await seedLocalDemoDataIfNeeded()) {
        await loadTasks();
      }
      await Promise.all([loadProjects(), loadCelebrationTexts()]);
      if (active) setReady(true);
    })();
    return () => { active = false; };
  }, [loadTasks, loadProjects, migrateFromLocalStorage, loadCelebrationTexts]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--font-sans', fontMap[fontFamily] || fontMap['noto-sans']);
    if (customThemeImage && customThemePalette) {
      root.style.setProperty(
        '--custom-background',
        `linear-gradient(${customThemePalette.overlay}, ${customThemePalette.overlay}), url("${customThemeImage}") center / cover fixed no-repeat`,
      );
      root.style.setProperty('--custom-foreground', customThemePalette.foreground);
      root.style.setProperty('--custom-card', customThemePalette.card);
      root.style.setProperty('--custom-card-foreground', customThemePalette.cardForeground);
      root.style.setProperty('--custom-border', customThemePalette.border);
      root.style.setProperty('--custom-primary', customThemePalette.primary);
      root.style.setProperty('--custom-primary-foreground', customThemePalette.primaryForeground);
      root.style.setProperty('--custom-muted', customThemePalette.muted);
      root.style.setProperty('--custom-accent', customThemePalette.accent);
    }
    document.body.setAttribute('data-effects-disabled', String(!effectsEnabled));
  }, [theme, customThemeImage, customThemePalette, fontFamily, effectsEnabled]);

  useEffect(() => {
    document.title = `${appTitle.replace(/\p{Extended_Pictographic}/gu, '').trim()} - 本地任务管理`;
  }, [appTitle]);

  if (!ready) {
    return <div className="local-loading"><span />正在加载本地数据…</div>;
  }

  return (
    <div className="relative min-h-screen flex flex-col app-layout local-skin">
      <ServiceWorkerRegistration />
      <ThemeEffects />

      {theme === 'rage' && <div className="rage-border" aria-hidden="true" />}
      {theme === 'success' && <div className="success-border" aria-hidden="true" />}

      <div className="main-content flex-1 flex flex-col">
        <div className="container relative z-10 w-full px-4 pt-4 pb-4 flex-1">
          <Header />

          <div className="view-toggle">
            <ViewToggle />
            <ProjectSelector />
            <AppearanceSelector />
            <button
              type="button"
              data-theme="btn"
              className="view-btn local-data-button"
              onClick={() => setShowData(true)}
            >
              <Database size={15} aria-hidden="true" />
              本地数据
            </button>
            <button
              type="button"
              data-theme="btn"
              className="view-btn local-support-button"
              onClick={() => setShowSupport(true)}
            >
              <Coffee size={15} aria-hidden="true" />
              赞赏
            </button>
          </div>

          {currentView === 'list' && <TaskList />}
          {currentView === 'gantt' && <GanttChart />}
          {currentView === 'notes' && <NotesView />}

          <footer className="text-center py-5 text-xs text-muted mt-4 border-t border-border">
            <p>数据仅保存在当前浏览器 · 建议定期导出 ZIP 备份</p>
            <p className="mt-1">&copy; 2026 KUN WANG. Local Edition. jlumax@163.com</p>
          </footer>
        </div>
      </div>

      <FireworksButton />
      <LocalDataPanel open={showData} onClose={() => setShowData(false)} />
      {showSupport && (
        <div className="local-modal-backdrop" onClick={() => setShowSupport(false)}>
          <section
            className="local-support-panel"
            onClick={(event) => event.stopPropagation()}
            aria-modal="true"
            role="dialog"
            aria-labelledby="local-support-title"
          >
            <button
              type="button"
              className="local-icon-button local-support-close"
              onClick={() => setShowSupport(false)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <span className="local-kicker">SUPPORT THE AUTHOR</span>
            <h2 id="local-support-title">好心人，请作者喝杯咖啡吧</h2>
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/support-qr.png`}
              alt="赞赏二维码"
              width={568}
              height={543}
              priority
            />
          </section>
        </div>
      )}
      <MobileFloatBar />
    </div>
  );
}
