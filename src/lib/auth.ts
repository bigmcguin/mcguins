import { auth } from '@clerk/nextjs/server';
import { db } from './db';
import type { Role } from '@prisma/client';

// Returns the application user row for the currently signed-in Clerk user,
// creating it on first request. Returns null if the visitor is not signed in.
export async function currentUser() {
  const { userId } = auth();
  if (!userId) return null;
  return db.user.upsert({
    where: { clerkId: userId },
    update: {},
    create: { clerkId: userId, email: `${userId}@placeholder.local` },
  });
}

export async function requireRole(roles: Role[]) {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}
