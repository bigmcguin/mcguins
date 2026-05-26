import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactSchema } from '@/lib/validators';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { website, ...data } = parsed.data;
  if (website) {
    return NextResponse.json({ ok: true });
  }

  const to = process.env.CONTACT_INBOX ?? 'brandwagon.marketing@outlook.com';
  const from = process.env.CONTACT_FROM ?? 'Land Lease Lifestyle <onboarding@resend.dev>';
  if (resend) {
    await resend.emails.send({
      from,
      to,
      replyTo: data.email,
      subject: data.subject ? `Contact: ${data.subject}` : 'New contact form submission',
      text: `${data.name} (${data.email}${data.phone ? `, ${data.phone}` : ''}) wrote:\n\n${data.message}`,
    });
  }

  return NextResponse.json({ ok: true });
}
