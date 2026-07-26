'use client';

import { useCallback, useRef, useState } from 'react';
import type { CsvRow, ProgressEvent, VoiceSettings } from '@/types';

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'cancelled' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  total: number;
  completed: number;
  failed: number;
  currentFile: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  errorMessage: string | null;
  failedCount: number;
}

const initialState: GenerationState = {
  status: 'idle',
  total: 0,
  completed: 0,
  failed: 0,
  currentFile: null,
  startedAt: null,
  finishedAt: null,
  errorMessage: null,
  failedCount: 0
};

export interface StartGenerationParams {
  apiKey: string;
  voiceId: string;
  model: string;
  voiceSettings: VoiceSettings;
  concurrency: number;
  rows: CsvRow[];
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const zipUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = null;
    }
    setState(initialState);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const start = useCallback(async (params: StartGenerationParams) => {
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      ...initialState,
      status: 'generating',
      total: params.rows.length,
      startedAt: Date.now()
    });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        const errorBody = await safeJson(response);
        throw new Error(errorBody?.error || `Request failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          handleEvent(JSON.parse(line) as ProgressEvent);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setState((prev) => ({ ...prev, status: 'cancelled', finishedAt: Date.now() }));
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Something went wrong.',
          finishedAt: Date.now()
        }));
      }
    }

    function handleEvent(event: ProgressEvent) {
      switch (event.type) {
        case 'start':
          setState((prev) => ({ ...prev, total: event.total ?? prev.total }));
          break;
        case 'file-start':
          setState((prev) => ({ ...prev, currentFile: event.filename ?? prev.currentFile }));
          break;
        case 'file-success':
        case 'file-failed':
          setState((prev) => ({
            ...prev,
            completed: event.completed ?? prev.completed,
            failed: event.failed ?? prev.failed,
            currentFile: event.filename ?? prev.currentFile
          }));
          break;
        case 'file-retry':
          // Reflected as part of currentFile status text; no dedicated state needed.
          break;
        case 'done': {
          const blobUrl = event.zipBase64 ? base64ToBlobUrl(event.zipBase64) : null;
          zipUrlRef.current = blobUrl;
          setState((prev) => ({
            ...prev,
            status: 'done',
            completed: event.completed ?? prev.completed,
            failed: event.failed ?? prev.failed,
            failedCount: event.failedCount ?? prev.failedCount,
            finishedAt: Date.now(),
            currentFile: null
          }));
          if (blobUrl) {
            triggerDownload(blobUrl, 'output.zip');
          }
          break;
        }
        case 'error':
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: event.message ?? 'Generation failed.',
            finishedAt: Date.now()
          }));
          break;
      }
    }
  }, []);

  const downloadAgain = useCallback(() => {
    if (zipUrlRef.current) {
      triggerDownload(zipUrlRef.current, 'output.zip');
    }
  }, []);

  return { state, start, cancel, reset, downloadAgain };
}

function base64ToBlobUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/zip' });
  return URL.createObjectURL(blob);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function safeJson(response: Response): Promise<{ error?: string } | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
