'use client';

import { useState } from 'react';

type Failure = { id: string; reason: string };
type BatchResult = { processed: number; updated: number; failed: Failure[] };

type State =
  | { kind: 'idle' }
  | { kind: 'running'; done: number; total: number; updated: number; failed: Failure[] }
  | { kind: 'done'; total: number; updated: number; failed: Failure[] }
  | { kind: 'error'; message: string; updated: number };

// Nominatim policy is 1 req/sec → at ~1.1s per geocode, 30 ids fits inside
// Vercel's 60-second function limit with headroom.
const BATCH_SIZE = 30;

export function GeocodeRunner({ ids }: { ids: string[] }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function run() {
    let done = 0;
    let updated = 0;
    const failed: Failure[] = [];
    setState({ kind: 'running', done, total: ids.length, updated, failed });

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const chunk = ids.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch('/api/admin/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({
            kind: 'error',
            message: `Batch starting at ${i + 1} failed: ${body.error ?? res.statusText}`,
            updated,
          });
          return;
        }
        const summary = (await res.json()) as BatchResult;
        updated += summary.updated;
        failed.push(...summary.failed);
        done = Math.min(i + BATCH_SIZE, ids.length);
        setState({ kind: 'running', done, total: ids.length, updated, failed });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
          updated,
        });
        return;
      }
    }

    setState({ kind: 'done', total: ids.length, updated, failed });
  }

  return (
    <div className="mt-6 space-y-4">
      {state.kind === 'idle' && (
        <button
          onClick={run}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Start geocoding ({ids.length} addresses)
        </button>
      )}

      {state.kind === 'running' && (
        <div className="rounded-md bg-teal-50 p-4 text-teal-900">
          <p className="font-medium">
            Geocoding… {state.done.toLocaleString()} / {state.total.toLocaleString()} done · {state.updated} placed
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full bg-teal-700 transition-all duration-300"
              style={{ width: `${(state.done / state.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-teal-800">
            Rate-limited to 1 lookup per second. Don&apos;t close the tab.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Geocoding stopped: {state.message}</p>
          <p className="mt-1">
            {state.updated} addresses were placed before this. Refresh the page to retry
            the remainder.
          </p>
        </div>
      )}

      {state.kind === 'done' && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Geocoding complete</h2>
          <p className="mt-2 text-sm text-ink-700">
            Placed <strong>{state.updated.toLocaleString()}</strong> of {state.total.toLocaleString()} addresses.
            {state.failed.length > 0 && (
              <> {state.failed.length} address{state.failed.length === 1 ? '' : 'es'} could not be matched — edit those parks manually with their coordinates.</>
            )}
          </p>
          <p className="mt-3 text-xs text-ink-500">
            Refresh the page to see the updated list, then visit <a href="/map" className="text-teal-700 underline">/map</a> to see them all plotted.
          </p>
        </div>
      )}
    </div>
  );
}
