import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { db } from './db';
import type { Role } from '@prisma/client';

// Returns the application user row for the currently signed-in Clerk user,
// creating it on first request. Returns null if the visitor is not signed in.
//
// Bootstrap rule: if there are no ADMIN users in the database yet, the first
// person to sign in is promoted to ADMIN. This lets the project owner set
// themselves up without needing direct database access.
export async function currentUser() {
  const { userId } = auth();
  if (!userId) return null;

  const existing = await db.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  // First-time login for this Clerk user — fetch their email from Clerk
  let email = `${userId}@placeholder.local`;
  let name: string | undefined;
  try {
    const clerkUser = await clerkCurrentUser();
    email = clerkUser?.emailAddresses[0]?.emailAddress ?? email;
    const first = clerkUser?.firstName ?? '';
    const last = clerkUser?.lastName ?? '';
    name = [first, last].filter(Boolean).join(' ').trim() || undefined;
  } catch {
    // Clerk request failed — fall back to placeholder
  }

  // Promote the first user in the database to ADMIN
  const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
  const role: Role = adminCount === 0 ? 'ADMIN' : 'USER';

  return db.user.create({
    data: { clerkId: userId, email, name, role },
  });
}

export async function requireRole(roles: Role[]) {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}
