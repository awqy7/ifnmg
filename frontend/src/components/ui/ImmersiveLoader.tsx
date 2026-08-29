'use client';

import { useState, ReactNode } from 'react';

export const SYNC_STEPS = [
  { id: 'auth', label: 'Autenticando no Virtual2...' },
  { id: 'courses', label: 'Carregando disciplinas...' },
  { id: 'activities', label: 'Sincronizando atividades...' },
  { id: 'materials', label: 'Baixando materiais e PDFs...' },
  { id: 'grades', label: 'Atualizando notas...' },
  { id: 'calendar', label: 'Sincronizando calendário...' },
  { id: 'briefing', label: 'Gerando briefing matinal...' },
];

type Phase = 'idle' | 'login' | 'sync' | 'complete' | 'error';

export function LoginButton({
  onLogin,
  children,
  onError,
}: {
  onLogin: () => Promise<void>;
  children: ReactNode;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [syncProgress, setSyncProgress] = useState<{ currentStep: number; stepProgress: number; totalSteps: number } | null>(null);

  const handleClick = async () => {
    setLoading(true);
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
      setLoading(false);
      setPhase('idle');
      setSyncProgress(null);
    } catch (error: any) {
      setPhase('error');
      await new Promise(r => setTimeout(r, 2000));
      setLoading(false);
      setPhase('idle');
      setSyncProgress(null);
      onError?.(error.message || "Erro ao conectar. Tente novamente.");
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="relative w-full min-h-11 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm overflow-hidden"
      >
        {loading ? (
          <>
            <span className="flex items-center gap-2">
              <ButtonSpinner />
              <span className="font-medium">
                {phase === 'login' ? 'Conectando...' : phase === 'sync' ? 'Sincronizando...' : 'Pronto!'}
              </span>
            </span>
          </>
        ) : (
          children
        )}
      </button>
    </>
  );
}

function ButtonSpinner() {
  return (
    <svg
      className="w-6 h-6 text-white pacman-spinner"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="50 0 500 300"
      aria-hidden="true"
      style={{ width: '24px', height: '24px' }}
    >
      <style>{`
        .pacman3351-dot {
          fill: currentColor;
        }
        .pacman3351-open,
        .pacman3351-mouth-top,
        .pacman3351-mouth-bottom {
          fill: currentColor;
        }
        .pacman3351-mouth-top,
        .pacman3351-mouth-bottom {
          animation-duration: 175ms;
          animation-timing-function: linear;
          animation-direction: alternate;
          animation-iteration-count: infinite;
          transform-origin: 150px 150px;
        }
        .pacman3351-mouth-top {
          animation-name: rotate3351-counterclockwise;
        }
        .pacman3351-mouth-bottom {
          animation-name: rotate3351-clockwise;
        }
        @keyframes rotate3351-counterclockwise {
          100% { transform: rotate(-30deg); }
        }
        @keyframes rotate3351-clockwise {
          100% { transform: rotate(30deg); }
        }
        .pacman3351-dot {
          animation-name: dot3351-motion;
          animation-duration: 600ms;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes dot3351-motion {
          100% { transform: translateX(-100px); }
        }
      `}</style>
      <circle className="pacman3351-dot" cx="250" cy="50%" r="10"/>
      <circle className="pacman3351-dot" cx="350" cy="50%" r="10"/>
      <circle className="pacman3351-dot" cx="450" cy="50%" r="10"/>
      <circle className="pacman3351-dot" cx="550" cy="50%" r="10"/>
      <circle className="pacman3351-dot" cx="650" cy="50%" r="10"/>
      <path className="pacman3351-mouth-bottom" d="M 150,150 L 220.4,221.0 A 100 100 0 0 0 250,150 Z"/>
      <path className="pacman3351-mouth-top" d="M 150,150 L 220.4,79.0 A 100 100 0 0 1 250,150 Z"/>
      <path className="pacman3351-open" d="M 150,150 L 236.6,100 A 100 100 0 1 0 236.6,200 Z"/>
    </svg>
  );
}