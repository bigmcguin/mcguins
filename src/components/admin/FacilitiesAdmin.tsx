'use client';

import { useState } from 'react';
import { parseLooseJson } from '@/lib/loose-json';

type Result =
  | { row: number; village?: string; status: 'linked'; matched: number; ignored: number }
  | { row: number; village?: string; status: 'skipped'; reason: string };

type Summary = { total: number; linked: number; skipped: number; totalLinks: number; results: Result[] };

// Smaller batches mean a failure (timeout, bad row) only loses a few rows,
// and surfaces faster. The two-query bulk update means even 25 entries
// per batch barely takes a second on the server.
const CHUNK_SIZE = 25;

export function FacilitiesAdmin() {
  const [syncState, setSyncState] = useState<{ kind: 'idle' } | { kind: 'running' } | { kind: 'done'; inserted: number; updated: number; total: number } | { kind: 'error'; message: string }>({ kind: 'idle' });

  async function syncTaxonomy() {
    setSyncState({ kind: 'running' });
    const res = await fetch('/api/admin/facilities/sync', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSyncState({ kind: 'error', message: body.error ?? `Server returned ${res.status}` });
      return;
    }
    const data = await res.json();
    setSyncState({ kind: 'done', ...data });
  }

  const [text, setText] = useState('');
  const [importState, setImportState] = useState<
    | { kind: 'idle' }
    | { kind: 'running'; done: number; total: number; linked: number; skipped: number; totalLinks: number; errors: Result[] }
    | { kind: 'done'; summary: Summary }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function runImport() {
    let entries: unknown[];
    try {
      const parsed = parseLooseJson(text);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      entries = parsed as unknown[];
    } catch (err) {
      setImportState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return;
    }

    let done = 0;
    let linked = 0;
    let skipped = 0;
    let totalLinks = 0;
    const errors: Result[] = [];
    const allResults: Result[] = [];
    setImportState({ kind: 'running', done, total: entries.length, linked, skipped, totalLinks, errors });

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      let res: Response;
      try {
        res = await fetch('/api/admin/import-facilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: chunk, replaceExisting: true }),
        });
      } catch (err) {
        setImportState({
          kind: 'error',
          message: `Batch ${i + 1}–${i + chunk.length} network error: ${err instanceof Error ? err.message : String(err)}. ${linked} entries already linked.`,
        });
        return;
      }
      if (!res.ok) {
        // The body could be JSON (our own error) or HTML (Vercel timeout
        // page). Try JSON first; if that fails, read text and trim to
        // something sensible.
        const text = await res.text().catch(() => '');
        let message = '';
        try {
          const body = JSON.parse(text);
          message = body.error ?? text.slice(0, 200);
        } catch {
          message = text.slice(0, 200) || res.statusText || `HTTP ${res.status}`;
        }
        setImportState({
          kind: 'error',
          message: `Batch ${i + 1}–${i + chunk.length} failed (${res.status}): ${message}. ${linked} entries already linked.`,
        });
        return;
      }
      const summary = (await res.json()) as Summary;
      linked += summary.linked;
      skipped += summary.skipped;
      totalLinks += summary.totalLinks;
      errors.push(...summary.results.filter((r) => r.status === 'skipped'));
      allResults.push(...summary.results);
      done = Math.min(i + CHUNK_SIZE, entries.length);
      setImportState({ kind: 'running', done, total: entries.length, linked, skipped, totalLinks, errors });
    }

    setImportState({
      kind: 'done',
      summary: { total: entries.length, linked, skipped, totalLinks, results: allResults },
    });
  }

  return (
    <div className="mt-10 space-y-10">
      <section className="rounded-xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-xl text-ink-900">Step 1: Sync taxonomy</h2>
        <p className="mt-2 text-sm text-ink-700">
          Inserts (or updates) the canonical Facility rows defined in the
          codebase. Safe to run repeatedly.
        </p>
        <button
          onClick={syncTaxonomy}
          disabled={syncState.kind === 'running'}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {syncState.kind === 'running' ? 'Syncing…' : 'Sync taxonomy'}
        </button>
        {syncState.kind === 'done' && (
          <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Synced {syncState.total} facilities · {syncState.inserted} inserted · {syncState.updated} updated.
          </p>
        )}
        {syncState.kind === 'error' && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {syncState.message}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-ink-100 bg-white p-6">
        <h2 className="font-display text-xl text-ink-900">Step 2: Link communities</h2>
        <p className="mt-2 text-sm text-ink-700">
          Paste the same JSON you used for images. The importer reads each
          entry&apos;s <code>facilities</code> text, parses it into canonical
          slugs, and links the community to those facilities.
        </p>

        <div className="mt-4">
          <input
            type="file"
            accept="application/json,.json"
            onChange={onFileChange}
            className="block w-full text-sm text-ink-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-white hover:file:bg-teal-800"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder='[ { "village_name": "...", "operator": "...", "facilities": "BBQ, Pool, Gym, ..." }, ... ]'
          className="mt-3 w-full rounded-lg border border-ink-200 bg-white p-3 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-ink-500">{text ? `${text.length.toLocaleString()} characters` : 'Empty'}</p>

        <button
          onClick={runImport}
          disabled={!text || importState.kind === 'running'}
          className="mt-4 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {importState.kind === 'running' ? 'Linking…' : 'Link facilities'}
        </button>

        {importState.kind === 'running' && (
          <div className="mt-4 rounded-md bg-teal-50 p-4 text-sm text-teal-900">
            <p className="font-medium">
              {importState.done} / {importState.total} processed · {importState.totalLinks} links created
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100">
              <div className="h-full bg-teal-700 transition-all" style={{ width: `${(importState.done / importState.total) * 100}%` }} />
            </div>
          </div>
        )}

        {importState.kind === 'error' && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {importState.message}
          </p>
        )}

        {importState.kind === 'done' && (
          <div className="mt-6 rounded-xl border border-ink-100 bg-sand-50 p-5">
            <h3 className="font-display text-lg text-ink-900">Linking complete</h3>
            <dl className="mt-3 grid grid-cols-4 gap-3 text-sm">
              <Stat label="Total" value={importState.summary.total} />
              <Stat label="Linked" value={importState.summary.linked} good />
              <Stat label="Skipped" value={importState.summary.skipped} bad={importState.summary.skipped > 0} />
              <Stat label="Total links" value={importState.summary.totalLinks} />
            </dl>
            {importState.summary.skipped > 0 && (
              <>
                <h4 className="mt-5 font-medium text-ink-900">Skipped</h4>
                <ul className="mt-2 max-h-80 overflow-auto rounded-md border border-ink-100 bg-white p-3 text-xs text-ink-700 space-y-1">
                  {importState.summary.results
                    .filter((r) => r.status === 'skipped')
                    .map((r, i) => (
                      <li key={i}>
                        <span className="text-ink-500">Row {r.row}</span>{' '}
                        <span className="text-ink-900">{r.village ?? '-'}</span>:{' '}
                        <span className="text-red-700">{r.status === 'skipped' ? r.reason : ''}</span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: number; good?: boolean; bad?: boolean }) {
  const colour = good ? 'text-teal-700' : bad ? 'text-red-700' : 'text-ink-900';
  return (
    <div>
      <dd className={`font-display text-xl ${colour}`}>{value}</dd>
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
    </div>
  );
}
