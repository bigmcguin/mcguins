import { pageMetadata } from '@/lib/seo';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata = pageMetadata({
  title: 'Contact',
  description: 'Get in touch with the Land Lease Lifestyle team.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">Get in touch</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl font-medium">Contact us</h1>
      <p className="mt-4 max-w-prose text-ink-700 leading-relaxed">
        Questions, feedback, or want to list a community? Send us a message and we&apos;ll
        get back to you within a couple of business days.
      </p>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 sm:p-8 shadow-card">
        <ContactForm />
      </div>
    </div>
  );
}
