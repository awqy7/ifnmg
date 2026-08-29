'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';

type Phase = 'idle' | 'login' | 'sync' | 'complete' | 'error';

interface SyncStep {
  id: string;
  label: string;
  progress?: number;
  status?: 'pending' | 'active' | 'done' | 'error';
}

export const SYNC_STEPS = [
  { id: 'auth', label: 'Autenticando no Virtual2...' },
  { id: 'courses', label: 'Carregando disciplinas...' },
  { id: 'activities', label: 'Sincronizando atividades...' },
  { id: 'materials', label: 'Baixando materiais e PDFs...' },
  { id: 'grades', label: 'Atualizando notas...' },
  { id: 'calendar', label: 'Sincronizando calendário...' },
  { id: 'briefing', label: 'Gerando briefing matinal...' },
];

export function ImmersiveLoader({
  phase,
  syncProgress,
  onLoginComplete,
  onSyncComplete,
  onError,
  children,
}: {
  phase: Phase;
  syncProgress?: { currentStep: number; stepProgress: number; totalSteps: number };
  onLoginComplete?: () => void;
  onSyncComplete?: () => void;
  onError?: (msg: string) => void;
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const [steps, setSteps] = useState<SyncStep[]>(
    (SYNC_STEPS as SyncStep[]).map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending', progress: 0 }))
  );

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement?.getBoundingClientRect() || { width: 400, height: 400 };
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (phase === 'sync' && syncProgress) {
      setSteps(prev => prev.map((s, i) => {
        if (i < syncProgress.currentStep) return { ...s, status: 'done', progress: 1 };
        if (i === syncProgress.currentStep) return { ...s, status: 'active', progress: syncProgress.stepProgress };
        return s;
      }));
    }
  }, [phase, syncProgress]);

  useEffect(() => {
    if (phase === 'login') {
      onLoginComplete?.();
    }
    if (phase === 'complete') {
      onSyncComplete?.();
    }
    if (phase === 'error') {
      onError?.('Erro na sincronização');
    }
  }, [phase, onLoginComplete, onSyncComplete, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2 / (window.devicePixelRatio || 1);
    const centerY = canvas.height / 2 / (window.devicePixelRatio || 1);
    const radius = Math.min(centerX, centerY) * 0.7;

    let lastTime = 0;
    const particles: Particle[] = [];
    const rings: Ring[] = [];
    const waves: Wave[] = [];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      hue: number;
      alpha: number;
      trail: { x: number; y: number; alpha: number }[];
    }

    interface Ring {
      radius: number;
      maxRadius: number;
      alpha: number;
      hue: number;
      width: number;
      speed: number;
      delay: number;
    }

    interface Wave {
      angle: number;
      radius: number;
      amplitude: number;
      frequency: number;
      phase: number;
      hue: number;
      alpha: number;
      speed: number;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.3 + Math.random() * 0.7);
        particles.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: Math.random() * 100,
          maxLife: 100 + Math.random() * 200,
          size: 1 + Math.random() * 3,
          hue: 255 + Math.random() * 30,
          alpha: 0.3 + Math.random() * 0.5,
          trail: [],
        });
      }
    }

    function initRings() {
      rings.length = 0;
      for (let i = 0; i < 5; i++) {
        rings.push({
          radius: radius * (0.2 + i * 0.15),
          maxRadius: radius * (0.5 + i * 0.1),
          alpha: 0.15 - i * 0.02,
          hue: 255 + i * 15,
          width: 1 + i * 0.5,
          speed: 0.3 + i * 0.1,
          delay: i * 500,
        });
      }
    }

    function initWaves() {
      waves.length = 0;
      for (let i = 0; i < 6; i++) {
        waves.push({
          angle: (i / 6) * Math.PI * 2,
          radius: radius * 0.4,
          amplitude: 15 + i * 8,
          frequency: 0.02 + i * 0.005,
          phase: Math.random() * Math.PI * 2,
          hue: 255 + i * 10,
          alpha: 0.4 - i * 0.05,
          speed: 0.5 + i * 0.1,
        });
      }
    }

    function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
      gradient.addColorStop(0, '#0a0a12');
      gradient.addColorStop(0.5, '#0f0f1a');
      gradient.addColorStop(1, '#08080f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(t * 0.0001 + i) * 0.5 + 0.5) * w;
        const y = (Math.cos(t * 0.00013 + i * 1.3) * 0.5 + 0.5) * h;
        const r = radius * (0.5 + Math.sin(t * 0.0002 + i) * 0.3);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'hsla(255, 80%, 60%, 0.1)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawOrbitals(ctx: CanvasRenderingContext2D, t: number) {
      const orbitalCount = 3;
      for (let o = 0; o < orbitalCount; o++) {
        const orbitRadius = radius * (0.35 + o * 0.18);
        const speed = 0.15 + o * 0.08;
        const satellites = 4 + o * 2;

        ctx.save();
        ctx.strokeStyle = 'hsla(255, 70%, 55%, 0.08)';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = t * 0.02;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        for (let s = 0; s < satellites; s++) {
          const angle = (s / satellites) * Math.PI * 2 + t * speed + o * 1.2;
          const x = centerX + Math.cos(angle) * orbitRadius;
          const y = centerY + Math.sin(angle) * orbitRadius;
          const pulse = Math.sin(t * 0.005 + s * 2) * 0.3 + 0.7;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle + Math.PI / 2);
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * pulse);
          grad.addColorStop(0, `hsla(255, 80%, 70%, ${0.8 * pulse})`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, 4 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    function drawWaves(ctx: CanvasRenderingContext2D, t: number, phase: Phase) {
      const progress = phase === 'sync' && syncProgress
        ? syncProgress.currentStep / syncProgress.totalSteps
        : 0;

      waves.forEach((wave, i) => {
        wave.phase += wave.speed * 0.01;
        const points = 60;
        const baseRadius = radius * (0.45 + progress * 0.35);

        ctx.save();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let layer = 0; layer < 3; layer++) {
          const layerAlpha = wave.alpha * (1 - layer * 0.25);
          const layerAmplitude = wave.amplitude * (1 + layer * 0.3);
          ctx.strokeStyle = `hsla(${wave.hue + layer * 5}, 70%, 60%, ${layerAlpha})`;

          ctx.beginPath();
          for (let p = 0; p <= points; p++) {
            const pointAngle = (p / points) * Math.PI * 2;
            const waveOffset = Math.sin(pointAngle * wave.frequency * 100 + wave.phase) * layerAmplitude;
            const r = baseRadius + waveOffset * Math.sin(t * 0.002 + p * 0.1);
            const x = centerX + Math.cos(pointAngle) * r;
            const y = centerY + Math.sin(pointAngle) * r;

            if (p === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    function drawParticles(ctx: CanvasRenderingContext2D, t: number, phase: Phase) {
      const isSync = phase === 'sync';

      particles.forEach((p, idx) => {
        p.life++;
        if (p.life > p.maxLife) {
          const angle = Math.random() * Math.PI * 2;
          const r = radius * (0.3 + Math.random() * 0.7);
          p.x = centerX + Math.cos(angle) * r;
          p.y = centerY + Math.sin(angle) * r;
          p.life = 0;
          p.maxLife = 100 + Math.random() * 200;
          p.hue = 255 + Math.random() * 30;
          p.trail = [];
        }

        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const force = isSync ? 0.0005 : 0.0002;
        p.vx += dx * force + (Math.random() - 0.5) * 0.02;
        p.vy += dy * force + (Math.random() - 0.5) * 0.02;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        p.trail.unshift({ x: p.x, y: p.y, alpha: p.alpha });
        if (p.trail.length > 15) p.trail.pop();

        p.trail.forEach((pt, ti) => {
          const trailAlpha = pt.alpha * (1 - ti / p.trail.length) * 0.3;
          const size = p.size * (1 - ti / p.trail.length);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${trailAlpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fill();
        });

        const pulseAlpha = p.alpha * (0.5 + Math.sin(t * 0.01 + idx) * 0.3);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawCore(ctx: CanvasRenderingContext2D, t: number, phase: Phase) {
      const isSync = phase === 'sync';
      const progress = isSync && syncProgress ? syncProgress.currentStep / syncProgress.totalSteps : 0;

      const coreRadius = radius * (0.15 + progress * 0.15);
      const pulse = Math.sin(t * 0.003) * 0.15 + 1;
      const r = coreRadius * pulse;

      const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r * 2);
      if (isSync) {
        grad.addColorStop(0, `hsla(200, 80%, 70%, ${0.8 + progress * 0.2})`);
        grad.addColorStop(0.5, `hsla(255, 70%, 60%, ${0.5 + progress * 0.3})`);
        grad.addColorStop(1, 'transparent');
      } else {
        grad.addColorStop(0, 'hsla(255, 80%, 75%, 0.9)');
        grad.addColorStop(0.5, 'hsla(265, 80%, 65%, 0.6)');
        grad.addColorStop(1, 'transparent');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `hsla(255, 70%, 65%, ${0.4 + Math.sin(t * 0.005) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawRings(ctx: CanvasRenderingContext2D, t: number, phase: Phase) {
      if (phase !== 'sync') return;

      rings.forEach((ring, i) => {
        ring.radius += ring.speed * 0.5;
        if (ring.radius > ring.maxRadius) {
          ring.radius = radius * (0.2 + i * 0.15);
        }
        ring.alpha = Math.max(0, 0.15 * (1 - (ring.radius - radius * (0.2 + i * 0.15)) / (ring.maxRadius - radius * (0.2 + i * 0.15))));

        ctx.strokeStyle = `hsla(${ring.hue}, 70%, 60%, ${ring.alpha})`;
        ctx.lineWidth = ring.width;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    function drawProgressRing(ctx: CanvasRenderingContext2D, phase: Phase) {
      if (phase !== 'sync' || !syncProgress) return;

      const progress = syncProgress.currentStep / syncProgress.totalSteps;
      const stepProgress = syncProgress.stepProgress;
      const totalProgress = (syncProgress.currentStep + stepProgress) / syncProgress.totalSteps;

      const r = radius * 0.85;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      ctx.strokeStyle = 'hsla(255, 70%, 50%, 0.15)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createLinearGradient(
        centerX - r, centerY - r,
        centerX + r, centerY + r
      );
      grad.addColorStop(0, 'hsl(200, 80%, 60%)');
      grad.addColorStop(0.5, 'hsl(255, 70%, 60%)');
      grad.addColorStop(1, 'hsl(280, 70%, 65%)');

      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, -Math.PI / 2, -Math.PI / 2 + totalProgress * Math.PI * 2);
      ctx.stroke();

      const dotAngle = -Math.PI / 2 + totalProgress * Math.PI * 2;
      const dotX = centerX + Math.cos(dotAngle) * r;
      const dotY = centerY + Math.sin(dotAngle) * r;
      ctx.fillStyle = 'hsl(200, 80%, 70%)';
      ctx.shadowColor = 'hsl(200, 80%, 70%)';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawText(ctx: CanvasRenderingContext2D, w: number, h: number, phase: Phase) {
      ctx.save();
      ctx.font = '500 14px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (phase === 'login') {
        const pulse = Math.sin(timeRef.current * 0.002) * 0.3 + 0.7;
        ctx.fillStyle = `hsla(255, 70%, 70%, ${pulse})`;
        ctx.fillText('Conectando ao Virtual2', centerX, centerY + radius * 1.3);

        ctx.font = '300 12px "Inter", system-ui, sans-serif';
        ctx.fillStyle = 'hsla(255, 50%, 60%, 0.6)';
        const dots = '.'.repeat(Math.floor(timeRef.current / 300 % 4));
        ctx.fillText(`Autenticando credenciais${dots}`, centerX, centerY + radius * 1.5);
      } else if (phase === 'sync' && syncProgress) {
        const current = steps[syncProgress.currentStep];
        if (current) {
          ctx.fillStyle = 'hsla(200, 80%, 70%, 0.9)';
          ctx.fillText(current.label, centerX, centerY + radius * 1.25);

          ctx.font = '300 12px "Inter", system-ui, sans-serif';
          ctx.fillStyle = 'hsla(255, 50%, 60%, 0.5)';
          ctx.fillText(
            `Disciplina ${syncProgress.currentStep + 1} de ${syncProgress.totalSteps} · ${Math.round(syncProgress.stepProgress * 100)}%`,
            centerX,
            centerY + radius * 1.5
          );
        }
      }
      ctx.restore();
    }

    function animate(currentTime: number) {
      const dt = currentTime - lastTime;
      lastTime = currentTime;
      timeRef.current = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      drawBackground(ctx, w, h, currentTime);
      drawOrbitals(ctx, currentTime);
      drawWaves(ctx, currentTime, phase);
      drawParticles(ctx, currentTime, phase);
      drawRings(ctx, currentTime, phase);
      drawCore(ctx, currentTime, phase);
      drawProgressRing(ctx, phase);
      drawText(ctx, w, h, phase);

      animationRef.current = requestAnimationFrame(animate);
    }

    initParticles();
    initRings();
    initWaves();

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, syncProgress, steps]);

  if (phase === 'idle') return null;

  const messages = {
    login: 'Conectando ao Virtual2 IFNMG...',
    sync: 'Sincronizando seus dados acadêmicos...',
    complete: 'Tudo pronto! 🎓',
    error: 'Ocorreu um erro. Tente novamente.',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#08080f] overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={messages[phase]}
    >
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#08080f] overflow-hidden"
        role="status"
        aria-live="polite"
        aria-label={messages[phase]}
      >
        <div className="relative w-full h-full max-w-[500px] max-h-[500px] p-8">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            aria-hidden="true"
          />
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center px-4">
          {phase === 'sync' && syncProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span>Sincronizando dados acadêmicos</span>
                <span className="text-indigo-400 font-mono">
                  {Math.round(((syncProgress.currentStep + syncProgress.stepProgress) / syncProgress.totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-64 h-1.5 bg-gray-800 rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((syncProgress.currentStep + syncProgress.stepProgress) / syncProgress.totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginButton({
  onLogin,
  isLoading,
  children,
  onError,
}: {
  onLogin: () => Promise<void>;
  isLoading: boolean;
  children: ReactNode;
  onError?: (msg: string) => void;
}) {
  const [showLoader, setShowLoader] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [syncProgress, setSyncProgress] = useState<{ currentStep: number; stepProgress: number; totalSteps: number } | null>(null);

  const handleClick = async () => {
    setShowLoader(true);
    setPhase('login');
    try {
      await onLogin();
      setPhase('sync');
      
      const totalSteps = SYNC_STEPS.length;
      for (let i = 0; i < totalSteps; i++) {
        for (let p = 0; p <= 1; p += 0.05) {
          setSyncProgress({ currentStep: i, stepProgress: p, totalSteps });
          await new Promise(r => setTimeout(r, 80));
        }
        setSyncProgress(prev => prev ? { ...prev, stepProgress: 1 } : null);
        await new Promise(r => setTimeout(r, 200));
      }
      
      setPhase('complete');
      await new Promise(r => setTimeout(r, 800));
      setShowLoader(false);
      setPhase('idle');
      setSyncProgress(null);
    } catch (error: any) {
      setPhase('error');
      await new Promise(r => setTimeout(r, 2000));
      setShowLoader(false);
      setPhase('idle');
      setSyncProgress(null);
      onError?.(error.message || "Erro ao conectar. Tente novamente.");
    }
  };

  const loading = showLoader;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading || loading}
        className="relative w-full min-h-11 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm overflow-hidden"
      >
        {loading ? (
          <>
            <span className="flex items-center gap-2">
              <ButtonSpinner />
              <span className="font-medium">{phase === 'login' ? 'Conectando...' : phase === 'sync' ? 'Sincronizando...' : 'Pronto!'}</span>
            </span>
          </>
        ) : (
          children
        )}
      </button>

      {showLoader && (
        <ImmersiveLoader
          phase={phase}
          syncProgress={syncProgress ?? undefined}
          onLoginComplete={() => {}}
          onSyncComplete={() => {}}
        >
          {children}
        </ImmersiveLoader>
      )}
    </>
  );
}

function ButtonSpinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}