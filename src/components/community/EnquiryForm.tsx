'use client';

import { useState } from 'react';

export function EnquiryForm({ communityId }: { communityId: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communityId,
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone') || undefined,
        message: formData.get('message'),
        website: formData.get('website') || undefined,
      }),
    });
    if (res.ok) {
      setState('sent');
    } else {
      setState('error');
      setError('Sorry, we could not send your enquiry. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="mt-3 rounded-md bg-brand-50 p-3 text-sm text-brand-800">
        Thanks. Your enquiry has been sent and the community will be in touch shortly.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 text-sm">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Your name" name="name" required />
      <Field label="Email" name="email" type="email" required />
      <Field label="Phone" name="phone" type="tel" />
      <label className="block">
        <span className="block text-brand-800 font-medium">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          rows={4}
          className="mt-1 w-full rounded-md border border-brand-200 bg-white p-2"
          placeholder="I'm interested in learning more about your community..."
        />
      </label>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-md bg-brand-700 px-4 py-2.5 text-white font-medium hover:bg-brand-800 disabled:opacity-60"
      >
        {state === 'sending' ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="text-xs text-brand-700/70">
        By submitting, you agree to our privacy policy.
      </p>
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-brand-800 font-medium">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-md border border-brand-200 bg-white p-2"
      />
    </label>
  );
}
