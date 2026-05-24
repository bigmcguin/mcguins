import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { FACILITIES } from '@/lib/facilities';

export const runtime = 'nodejs';

// Idempotently inserts/updates the canonical facility taxonomy from
// src/lib/facilities.ts into the Facility table. Safe to run repeatedly.
export async function POST() {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  let inserted = 0;
  let updated = 0;
  for (const f of FACILITIES) {
    const existing = await db.facility.findUnique({ where: { slug: f.slug } });
    if (existing) {
      if (existing.name !== f.name || existing.category !== f.category || existing.icon !== f.icon) {
        await db.facility.update({
          where: { slug: f.slug },
          data: { name: f.name, category: f.category, icon: f.icon },
        });
        updated += 1;
      }
    } else {
      await db.facility.create({
        data: { slug: f.slug, name: f.name, category: f.category, icon: f.icon },
      });
      inserted += 1;
    }
  }
  return NextResponse.json({ total: FACILITIES.length, inserted, updated });
}
