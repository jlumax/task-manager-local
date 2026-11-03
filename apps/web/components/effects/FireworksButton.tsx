'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Rocket } from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import { luxuryColors } from './ThemeEffects';
import { registerFireworksTrigger } from '@/lib/fireworks';

function getStoredPos(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  try {
    const raw = localStorage.getItem('fireworks-btn-pos');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: 0, y: 0 };
}

interface RocketObj {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  trail: { x: number; y: number }[];
  color: string;
  exploded: boolean;
  onExplode?: (x: number, y: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  trail: { x: number; y: number }[];
  isSparkle?: boolean;
}

export default function FireworksButton() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const animRef = useRef<number>(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posX = useRef(getStoredPos().x);
  const posY = useRef(getStoredPos().y);

  const stateRef = useRef({
    rockets: [] as RocketObj[],
    particles: [] as Particle[],
    isActive: false,
    stopTimeout: null as ReturnType<typeof setTimeout> | null,
    textAnimationId: 0,
    currentText: '',
    textColor: '',
    textOpacity: 0,
    textScale: 0.8,
  });

  const hexToRgb = useCallback((hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '255, 255, 255';
  }, []);

  const createExplosion = useCallback(
    (x: number, y: number, color: string, count = 50) => {
      const state = stateRef.current;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 1 + Math.random() * 2.5;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: color || luxuryColors[Math.floor(Math.random() * luxuryColors.length)],
          size: 2 + Math.random() * 4,
          alpha: 1,
          decay: 0.005 + Math.random() * 0.008,
          gravity: 0.08,
          trail: [],
        });
      }

      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.5;
        state.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: '#ffffff',
          size: 1 + Math.random() * 2,
          alpha: 1,
          decay: 0.01 + Math.random() * 0.015,
          gravity: 0.05,
          trail: [],
          isSparkle: true,
        });
      }
    },
    []
  );

  const explodeText = useCallback(
    (rocketX: number, rocketY: number) => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas || !state.currentText) return;

      const textX = canvas.width / 2;
      const textY = canvas.height / 3;
      const particleCount = 80;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.8;
        const speed = 3 + Math.random() * 5;
        state.particles.push({
          x: textX + (Math.random() - 0.5) * 150,
          y: textY + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          color: state.textColor || luxuryColors[Math.floor(Math.random() * luxuryColors.length)],
          size: 3 + Math.random() * 3,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.005,
          gravity: 0.12,
          trail: [],
        });
      }

      state.textOpacity = 0;
    },
    []
  );

  const stop = useCallback(() => {
    const state = stateRef.current;
    state.isActive = false;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
    if (state.textAnimationId) {
      cancelAnimationFrame(state.textAnimationId);
      state.textAnimationId = 0;
    }
    if (state.stopTimeout) {
      clearTimeout(state.stopTimeout);
      state.stopTimeout = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = 'opacity 1s ease-out';
      canvas.style.opacity = '0';

      setTimeout(() => {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.transition = '';
        canvas.style.opacity = '';
        state.particles = [];
        state.rockets = [];
        state.currentText = '';
        state.textOpacity = 0;
        state.textScale = 0.8;
      }, 1000);
    } else {
      state.particles = [];
      state.rockets = [];
      state.currentText = '';
      state.textOpacity = 0;
      state.textScale = 0.8;
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;

    if (!state.isActive) return;

    // 页面隐藏时跳过绘制和物理更新，但保持循环以便 4s 超时正常触发停止
    if (document.visibilityState === 'hidden') {
      animRef.current = requestAnimationFrame(() => animate());
      return;
    }

    // 使用半透明黑色覆盖产生拖尾效果
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 先绘制庆祝语（在下层）
    if (state.currentText && state.textOpacity > 0) {
      ctx.save();
      const textColor = state.textColor || '#FFFFFF';
      const baseFontSize = Math.min(canvas.width / 10, 80);
      const fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
      ctx.font = `700 ${baseFontSize * state.textScale * 1.2}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const textX = canvas.width / 2;
      const textY = canvas.height / 3;

      ctx.shadowColor = textColor;
      ctx.shadowBlur = 30 * state.textOpacity;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const gradient = ctx.createLinearGradient(textX - 200, textY - 40, textX + 200, textY + 40);
      gradient.addColorStop(0, textColor);
      gradient.addColorStop(0.5, '#FFFFFF');
      gradient.addColorStop(1, textColor);

      ctx.globalAlpha = state.textOpacity;
      ctx.fillStyle = gradient;
      ctx.fillText(state.currentText, textX, textY);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeText(state.currentText, textX, textY);

      ctx.restore();
    }

    // 再绘制火箭和粒子（在上层，覆盖文字）
    for (let i = state.rockets.length - 1; i >= 0; i--) {
      const rocket = state.rockets[i];

      // 添加尾迹
      rocket.trail.push({ x: rocket.x, y: rocket.y });
      if (rocket.trail.length > 10) rocket.trail.shift();

      // 绘制尾迹
      ctx.beginPath();
      for (let j = 0; j < rocket.trail.length; j++) {
        const point = rocket.trail[j];
        if (j === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.strokeStyle = rocket.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // 向上移动
      rocket.y -= rocket.speed;
      rocket.speed *= 0.985;

      // 绘制火箭
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = rocket.color;
      ctx.fill();

      // 到达目标高度或速度减慢时爆炸
      if (rocket.y <= rocket.targetY || rocket.speed < 1.5) {
        createExplosion(rocket.x, rocket.y, rocket.color, 80);
        if (rocket.onExplode) {
          rocket.onExplode(rocket.x, rocket.y);
        }
        state.rockets.splice(i, 1);
      }
    }

    // 绘制粒子
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];

      // 添加拖尾
      if (!p.isSparkle || Math.random() > 0.7) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();
      }

      // 物理运动
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.alpha -= p.decay;

      // 绘制拖尾
      if (p.trail.length > 1) {
        ctx.beginPath();
        for (let j = 0; j < p.trail.length; j++) {
          const point = p.trail[j];
          if (j === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.strokeStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha * 0.5})`;
        ctx.lineWidth = p.size * 0.5;
        ctx.stroke();
      }

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

      if (p.isSparkle) {
        const sparkleAlpha = p.alpha * (0.5 + Math.random() * 0.5);
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkleAlpha})`;
      } else {
        ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha})`;
      }
      ctx.fill();

      // 添加发光效果
      if (!p.isSparkle && p.alpha > 0.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha * 0.2})`;
        ctx.fill();
      }

      // 移除消失的粒子
      if (p.alpha <= 0) {
        state.particles.splice(i, 1);
      }
    }

    animRef.current = requestAnimationFrame(() => animate());
  }, [createExplosion, explodeText, hexToRgb]);

  const trigger = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const state = stateRef.current;

    // 如果之前有动画在运行，先停止
    if (state.stopTimeout) {
      clearTimeout(state.stopTimeout);
      state.stopTimeout = null;
    }
    if (state.textAnimationId) {
      cancelAnimationFrame(state.textAnimationId);
      state.textAnimationId = 0;
    }
    if (state.isActive && animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }

    // 重置 canvas 透明度，确保可见
    canvas.style.transition = '';
    canvas.style.opacity = '';

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.isActive = true;
    state.particles = [];
    state.rockets = [];

    // 随机选择庆祝语和颜色（动画期间保持不变，不闪烁）
    const texts = useTaskStore.getState().celebrationTexts;
    state.currentText = texts[Math.floor(Math.random() * texts.length)] || '目标达成';
    state.textColor = luxuryColors[Math.floor(Math.random() * luxuryColors.length)];
    // 快速连点时，如果文字已经在显示，不要重置，避免一闪而过
    if (state.textOpacity < 0.3) {
      state.textOpacity = 0;
      state.textScale = 0.8;
    }

    // 文字动画：快速淡入放大
    const textAnimDuration = 800;
    const textStartTime = Date.now();

    const animateText = () => {
      if (!state.isActive) return;
      const elapsed = Date.now() - textStartTime;
      const progress = Math.min(elapsed / textAnimDuration, 1);

      const easeOutBack = (x: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      };

      state.textOpacity = Math.min(progress * 1.5, 1);
      state.textScale = 0.8 + easeOutBack(progress) * 0.2;

      if (progress < 1) {
        state.textAnimationId = requestAnimationFrame(animateText);
      } else {
        state.textAnimationId = 0;
      }
    };
    state.textAnimationId = requestAnimationFrame(animateText);

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    function createRocket(x: number, targetY: number, delay = 0) {
      setTimeout(() => {
        if (!state.isActive) return;
        state.rockets.push({
          x,
          y: canvas!.height,
          targetY,
          speed: 6 + Math.random() * 4,
          trail: [],
          color: luxuryColors[Math.floor(Math.random() * luxuryColors.length)],
          exploded: false,
        });
      }, delay);
    }

    function createRocketWithCallback(
      x: number,
      targetY: number,
      delay: number,
      onExplode: (rx: number, ry: number) => void
    ) {
      setTimeout(() => {
        if (!state.isActive) return;
        state.rockets.push({
          x,
          y: canvas!.height,
          targetY,
          speed: 6 + Math.random() * 4,
          trail: [],
          color: luxuryColors[Math.floor(Math.random() * luxuryColors.length)],
          exploded: false,
          onExplode,
        });
      }, delay);
    }

    // 一波 - 25发连续升空（1.5秒内全部发射）
    createRocket(centerX, centerY - 100, 0);
    createRocket(centerX - 200, centerY - 80, 60);
    createRocket(centerX + 200, centerY - 80, 120);
    createRocket(centerX - 350, centerY - 60, 180);
    createRocket(centerX + 350, centerY - 60, 240);
    createRocket(centerX - 150, centerY - 130, 300);
    createRocket(centerX + 150, centerY - 130, 360);
    createRocket(centerX - 300, centerY - 100, 420);
    createRocket(centerX + 300, centerY - 100, 480);
    createRocket(centerX, centerY - 160, 540);
    createRocket(centerX - 400, centerY - 70, 600);
    createRocket(centerX + 400, centerY - 70, 660);
    createRocket(centerX, centerY - 200, 720);
    createRocket(centerX - 180, centerY - 150, 780);
    createRocket(centerX + 180, centerY - 150, 840);
    createRocket(centerX - 320, centerY - 120, 900);
    createRocket(centerX + 320, centerY - 120, 960);
    createRocket(centerX - 100, centerY - 240, 1020);
    createRocket(centerX + 100, centerY - 240, 1080);
    createRocket(centerX - 450, centerY - 90, 1140);
    createRocket(centerX + 450, centerY - 90, 1200);
    createRocket(centerX, centerY - 300, 1260);
    createRocket(centerX - 250, centerY - 180, 1320);
    createRocket(centerX + 250, centerY - 180, 1380);
    createRocket(centerX - 500, centerY - 110, 1440);
    // 最后一发烟花，带回调触发文字爆炸散落
    createRocketWithCallback(centerX + 500, centerY - 110, 1500, (rocketX, rocketY) => {
      explodeText(rocketX, rocketY);
    });

    animate();

    // 4秒后停止（1.5秒放完烟花 + 1.5秒欣赏消散 + 1秒淡出）
    state.stopTimeout = setTimeout(() => {
      state.stopTimeout = null;
      stop();
    }, 4000);
  }, [animate, stop, explodeText]);

  useEffect(() => {
    registerFireworksTrigger(trigger);
    return () => registerFireworksTrigger(null);
  }, [trigger]);

  // Drag support
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    // Calculate default position if not stored: align right edge with tasks-container
    const hasStored = (() => {
      try { return !!localStorage.getItem('fireworks-btn-pos'); } catch { return false; }
    })();
    if (!hasStored) {
      const container = document.querySelector('.tasks-container');
      if (container) {
        const cr = container.getBoundingClientRect();
        // CSS: right: 174px, so button right edge = viewportWidth - 174 + translateX
        // Align: viewportWidth - 174 + posX = cr.right  =>  posX = cr.right - viewportWidth + 174
        posX.current = cr.right - window.innerWidth + 174;
        posY.current = 0;
      }
    }

    // Apply stored position on mount
    btn.style.transform = `translate(${posX.current}px, ${posY.current}px)`;

    const down = (e: PointerEvent) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      isDragging.current = true;
      hasMoved.current = false;
      dragStart.current = { x: e.clientX - posX.current, y: e.clientY - posY.current };
    };

    const move = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const x = e.clientX - dragStart.current.x;
      const y = e.clientY - dragStart.current.y;
      if (Math.abs(x - posX.current) > 2 || Math.abs(y - posY.current) > 2) {
        hasMoved.current = true;
      }
      posX.current = x;
      posY.current = y;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    };

    const up = () => {
      isDragging.current = false;
      try {
        localStorage.setItem('fireworks-btn-pos', JSON.stringify({ x: posX.current, y: posY.current }));
      } catch {}
    };

    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointermove', move);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    return () => {
      btn.removeEventListener('pointerdown', down);
      btn.removeEventListener('pointermove', move);
      btn.removeEventListener('pointerup', up);
      btn.removeEventListener('pointercancel', up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    };
    resize();
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleClick = useCallback(() => {
    if (hasMoved.current) return;
    trigger();
  }, [trigger]);

  return (
    <>
      <button ref={btnRef} onClick={handleClick} title="来一发庆祝" className="fireworks-float-btn">
        <Rocket size={20} />
        <span>来一发</span>
      </button>
      <canvas
        ref={canvasRef}
        id="fireworks-canvas"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
    </>
  );
}
