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
  | { kind: 'submitting' }
  | { kind: 'done'; dryRun: boolean; summary: Summary }
  | { kind: 'error'; message: string };

export function ImportForm() {
  const [text, setText] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function submit(opts: { dryRun: boolean; publish: boolean }) {
    setState({ kind: 'submitting' });
    let rows: unknown;
    try {
      rows = JSON.parse(text);
    } catch (err) {
      setState({
        kind: 'error',
        message: `Couldn't parse the text as JSON. ${err instanceof Error ? err.message : ''}`,
      });
      return;
    }
    if (!Array.isArray(rows)) {
      setState({ kind: 'error', message: 'The JSON must be an array (start with [ and end with ]).' });
      return;
    }

    const res = await fetch('/api/admin/import-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, dryRun: opts.dryRun, publish: opts.publish }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ kind: 'error', message: body.error ?? `Server returned ${res.status}` });
      return;
    }
    const summary = (await res.json()) as Summary;
    setState({ kind: 'done', dryRun: opts.dryRun, summary });
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
        <p role="status" className="rounded-md bg-teal-50 p-4 text-teal-800">
          Importing… this can take 30-60 seconds for 200+ rows.
        </p>
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
                <span className="text-ink-900">{e.name ?? '—'}</span>:{' '}
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
