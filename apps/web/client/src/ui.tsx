import type { ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'zinc' | 'red';

const TONES: Record<Tone, string> = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  zinc: 'bg-zinc-100 text-zinc-700',
  red: 'bg-red-100 text-red-800',
};

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="border-b border-zinc-100 px-4 py-3 text-sm font-medium">{children}</div>;
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      出错了：{msg}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
      {children}
    </div>
  );
}

export function statusTone(s: string): Tone {
  if (s === 'approved') return 'green';
  if (s === 'drafting' || s === 'in_progress') return 'amber';
  return 'zinc';
}
