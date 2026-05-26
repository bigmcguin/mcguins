'use client';

import { useState } from 'react';

export function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        subject: formData.get('subject') || undefined,
        message: formData.get('message'),
        website: formData.get('website') || undefined,
      }),
    });
    if (res.ok) {
      setState('sent');
    } else {
      setState('error');
      setError('Sorry, we could not send your message. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800">
        Thanks for getting in touch. We&apos;ll reply within a couple of business days.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" name="phone" type="tel" />
        <Field label="Subject (optional)" name="subject" />
      </div>
      <label className="block">
        <span className="block text-ink-900 font-medium">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          rows={6}
          className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white p-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          placeholder="How can we help?"
        />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full sm:w-auto rounded-xl bg-teal-700 px-7 py-3 text-white font-medium hover:bg-teal-800 active:scale-[0.98] transition disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      <p className="text-xs text-ink-500">
        By submitting, you agree to our privacy policy.
      </p>
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-ink-900 font-medium">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white p-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      />
    </label>
  );
}
