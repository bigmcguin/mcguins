import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher([
  '/account(.*)',
  '/admin(.*)',
  '/operator(.*)',
  '/api/admin(.*)',
  '/api/operator(.*)',
  '/api/favourites(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
};
