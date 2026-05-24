import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from './db';
import type { Role, User } from '@prisma/client';

// Returns the application user row for the currently signed-in Clerk user,
// creating it on first request. Returns null if the visitor is not signed in.
//
// Bootstrap rule: if there are no ADMIN users in the database yet, the first
// person to sign in is promoted to ADMIN. This lets the project owner set
// themselves up without needing direct database access.
export async function currentUser(): Promise<User | null> {
  const { userId } = auth();
  if (!userId) return null;

  const existing = await db.user.findUnique({ where: { clerkId: userId } });
  if (existing) {
    // Self-heal: if there are still no admins and this user isn't one,
    // promote them. Covers the case where the very first sign-up happened
    // before the schema was ready and the user was created as USER.
    if (existing.role !== 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
      if (adminCount === 0) {
        return db.user.update({
          where: { id: existing.id },
          data: { role: 'ADMIN' },
        });
      }
    }
    return existing;
  }

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

// Use from server components: redirects unauthenticated visitors to sign-in,
// and returns the User row. Throws a 403-style render if the user's role is
// not allowed (handled by the caller — see `requireRole`).
export async function requireSignedIn(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/sign-in');
  return user;
}

// Use from server components: behaves like `requireSignedIn`, but also checks
// the role. Returns `{ user, ok: true }` if allowed, `{ user, ok: false }` if
// signed in but wrong role — the page should render a friendly forbidden UI
// in that case rather than crashing.
export async function checkRole(
  roles: Role[],
): Promise<{ ok: true; user: User } | { ok: false; user: User }> {
  const user = await requireSignedIn();
  if (!roles.includes(user.role)) return { ok: false, user };
  return { ok: true, user };
}

// Legacy helper kept for API routes — DO NOT use from server components.
// Throws a Response which Next.js route handlers understand, but server
// components do not (they crash with a generic 500). Server components
// should use `checkRole` and render their own forbidden UI.
export async function requireRole(roles: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return user;
}
