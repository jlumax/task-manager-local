'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useCloudBaseAuth';
import { useTaskStore } from '@/store/taskStore';
import LoginModal from '@/components/auth/LoginModal';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ViewToggle from '@/components/layout/ViewToggle';
import WorkspaceSelector from '@/components/auth/WorkspaceSelector';
import TaskList from '@/components/tasks/TaskList';
import GanttChart from '@/components/gantt/GanttChart';
import NotesView from '@/components/notes/NotesView';
import FireworksButton from '@/components/effects/FireworksButton';
import ThemeEffects from '@/components/effects/ThemeEffects';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import AppearanceSelector from '@/components/layout/AppearanceSelector';
import UserButton from '@/components/auth/UserButton';
import MobileFloatBar from '@/components/layout/MobileFloatBar';
import AiFab from '@/components/ai/AiFab';
import AiChatPanel from '@/components/ai/AiChatPanel';
import { useSync } from '@/hooks/useSync';
import LocalApp from '@/components/local/LocalApp';
import { isLocalMode } from '@/lib/app-mode';
import { BarChart3, Bot, ClipboardList, NotebookPen, Sparkles } from 'lucide-react';

export default function Home() {
  if (isLocalMode) return <LocalApp />;
  return <CloudHome />;
}

function CloudHome() {
  useSync();
  const { isSignedIn, isLoading: authLoading } = useAuth();
  const {
    loadTasks,
    loadCelebrationTexts,
    migrateFromLocalStorage,
    theme,
    fontFamily,
    currentView,
    effectsEnabled,
    appTitle,
    currentWorkspaceId,
    currentWorkspacePlan,
    currentPlanLimits,
  } = useTaskStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState<'none' | 'left' | 'right'>('none');

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadTasks();
      if (mounted) {
        await migrateFromLocalStorage();
        await loadCelebrationTexts();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadTasks, migrateFromLocalStorage, loadCelebrationTexts]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-effects-disabled', String(!effectsEnabled));
    }
  }, [theme, effectsEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fontMap: Record<string, string> = {
      'noto-sans': "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

      'wenkai': "'LXGW WenKai', 'KaiTi', 'STKaiti', serif",
      'longcang': "'Long Cang', cursive",
      'zen-old-mincho': "'Zen Old Mincho', serif",
      'klee-one': "'Klee One', cursive",
      'system': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    };
    document.documentElement.style.setProperty('--font-sans', fontMap[fontFamily] || fontMap['noto-sans']);
  }, [fontFamily]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = appTitle.replace(/📋\s*/, '') + ' - 任务管理';
    }
  }, [appTitle]);

  return (
    <div className={`relative min-h-screen flex flex-col app-layout ${showAiChat ? 'ai-open' : ''} ${showAiChat && aiCollapsed === 'left' ? 'collapsed-left' : ''} ${showAiChat && aiCollapsed === 'right' ? 'collapsed-right' : ''}`}>
      {isSignedIn && <ThemeEffects />}

      {theme === 'rage' && (
        <div className="rage-border" aria-hidden="true" />
      )}
      {theme === 'success' && (
        <div className="success-border" aria-hidden="true" />
      )}

      {/* Main content — slides left when AI panel opens */}
      <div className="main-content flex-1 flex flex-col">
        <div className="container relative z-10 w-full px-4 pt-4 pb-4 flex-1">
          {authLoading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <p className="text-muted text-sm">加载中...</p>
            </div>
          ) : !isSignedIn ? (
            <LandingPage onLogin={() => setShowLogin(true)} paused={showLogin} />
          ) : (
            <>
              <Header onShowLogin={() => setShowLogin(true)} isAiOpen={showAiChat && aiCollapsed !== 'right'} />

              <div className="view-toggle">
                <ViewToggle />
                <WorkspaceSelector />
                <AppearanceSelector />
                <button
                  data-theme="btn"
                  onClick={() => { setShowAiChat(true); setAiCollapsed('none'); }}
                  className="view-btn"
                >
                  <span className="icon-label"><Bot size={15} />AI</span>
                </button>
                <UserButton onShowLogin={() => setShowLogin(true)} buttonClassName="view-btn" />
              </div>

              {currentView === 'list' && <TaskList />}
              {currentView === 'gantt' && <GanttChart />}
              {currentView === 'notes' && <NotesView isAiOpen={showAiChat && aiCollapsed !== 'right'} />}

              <Footer />

              {/* AI FAB — hide when panel is open (unless right-collapsed) */}
              {(!showAiChat || aiCollapsed === 'right') && (
                <AiFab
                  onClick={() => { setShowAiChat(true); setAiCollapsed('none'); }}
                  visible={currentPlanLimits?.ai ?? (currentWorkspacePlan === 'pro' || currentWorkspacePlan === 'team')}
                />
              )}
            </>
          )}
        </div>
      </div>

      <FireworksButton />

      {/* AI Panel — slides in from right */}
      <div className="ai-panel">
        <AiChatPanel
          workspaceId={currentWorkspaceId}
          onClose={() => { setShowAiChat(false); setAiCollapsed('none'); }}
          collapsed={aiCollapsed}
          onCollapseLeft={() => setAiCollapsed(prev => prev === 'left' ? 'none' : prev === 'right' ? 'none' : 'left')}
          onCollapseRight={() => setAiCollapsed(prev => prev === 'right' ? 'none' : prev === 'left' ? 'none' : 'right')}
        />
      </div>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <AnnouncementPopup />
      <MobileFloatBar />
    </div>
  );
}

