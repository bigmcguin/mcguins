'use client';

import { useState } from 'react';

type Result =
  | { row: number; village?: string; status: 'imported' }
  | { row: number; village?: string; status: 'skipped'; reason: string };

type Summary = { total: number; imported: number; skipped: number; results: Result[] };

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; summary: Summary }
  | { kind: 'error'; message: string };

export function ImageImportForm() {
  const [text, setText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
  }

  async function submit() {
    let entries: unknown;
    try {
      entries = JSON.parse(text);
    } catch (err) {
      setState({
        kind: 'error',
        message: `Couldn't parse the text as JSON. ${err instanceof Error ? err.message : ''}`,
      });
      return;
    }
    if (!Array.isArray(entries)) {
      setState({
        kind: 'error',
        message: 'The JSON must be an array (start with [ and end with ]).',
      });
      return;
    }

    setState({ kind: 'submitting' });
    const res = await fetch('/api/admin/import-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, replaceExisting }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setState({ kind: 'error', message: body.error ?? `Server returned ${res.status}` });
      return;
    }
    const summary = (await res.json()) as Summary;
    setState({ kind: 'done', summary });
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
          placeholder='[ { "village": "...", "operator": "...", "source_url": "...", "description": "..." }, ... ]'
          className="mt-2 w-full rounded-lg border border-ink-200 bg-white p-3 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-ink-500">
          {text ? `${text.length.toLocaleString()} characters` : 'Empty'}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-800">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => setReplaceExisting(e.target.checked)}
          className="h-4 w-4"
        />
        Replace any existing images on matched communities (recommended — otherwise re-imports stack up duplicates)
      </label>

      <div>
        <button
          type="button"
          disabled={!text || state.kind === 'submitting'}
          onClick={submit}
          className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {state.kind === 'submitting' ? 'Importing…' : 'Import images'}
        </button>
      </div>

      {state.kind === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 border border-red-200 p-4 text-red-800">
          {state.message}
        </p>
      )}

      {state.kind === 'done' && <ResultView summary={state.summary} />}
    </div>
  );
}

function ResultView({ summary }: { summary: Summary }) {
  const skipped = summary.results.filter((r) => r.status === 'skipped');

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h2 className="font-display text-xl text-ink-900">Import complete</h2>
      <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <Stat label="Total" value={summary.total} />
        <Stat label="Imported" value={summary.imported} good />
        <Stat label="Skipped" value={summary.skipped} bad={summary.skipped > 0} />
      </dl>
      {skipped.length > 0 && (
        <>
          <h3 className="mt-6 font-medium text-ink-900">Rows skipped</h3>
          <ul className="mt-2 max-h-96 overflow-auto rounded-md border border-ink-100 p-3 text-xs text-ink-700 space-y-1">
            {skipped.slice(0, 500).map((r, i) => (
              <li key={i}>
                <span className="text-ink-500">Row {r.row}</span>{' '}
                <span className="text-ink-900">{r.village ?? '—'}</span>:{' '}
                <span className="text-red-700">
                  {r.status === 'skipped' ? r.reason : ''}
                </span>
              </li>
            ))}
            {skipped.length > 500 && (
              <li className="text-ink-400">… and {skipped.length - 500} more.</li>
            )}
          </ul>
        </>
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
