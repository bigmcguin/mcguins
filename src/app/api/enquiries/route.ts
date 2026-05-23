import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enquirySchema } from '@/lib/validators';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { website, ...data } = parsed.data;
  // Honeypot — if the hidden "website" field has any content, it's a bot.
  if (website) {
    return NextResponse.json({ ok: true }); // silently accept
  }

  const community = await db.community.findUnique({
    where: { id: data.communityId },
    include: { operator: true },
  });
  if (!community) {
    return NextResponse.json({ error: 'Community not found' }, { status: 404 });
  }

  const enquiry = await db.enquiry.create({
    data: {
      communityId: community.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
      userAgent: req.headers.get('user-agent') ?? undefined,
      routedToOperatorId: community.operatorId,
    },
  });

  if (resend) {
    const to = community.operator?.contactEmail ?? process.env.ENQUIRY_INBOX;
    if (to) {
      await resend.emails.send({
        from: 'enquiries@example.com.au',
        to,
        replyTo: data.email,
        subject: `New enquiry: ${community.name}`,
        text: `${data.name} (${data.email}${data.phone ? `, ${data.phone}` : ''}) enquired about ${community.name}.\n\n${data.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, enquiryId: enquiry.id });
}
