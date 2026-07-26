'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/utils';
import type { GenerationState } from '@/hooks/useGeneration';

interface ProgressPanelProps {
  state: GenerationState;
}

export function ProgressPanel({ state }: ProgressPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== 'generating') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [state.status]);

  const { total, completed, failed, status, startedAt, finishedAt, currentFile } = state;
  const processed = completed + failed;
  const percent = total > 0 ? (processed / total) * 100 : 0;

  const elapsedMs = startedAt ? (finishedAt ?? now) - startedAt : 0;
  const filesPerSec = elapsedMs > 0 ? processed / (elapsedMs / 1000) : 0;
  const remaining = Math.max(0, total - processed);
  const etaMs = filesPerSec > 0 ? (remaining / filesPerSec) * 1000 : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 font-medium">
          {status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {status === 'done' && failed === 0 && <CheckCircle2 className="h-4 w-4 text-success" />}
          {status === 'done' && failed > 0 && <AlertTriangle className="h-4 w-4 text-accent" />}
          <span>
            {status === 'generating' && `Generating — ${processed} / ${total}`}
            {status === 'done' && `Done — ${completed} / ${total} generated${failed > 0 ? `, ${failed} failed` : ''}`}
            {status === 'cancelled' && 'Cancelled'}
            {status === 'error' && 'Something went wrong'}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
      </div>

      <Progress value={percent} />

      {status === 'generating' && currentFile && (
        <p className="truncate text-xs text-muted-foreground">
          Current file: <span className="font-mono">{currentFile}.mp3</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="Completed" value={completed.toLocaleString()} />
        <Stat label="Failed" value={failed.toLocaleString()} />
        <Stat label="Elapsed" value={formatDuration(elapsedMs)} />
        <Stat
          label={status === 'generating' ? 'ETA' : 'Speed'}
          value={status === 'generating' ? formatDuration(etaMs) : `${filesPerSec.toFixed(1)} files/s`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium">{value}</p>
    </div>
  );
}
