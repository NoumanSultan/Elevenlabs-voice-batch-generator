import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { textToSpeech } from '@/lib/elevenlabs';
import { retryWithBackoff, HttpError } from '@/lib/retry';
import { runWithConcurrency } from '@/lib/queue';
import { buildFailedCsv } from '@/lib/csv';
import { isAuthEnabled, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_MODEL,
  DEFAULT_VOICE_SETTINGS,
  type CsvRow,
  type FailedRow,
  type ProgressEvent,
  type VoiceSettings
} from '@/types';

// This route can run for a while on large batches. Vercel's Hobby plan caps
// serverless functions at 60s — see README "Large CSVs on Vercel Hobby".
export const runtime = 'nodejs';
export const maxDuration = 300;

interface GenerateRequestBody {
  apiKey?: string;
  voiceId?: string;
  model?: string;
  voiceSettings?: Partial<VoiceSettings>;
  concurrency?: number;
  rows?: CsvRow[];
}

export async function POST(request: NextRequest) {
  if (isAuthEnabled()) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!(await verifySessionToken(token))) {
      return json({ error: 'Unauthorized.' }, 401);
    }
  }

  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const apiKey = (body.apiKey?.trim() || process.env.ELEVENLABS_API_KEY || '').trim();
  const voiceId = (body.voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID || '').trim();
  const model = body.model?.trim() || DEFAULT_MODEL;
  const voiceSettings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...(body.voiceSettings ?? {}) };
  const concurrency = clamp(body.concurrency ?? DEFAULT_CONCURRENCY, 1, 20);
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!apiKey) {
    return json({ error: 'Missing ElevenLabs API key. Enter one in the form or set ELEVENLABS_API_KEY.' }, 400);
  }
  if (!voiceId) {
    return json({ error: 'Missing ElevenLabs Voice ID. Enter one in the form or set ELEVENLABS_VOICE_ID.' }, 400);
  }
  if (rows.length === 0) {
    return json({ error: 'No rows to generate. Upload a CSV with filename/text columns.' }, 400);
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  request.signal.addEventListener('abort', () => {
    cancelled = true;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          // Controller may already be closed if the client disconnected.
        }
      };

      send({ type: 'start', total: rows.length });

      const zip = new JSZip();
      const failedRows: FailedRow[] = [];
      let completed = 0;
      let failed = 0;

      try {
        await runWithConcurrency(
          rows,
          concurrency,
          async (row) => {
            if (cancelled) return;
            send({ type: 'file-start', filename: row.filename });

            try {
              const audio = await retryWithBackoff(
                () => textToSpeech({ apiKey, voiceId, model, text: row.text, voiceSettings }),
                {
                  retries: 3,
                  onRetry: (attempt, error) => {
                    send({
                      type: 'file-retry',
                      filename: row.filename,
                      attempt,
                      reason: describeError(error)
                    });
                  }
                }
              );

              zip.file(`${row.filename}.mp3`, audio);
              completed++;
              send({ type: 'file-success', filename: row.filename, completed, failed, total: rows.length });
            } catch (error) {
              failed++;
              const reason = describeError(error);
              failedRows.push({ filename: row.filename, text: row.text, reason });
              send({ type: 'file-failed', filename: row.filename, completed, failed, total: rows.length, reason });
            }
          },
          () => cancelled
        );

        if (cancelled) {
          send({ type: 'error', message: 'Generation cancelled.' });
          controller.close();
          return;
        }

        if (failedRows.length > 0) {
          zip.file('failed.csv', buildFailedCsv(failedRows));
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        send({
          type: 'done',
          completed,
          failed,
          failedCount: failedRows.length,
          total: rows.length,
          zipBase64: zipBuffer.toString('base64')
        });
      } catch (error) {
        send({ type: 'error', message: describeError(error) });
      } finally {
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no'
    }
  });
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function describeError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Invalid API key.';
    if (error.status === 429) return 'Rate limited by ElevenLabs.';
    if (error.status >= 500) return 'ElevenLabs server error.';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error.';
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
