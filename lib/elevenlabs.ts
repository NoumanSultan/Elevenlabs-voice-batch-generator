import { HttpError } from './retry';
import type { VoiceSettings } from '@/types';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export interface TextToSpeechParams {
  apiKey: string;
  voiceId: string;
  model: string;
  text: string;
  voiceSettings: VoiceSettings;
  timeoutMs?: number;
}

/**
 * Calls ElevenLabs' text-to-speech endpoint and returns raw MP3 bytes.
 * Throws HttpError for non-2xx responses so retry logic can classify them.
 */
export async function textToSpeech({
  apiKey,
  voiceId,
  model,
  text,
  voiceSettings,
  timeoutMs = 60000
}: TextToSpeechParams): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: voiceSettings.stability,
          similarity_boost: voiceSettings.similarityBoost,
          style: voiceSettings.styleExaggeration,
          speed: voiceSettings.speed,
          use_speaker_boost: true
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const bodyText = await safeReadText(response);
      throw new HttpError(
        `ElevenLabs request failed (${response.status}): ${bodyText || response.statusText}`,
        response.status
      );
    }

    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out while contacting ElevenLabs.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    // ElevenLabs returns JSON error bodies; keep the message short.
    return text.slice(0, 300);
  } catch {
    return '';
  }
}
