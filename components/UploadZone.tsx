'use client';

import { useCallback, useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseCsv } from '@/lib/csv';
import type { CsvRow } from '@/types';

interface UploadZoneProps {
  onParsed: (rows: CsvRow[], fileName: string, skipped: number) => void;
  onError: (message: string) => void;
  fileName: string | null;
  rowCount: number;
  onClear: () => void;
  disabled?: boolean;
}

export function UploadZone({ onParsed, onError, fileName, rowCount, onClear, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onError('Please upload a .csv file.');
        return;
      }
      try {
        const text = await file.text();
        const { rows, skipped } = parseCsv(text);
        onParsed(rows, file.name, skipped);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Could not read that CSV.');
      }
    },
    [onParsed, onError]
  );

  if (fileName) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">{rowCount.toLocaleString()} rows ready</p>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Remove CSV"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center transition-colors',
        isDragging && 'border-primary bg-primary/5',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <UploadCloud className={cn('h-8 w-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
      <p className="text-sm font-medium">Drop your CSV here, or click to browse</p>
      <p className="text-xs text-muted-foreground">Two columns: filename, voice-over text</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
