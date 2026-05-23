import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communitySearchSchema } from '@/lib/validators';
import type { Prisma } from '@prisma/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = communitySearchSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const p = parsed.data;

  const where: Prisma.CommunityWhereInput = {
    status: 'PUBLISHED',
    deletedAt: null,
    ...(p.state && { state: p.state }),
    ...(p.postcode && { postcode: p.postcode }),
    ...(p.petFriendly && { petFriendly: true }),
    ...(p.over50sOnly && { over50sOnly: true }),
    ...(p.coastal && { coastal: true }),
    ...(p.q && {
      OR: [
        { name: { contains: p.q, mode: 'insensitive' } },
        { suburb: { name: { contains: p.q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    db.community.findMany({
      where,
      include: { suburb: true, images: { take: 1, orderBy: { order: 'asc' } } },
      orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
      skip: (p.page - 1) * p.perPage,
      take: p.perPage,
    }),
    db.community.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page: p.page,
    perPage: p.perPage,
    pages: Math.ceil(total / p.perPage),
  });
}
