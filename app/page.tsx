'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic2, Sparkles, Download, XCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/UploadZone';
import { CredentialsPanel } from '@/components/CredentialsPanel';
import { VoiceSettingsPanel } from '@/components/VoiceSettingsPanel';
import { ProgressPanel } from '@/components/ProgressPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGeneration } from '@/hooks/useGeneration';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_CONCURRENCY, DEFAULT_MODEL, DEFAULT_VOICE_SETTINGS, type CsvRow, type VoiceSettings } from '@/types';

export default function HomePage() {
  const { toast } = useToast();
  const { state, start, cancel, reset, downloadAgain } = useGeneration();

  const [apiKey, setApiKey] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [model, setModel] = useLocalStorage<string>('vbg-model', DEFAULT_MODEL);
  const [concurrency, setConcurrency] = useLocalStorage<number>('vbg-concurrency', DEFAULT_CONCURRENCY);
  const [voiceSettings, setVoiceSettings] = useLocalStorage<VoiceSettings>('vbg-voice-settings', DEFAULT_VOICE_SETTINGS);

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notifiedDoneRef = useRef(false);

  const isGenerating = state.status === 'generating';
  const isDone = state.status === 'done';

  useEffect(() => {
    if (isDone && !notifiedDoneRef.current) {
      notifiedDoneRef.current = true;
      toast({
        title: 'Batch complete',
        description:
          state.failed > 0
            ? `${state.completed} files generated, ${state.failed} failed. ZIP downloaded automatically.`
            : `${state.completed} files generated. ZIP downloaded automatically.`,
        variant: state.failed > 0 ? 'info' : 'success'
      });
    }
    if (state.status === 'error' && state.errorMessage) {
      toast({ title: 'Generation failed', description: state.errorMessage, variant: 'error' });
    }
    if (state.status !== 'done') {
      notifiedDoneRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  function handleParsed(parsedRows: CsvRow[], name: string, skipped: number) {
    setRows(parsedRows);
    setFileName(name);
    setError(null);
    reset();
    toast({
      title: 'CSV loaded',
      description: `${parsedRows.length.toLocaleString()} rows ready${skipped > 0 ? ` (${skipped} blank rows skipped)` : ''}.`,
      variant: 'success'
    });
  }

  function handleClearFile() {
    setRows([]);
    setFileName(null);
    reset();
  }

  function handleClearQueue() {
    handleClearFile();
    toast({ title: 'Queue cleared', variant: 'info' });
  }

  async function handleGenerate() {
    setError(null);
    if (rows.length === 0) {
      setError('Upload a CSV first.');
      return;
    }
    await start({ apiKey, voiceId, model, voiceSettings, concurrency, rows });
  }

  const canGenerate = rows.length > 0 && !isGenerating;

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Mic2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none">Voice Batch Generator</h1>
              <p className="text-xs text-muted-foreground">CSV in, MP3s out</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Generate a batch
            </CardTitle>
            <CardDescription>
              Upload a two-column CSV (filename, voice-over text) and get every line back as an MP3, zipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UploadZone
              onParsed={handleParsed}
              onError={setError}
              fileName={fileName}
              rowCount={rows.length}
              onClear={handleClearFile}
              disabled={isGenerating}
            />

            <CredentialsPanel
              apiKey={apiKey}
              setApiKey={setApiKey}
              voiceId={voiceId}
              setVoiceId={setVoiceId}
              model={model}
              setModel={setModel}
              concurrency={concurrency}
              setConcurrency={setConcurrency}
              disabled={isGenerating}
            />

            <VoiceSettingsPanel settings={voiceSettings} onChange={setVoiceSettings} disabled={isGenerating} />

            {error && <p className="text-sm text-destructive">{error}</p>}

            {state.status !== 'idle' && <ProgressPanel state={state} />}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {!isGenerating ? (
                <Button onClick={handleGenerate} disabled={!canGenerate} size="lg" className="flex-1 sm:flex-none">
                  <Sparkles className="h-4 w-4" />
                  Generate
                </Button>
              ) : (
                <Button onClick={cancel} variant="destructive" size="lg" className="flex-1 sm:flex-none">
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              )}

              {isDone && (
                <Button onClick={downloadAgain} variant="outline" size="lg">
                  <Download className="h-4 w-4" />
                  Download ZIP again
                </Button>
              )}

              {rows.length > 0 && !isGenerating && (
                <Button onClick={handleClearQueue} variant="ghost" size="lg">
                  <Trash2 className="h-4 w-4" />
                  Clear queue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Your API key is sent only for this request and never stored on the server.
        </p>
      </div>
    </main>
  );
}
