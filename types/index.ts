export interface CsvRow {
  filename: string;
  text: string;
}

export interface VoiceSettings {
  speed: number;
  stability: number;
  similarityBoost: number;
  styleExaggeration: number;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  speed: 0.45,
  stability: 0.45,
  similarityBoost: 0.45,
  styleExaggeration: 0.4
};

export const DEFAULT_MODEL = 'eleven_multilingual_v2';
export const DEFAULT_CONCURRENCY = 5;

export const MODEL_OPTIONS = [
  { value: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2 (default)' },
  { value: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5' },
  { value: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5' },
  { value: 'eleven_monolingual_v1', label: 'Eleven Monolingual v1' }
] as const;

export interface GenerationConfig {
  apiKey: string;
  voiceId: string;
  model: string;
  voiceSettings: VoiceSettings;
  concurrency: number;
  rows: CsvRow[];
}

export type ProgressEventType =
  | 'start'
  | 'file-start'
  | 'file-success'
  | 'file-failed'
  | 'file-retry'
  | 'done'
  | 'error';

export interface ProgressEvent {
  type: ProgressEventType;
  total?: number;
  completed?: number;
  failed?: number;
  filename?: string;
  attempt?: number;
  reason?: string;
  message?: string;
  zipBase64?: string;
  failedCount?: number;
}

export interface FailedRow {
  filename: string;
  text: string;
  reason: string;
}
