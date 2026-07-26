'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MODEL_OPTIONS } from '@/types';

interface CredentialsPanelProps {
  apiKey: string;
  setApiKey: (v: string) => void;
  voiceId: string;
  setVoiceId: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  concurrency: number;
  setConcurrency: (v: number) => void;
  disabled?: boolean;
}

export function CredentialsPanel({
  apiKey,
  setApiKey,
  voiceId,
  setVoiceId,
  model,
  setModel,
  concurrency,
  setConcurrency,
  disabled
}: CredentialsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="apiKey">ElevenLabs API key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Uses ELEVENLABS_API_KEY if blank"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="voiceId">Voice ID</Label>
          <Input
            id="voiceId"
            type="text"
            placeholder="Uses ELEVENLABS_VOICE_ID if blank"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select id="model" value={model} onChange={(e) => setModel(e.target.value)} disabled={disabled}>
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="concurrency">Concurrency</Label>
          <Input
            id="concurrency"
            type="number"
            min={1}
            max={20}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value) || 1)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
