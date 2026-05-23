import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const c = await db.community.findUnique({
    where: { slug: params.slug },
    include: {
      operator: true,
      suburb: true,
      images: { orderBy: { order: 'asc' } },
      facilities: { include: { facility: true } },
      faqs: { orderBy: { order: 'asc' } },
    },
  });
  if (!c || c.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(c);
}
