'use client';

import { useState } from 'react';

type Summary = {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; name?: string; reason: string }[];
  batchId: string;
};

type FormState =
  | { kind: 'idle' }
  | { kind: 'submitting'; done: number; total: number }
  | { kind: 'done'; dryRun: boolean; summary: Summary }
  | { kind: 'error'; message: string };

// Vercel's serverless functions can only run for 60 seconds. ~30 rows is a
// comfortable batch size that completes in 10-15 seconds, leaving plenty of
// headroom for slow operator/suburb upserts.
const CHUNK_SIZE = 30;

export function ImportForm() {
  const [text, setText] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function submit(opts: { dryRun: boolean; publish: boolean }) {
    let rows: unknown[];
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('The JSON must be an array (start with [ and end with ]).');
      }
      rows = parsed;
    } catch (err) {
      setState({
        kind: 'error',
        message: `Couldn't parse the text as JSON. ${err instanceof Error ? err.message : ''}`,
      });
      return;
    }

    const batchId = `import-${new Date().toISOString()}`;
    const aggregate: Summary = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      batchId,
    };

    setState({ kind: 'submitting', done: 0, total: rows.length });

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch('/api/admin/import-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunk,
            dryRun: opts.dryRun,
            publish: opts.publish,
            batchId,
            rowOffset: i,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setState({
            kind: 'error',
            message: `Batch starting at row ${i + 1} failed (${res.status}): ${body.error ?? res.statusText}. ${aggregate.imported} rows were already imported before this batch.`,
          });
          return;
        }
        const chunkSummary = (await res.json()) as Summary;
        aggregate.imported += chunkSummary.imported;
        aggregate.skipped += chunkSummary.skipped;
        aggregate.errors.push(...chunkSummary.errors);
      } catch (err) {
        setState({
          kind: 'error',
          message: `Network error on batch starting at row ${i + 1}: ${err instanceof Error ? err.message : String(err)}. ${aggregate.imported} rows were already imported.`,
        });
        return;
      }

      setState({
        kind: 'submitting',
        done: Math.min(i + CHUNK_SIZE, rows.length),
        total: rows.length,
      });
    }

    setState({ kind: 'done', dryRun: opts.dryRun, summary: aggregate });
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
          rows={12}
          spellCheck={false}
          placeholder='[ { "Village Name": "...", "Full Address": "...", ... }, ... ]'
          className="mt-2 w-full rounded-lg border border-ink-200 bg-white p-3 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-ink-500">
          {text ? `${text.length.toLocaleString()} characters` : 'Empty'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!text || state.kind === 'submitting'}
          onClick={() => submit({ dryRun: true, publish: false })}
          className="rounded-lg border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          Dry run (preview)
        </button>
        <button
          type="button"
          disabled={!text || state.kind === 'submitting'}
          onClick={() => submit({ dryRun: false, publish: false })}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Import as draft (UNVERIFIED)
        </button>
        <button
          type="button"
          disabled={!text || state.kind === 'submitting'}
          onClick={() => submit({ dryRun: false, publish: true })}
          className="rounded-lg bg-teal-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-900 disabled:opacity-50"
        >
          Import and publish
        </button>
      </div>

      {state.kind === 'submitting' && (
        <div role="status" className="rounded-md bg-teal-50 p-4 text-teal-900">
          <p className="font-medium">
            Importing… {state.done.toLocaleString()} / {state.total.toLocaleString()} rows processed
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full bg-teal-700 transition-all duration-300"
              style={{ width: `${(state.done / state.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-teal-800">
            Sent in batches of {CHUNK_SIZE} to stay under serverless time limits.
            Don&apos;t close the tab.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800">
          {state.message}
        </p>
      )}

      {state.kind === 'done' && <Result dryRun={state.dryRun} summary={state.summary} />}
    </div>
  );
}

function Result({ dryRun, summary }: { dryRun: boolean; summary: Summary }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h2 className="font-display text-xl text-ink-900">
        {dryRun ? 'Dry run complete' : 'Import complete'}
      </h2>
      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <Stat label="Total rows" value={summary.total} />
        <Stat label={dryRun ? 'Would import' : 'Imported'} value={summary.imported} good />
        <Stat label="Skipped" value={summary.skipped} bad={summary.skipped > 0} />
      </dl>
      {summary.errors.length > 0 && (
        <>
          <h3 className="mt-6 font-medium text-ink-900">Rows skipped</h3>
          <ul className="mt-2 max-h-80 overflow-auto rounded-md border border-ink-100 p-3 text-xs text-ink-700 space-y-1">
            {summary.errors.slice(0, 200).map((e, i) => (
              <li key={i}>
                <span className="text-ink-500">Row {e.row}</span>{' '}
                <span className="text-ink-900">{e.name ?? '-'}</span>:{' '}
                <span className="text-red-700">{e.reason}</span>
              </li>
            ))}
            {summary.errors.length > 200 && (
              <li className="text-ink-400">… and {summary.errors.length - 200} more.</li>
            )}
          </ul>
        </>
      )}
      <p className="mt-4 text-xs text-ink-500">Batch ID: <code>{summary.batchId}</code></p>
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
