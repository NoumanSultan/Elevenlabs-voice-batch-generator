/**
 * Runs an array of items through `worker` with at most `concurrency`
 * running at the same time. Never rejects — the caller's worker is
 * responsible for catching its own errors, so one failure never stops
 * the rest of the batch.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
  shouldCancel?: () => boolean
): Promise<void> {
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let cursor = 0;

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      if (shouldCancel?.()) return;
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      await worker(item, index);
    }
  }

  const workers = Array.from({ length: limit }, () => runNext());
  await Promise.all(workers);
}