/* ================================================================
   LandingPage — 两个视觉主题轮换，和 app 主题体系完全解耦
   ================================================================ */
function ThemeLayer({ isMorning, onLogin }: { isMorning: boolean; onLogin: () => void }) {
  return (
    <div className="lp-page" style={{ position:'absolute', inset:0, background: isMorning ? '#faf7f2' : '#06060e', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      {isMorning && <div className="lp-texture" />}

      {/* 光晕 */}
      <div style={{ position:'absolute', width:500,height:500, borderRadius:'50%', background:`radial-gradient(circle, ${isMorning?'rgba(255,160,100,0.16)':'rgba(0,255,200,0.10)'}, transparent 70%)`, top:-150, left:'30%' }} />
      <div style={{ position:'absolute', width:400,height:400, borderRadius:'50%', background:`radial-gradient(circle, ${isMorning?'rgba(255,200,140,0.12)':'rgba(200,0,255,0.06)'}, transparent 70%)`, bottom:-100, right:'20%' }} />

      {/* 霓虹流动网格 */}
      {!isMorning && <div className="lp-grid" style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(0,255,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.05) 1px, transparent 1px)' }} />}

      {/* 主内容 */}
      <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'40px 24px', maxWidth:900, width:'100%' }}>
        {/* 徽标 */}
        <div style={{
          width:90, height:90, borderRadius: isMorning ? '50%' : 20,
          background: isMorning ? 'linear-gradient(135deg, #fff5f0, #fff0e8)' : 'linear-gradient(135deg, rgba(0,255,200,0.08), rgba(0,180,255,0.06))',
          boxShadow: isMorning ? '0 8px 40px rgba(200,120,60,0.15), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
          border: isMorning ? 'none' : '1px solid rgba(255,255,255,0.08)',
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:32, fontSize:38,
          '--lp-es': isMorning ? '0 8px 40px rgba(200,120,60,0.15)' : '0 0 30px rgba(0,255,200,0.08)',
          '--lp-es2': isMorning ? '0 12px 56px rgba(200,120,60,0.25)' : '0 0 40px rgba(0,255,200,0.15)',
        } as React.CSSProperties}><ClipboardList size={38} strokeWidth={1.6} /></div>

        {/* 标题 */}
        <h1 className="lp-ttl" style={{
          fontFamily: isMorning ? "'Noto Serif SC','Songti SC',serif" : "'Noto Sans SC',sans-serif",
          fontSize:'clamp(2.2rem, 5.5vw, 3.8rem)', fontWeight:900,
          letterSpacing: isMorning ? '0.04em' : '-0.01em',
          lineHeight:1.2, marginBottom:16,
          color: isMorning ? '#3d2a1a' : '#e0e0f0',
          textShadow: isMorning ? undefined : '0 0 80px rgba(0,255,200,0.15)',
        }}>
          任务
          <span className="lp-accent" style={{
            background: isMorning
              ? 'linear-gradient(135deg, #d4783b, #c0602a)'
              : 'linear-gradient(135deg, #00ffc8 0%, #00d4ff 50%, #c840ff 100%)',
            backgroundSize: isMorning ? undefined : '200% auto',
          }}>进度</span>
          管理器
        </h1>

        {/* 副标题 */}
        <p className="lp-text" style={{ fontSize:'clamp(0.9rem, 1.8vw, 1.1rem)', color: isMorning?'#8c6f5c':'rgba(200,210,220,0.55)', maxWidth:460, lineHeight:1.8, marginBottom:48, fontWeight: isMorning?400:300, letterSpacing: isMorning?'0.04em':'0.02em' }}>
          记录每一步进展，看见每一天成长<br/>
          云端同步 · 甘特排期 · 情绪激励<br/>
          {isMorning ? '让工作成为一种仪式' : '让工作成为一种仪式'}
        </p>

        {/* 功能卡片 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:18, width:'100%', maxWidth:750, marginBottom:44 }}>
          {[
            { icon: NotebookPen, title:'进展记录', desc:'Markdown 排版 + 图片上传<br/>持之以恒地追踪每一步' },
            { icon: BarChart3, title:'甘特图视图', desc:'任务时间线一目了然<br/>周/月视图轻松切换' },
            { icon: Sparkles, title:'来一发激励', desc:'烟花庆祝 + 暴走/上岸主题<br/>情绪价值必须拉满' },
          ].map((card) => (
            <div key={card.title} className="lp-card" style={{
              background: isMorning ? 'rgba(255,255,255,0.55)' : 'rgba(10,10,30,0.7)',
              border:`1px solid ${isMorning?'rgba(200,150,100,0.15)':'rgba(255,255,255,0.06)'}`,
              borderRadius:16, padding:'28px 22px', textAlign:'center',
              boxShadow: isMorning?'0 2px 20px rgba(180,120,60,0.06)':undefined,
              cursor:'default',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=isMorning?'0 12px 48px rgba(180,120,60,0.15)':'0 16px 64px rgba(0,200,150,0.12)'; e.currentTarget.style.borderColor=isMorning?'rgba(200,150,100,0.3)':'rgba(0,255,200,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=isMorning?'0 2px 20px rgba(180,120,60,0.06)':''; e.currentTarget.style.borderColor=isMorning?'rgba(200,150,100,0.15)':'rgba(255,255,255,0.06)'; }}
            >
              <card.icon size={32} strokeWidth={1.6} style={{ margin:'0 auto 14px', display:'block', opacity:0.85 }} />
              <div className="lp-text" style={{ fontSize:'1rem', fontWeight:700, marginBottom:8, color: isMorning?'#3d2a1a':'#e0e0f0', letterSpacing:'0.03em' }}>{card.title}</div>
              <div className="lp-text" style={{ fontSize:'0.8rem', color: isMorning?'#8c6f5c':'rgba(200,210,220,0.45)', lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: card.desc }} />
            </div>
          ))}
        </div>

        {/* 按钮 */}
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center', marginBottom:24 }}>
          <button className="lp-btn" onClick={onLogin} style={{
            padding:'14px 36px', borderRadius:50, fontSize:'1rem', fontWeight:700,
            border:'none', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.02em',
            background: isMorning ? 'linear-gradient(135deg, #c0602a, #a05020)' : 'linear-gradient(135deg, #00c890, #00a0d0)',
            color: isMorning ? '#fff' : '#060610',
            boxShadow: isMorning ? '0 6px 28px rgba(200,100,50,0.3)' : '0 8px 36px rgba(0,200,150,0.3)',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=isMorning?'0 10px 40px rgba(200,100,50,0.45)':'0 14px 52px rgba(0,200,150,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=isMorning?'0 6px 28px rgba(200,100,50,0.3)':'0 8px 36px rgba(0,200,150,0.3)'; }}
          >登录 / 注册</button>
        </div>

        <p className="lp-text" style={{ fontSize:'0.78rem', color: isMorning?'#b8a090':'rgba(200,210,220,0.3)', letterSpacing:'0.04em' }}>
          登录后自动开启云端同步 · 多设备实时协作
        </p>
        <div className="lp-text" style={{ fontSize:'0.75rem', marginTop:16, marginBottom:4, display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/terms" style={{ color: isMorning?'#b8a090':'rgba(200,210,220,0.3)', textDecoration:'none' }}>服务条款</a>
          <a href="/privacy" style={{ color: isMorning?'#b8a090':'rgba(200,210,220,0.3)', textDecoration:'none' }}>隐私政策</a>
          <a href="/pricing" style={{ color: isMorning?'#b8a090':'rgba(200,210,220,0.3)', textDecoration:'none' }}>定价</a>
          <span style={{ color: isMorning?'rgba(180,160,144,0.5)':'rgba(200,210,220,0.15)' }}>|</span>
          <a href="mailto:support@taskdada.com" style={{ color: isMorning?'#b8a090':'rgba(200,210,220,0.3)', textDecoration:'none' }}>联系我们</a>
        </div>
        <p className="lp-text" style={{ fontSize:'0.72rem', color: isMorning?'#c0a898':'rgba(200,210,220,0.2)', letterSpacing:'0.03em', marginTop:4 }}>
          © 2026 KUN WANG. All Rights Reserved. V1.3
        </p>
      </div>
    </div>
  );
}

function LandingPage({ onLogin, paused }: { onLogin: () => void; paused: boolean }) {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      // Auto-close landing page when signed in
    }
  }, [isSignedIn]);

  const [variant, setVariant] = useState<'morning' | 'neon'>('morning');
  const [prevVariant, setPrevVariant] = useState<'morning' | 'neon' | null>(null);
  const [sweepKey, setSweepKey] = useState(0);
  const firstRender = useRef(true);
  const isMorning = variant === 'morning';

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setVariant((v) => {
        const next = v === 'morning' ? 'neon' : 'morning';
        setPrevVariant(v);
        setSweepKey((k) => k + 1);
        firstRender.current = false;
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, [paused]);

  // 动画 2s 后清理旧层
  useEffect(() => {
    if (prevVariant === null) return;
    const t = setTimeout(() => setPrevVariant(null), 2100);
    return () => clearTimeout(t);
  }, [sweepKey]);

  const fadeClass = firstRender.current ? '' : 'lp-fade-in';

  return (
    <>
      <style key="lp-static">{`
        .lp-page { transition: background 1.2s ease; }
        .lp-card { transition: all 0.4s cubic-bezier(0.25,0.46,0.45,0.94), background 1.2s ease, border-color 1.2s ease; }
        .lp-btn { transition: all 0.3s cubic-bezier(0.25,0.46,0.45,0.94), background 1.2s ease, color 1.2s ease, border-color 1.2s ease, box-shadow 1.2s ease; }
        .lp-text, .lp-ttl { transition: color 1.2s ease; }
        .lp-accent { -webkit-background-clip: text !important; background-clip: text !important; color: transparent !important; }
        @keyframes lp-gridMove { 0%{ background-position:0 0; } 100%{ background-position:0 60px; } }
        .lp-grid { background-size:60px 60px; transform:perspective(500px) rotateX(60deg); transform-origin:center top; }
        @keyframes lp-fadeIn { 0%{ opacity:0; } 100%{ opacity:1; } }
        @keyframes lp-fadeOut { 0%{ opacity:1; } 100%{ opacity:0; } }
        .lp-fade-in { animation:lp-fadeIn 2s ease forwards; }
        .lp-fade-out { animation:lp-fadeOut 2s ease forwards; }
      `}</style>

      {isMorning && (
        <style key="lp-texture">{`
          .lp-texture { position:fixed; inset:0; z-index:0; opacity:0.03; background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23000000'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        `}</style>
      )}

      {/* 旧主题：淡出 */}
      {prevVariant !== null && (
        <div key={`old-${sweepKey}`} className="lp-fade-out" style={{ position:'fixed', inset:0, zIndex:0 }}>
          <ThemeLayer isMorning={prevVariant === 'morning'} onLogin={onLogin} />
        </div>
      )}

      {/* 新主题：淡入 */}
      <div key={`new-${sweepKey}`} className={fadeClass} style={{ position:'fixed', inset:0, zIndex:1 }}>
        <ThemeLayer isMorning={isMorning} onLogin={onLogin} />
      </div>
    </>
  );
}
