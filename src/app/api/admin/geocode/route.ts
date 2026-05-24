import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';

export const maxDuration = 60;
export const runtime = 'nodejs';

// Nominatim is OpenStreetMap's free geocoder. Usage policy: max 1 request
// per second, must include a User-Agent. Free for modest, non-bulk use.
// https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = 'au-land-lease-directory/1.0 (geocode-backfill)';
const RATE_LIMIT_MS = 1100;

type NominatimResult = { lat: string; lon: string };

async function geocodeOne(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    countrycodes: 'au',
  })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimResult[];
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = Number.parseFloat(data[0].lat);
  const lng = Number.parseFloat(data[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  let body: { ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: 'Body must be { ids: string[] }' }, { status: 400 });
  }

  const parks = await db.community.findMany({
    where: { id: { in: body.ids } },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      postcode: true,
      state: true,
      suburb: { select: { name: true } },
    },
  });

  const updated: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  for (let i = 0; i < parks.length; i++) {
    const p = parks[i];
    const parts = [
      p.addressLine1,
      p.suburb?.name,
      p.state,
      p.postcode,
      'Australia',
    ].filter(Boolean);
    const query = parts.join(', ');

    try {
      const result = await geocodeOne(query);
      if (!result) {
        failed.push({ id: p.id, reason: 'no match' });
      } else {
        await db.community.update({
          where: { id: p.id },
          data: { latitude: result.lat, longitude: result.lng },
        });
        updated.push(p.id);
      }
    } catch (err) {
      failed.push({ id: p.id, reason: err instanceof Error ? err.message : String(err) });
    }

    // Respect the 1 req/sec limit (sleep after every request except the last)
    if (i < parks.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  return NextResponse.json({
    processed: parks.length,
    updated: updated.length,
    failed,
  });
}
