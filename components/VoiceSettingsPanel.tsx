'use client';

import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { VoiceSettings } from '@/types';

interface SliderRowProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function SliderRow({ label, hint, value, onChange, disabled }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={1}
        step={0.01}
        disabled={disabled}
        onValueChange={([v]) => onChange(v ?? value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

interface VoiceSettingsPanelProps {
  settings: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
  disabled?: boolean;
}

export function VoiceSettingsPanel({ settings, onChange, disabled }: VoiceSettingsPanelProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SliderRow
        label="Speed"
        hint="How fast the voice speaks."
        value={settings.speed}
        disabled={disabled}
        onChange={(v) => onChange({ ...settings, speed: v })}
      />
      <SliderRow
        label="Stability"
        hint="Lower is more expressive, higher is more consistent."
        value={settings.stability}
        disabled={disabled}
        onChange={(v) => onChange({ ...settings, stability: v })}
      />
      <SliderRow
        label="Similarity"
        hint="How closely it matches the original voice."
        value={settings.similarityBoost}
        disabled={disabled}
        onChange={(v) => onChange({ ...settings, similarityBoost: v })}
      />
      <SliderRow
        label="Style exaggeration"
        hint="Amplifies the speaker's original style."
        value={settings.styleExaggeration}
        disabled={disabled}
        onChange={(v) => onChange({ ...settings, styleExaggeration: v })}
      />
    </div>
  );
}
