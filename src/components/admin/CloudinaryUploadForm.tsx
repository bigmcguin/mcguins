'use client';

import { useState } from 'react';

type Result =
  | { row: number; village?: string; status: 'uploaded'; publicId: string }
  | { row: number; village?: string; status: 'skipped'; reason: string };

type Summary = { total: number; uploaded: number; skipped: number; results: Result[] };

type State =
  | { kind: 'idle' }
  | { kind: 'running'; done: number; total: number; uploaded: number; skipped: number; errors: Result[] }
  | { kind: 'done'; summary: Summary }
  | { kind: 'error'; message: string };

// Each upload takes ~1-3 seconds (Cloudinary fetching the source URL), so
// chunks of 15 fit safely inside Vercel's 60s function limit.
const CHUNK_SIZE = 15;

export function CloudinaryUploadForm() {
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function submit() {
    let entries: unknown[];
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
      entries = parsed;
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return;
    }

    let done = 0;
    let uploaded = 0;
    let skipped = 0;
    const errors: Result[] = [];
    const allResults: Result[] = [];

    setState({ kind: 'running', done, total: entries.length, uploaded, skipped, errors });

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const res = await fetch('/api/admin/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: chunk, replaceExisting: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          kind: 'error',
          message: `Batch ${i + 1}–${i + chunk.length} failed (${res.status}): ${body.error ?? res.statusText}. ${uploaded} uploaded so far.`,
        });
        return;
      }
      const summary = (await res.json()) as Summary;
      uploaded += summary.uploaded;
      skipped += summary.skipped;
      errors.push(...summary.results.filter((r) => r.status === 'skipped'));
      allResults.push(...summary.results);
      done = Math.min(i + CHUNK_SIZE, entries.length);
      setState({ kind: 'running', done, total: entries.length, uploaded, skipped, errors });
    }

    setState({
      kind: 'done',
      summary: { total: entries.length, uploaded, skipped, results: allResults },
    });
  }

  return (
    <div className="mt-8 space-y-5">
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-ink-900">
          Upload a JSON file
        </label>
        <input
          id="file"
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="mt-2 block w-full text-sm text-ink-700 file:mr-4 file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-white hover:file:bg-teal-800"
        />
      </div>

      <div className="text-center text-xs uppercase tracking-wider text-ink-400">or paste below</div>

      <div>
        <label htmlFor="json" className="block text-sm font-medium text-ink-900">
          Paste JSON
        </label>
        <textarea
          id="json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          className="mt-2 w-full rounded-lg border border-ink-200 bg-white p-3 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-ink-500">
          {text ? `${text.length.toLocaleString()} characters` : 'Empty'}
        </p>
      </div>

      <div>
        <button
          type="button"
          disabled={!text || state.kind === 'running'}
          onClick={submit}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {state.kind === 'running' ? 'Uploading…' : 'Upload to Cloudinary'}
        </button>
      </div>

      {state.kind === 'running' && (
        <div className="rounded-md bg-teal-50 p-4 text-sm text-teal-900">
          <p className="font-medium">
            {state.done} / {state.total} processed · {state.uploaded} uploaded · {state.skipped} skipped
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100">
            <div className="h-full bg-teal-700 transition-all" style={{ width: `${(state.done / state.total) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-teal-800">
            Cloudinary fetches each image directly from the source URL. Don&apos;t close the tab.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          {state.message}
        </p>
      )}

      {state.kind === 'done' && (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="font-display text-xl text-ink-900">Upload complete</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <Stat label="Total" value={state.summary.total} />
            <Stat label="Uploaded" value={state.summary.uploaded} good />
            <Stat label="Skipped" value={state.summary.skipped} bad={state.summary.skipped > 0} />
          </dl>
          {state.summary.skipped > 0 && (
            <>
              <h3 className="mt-6 font-medium text-ink-900">Rows skipped</h3>
              <ul className="mt-2 max-h-80 overflow-auto rounded-md border border-ink-100 p-3 text-xs text-ink-700 space-y-1">
                {state.summary.results
                  .filter((r) => r.status === 'skipped')
                  .slice(0, 300)
                  .map((r, i) => (
                    <li key={i}>
                      <span className="text-ink-500">Row {r.row}</span>{' '}
                      <span className="text-ink-900">{r.village ?? '—'}</span>:{' '}
                      <span className="text-red-700">
                        {r.status === 'skipped' ? r.reason : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: number; good?: boolean; bad?: boolean }) {
  const colour = good ? 'text-teal-700' : bad ? 'text-red-700' : 'text-ink-900';
  return (
    <div>
      <dd className={`font-display text-2xl ${colour}`}>{value}</dd>
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
    </div>
  );
}
