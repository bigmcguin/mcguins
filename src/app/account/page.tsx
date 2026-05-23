import { currentUser } from '@/lib/auth';

export default async function AccountPage() {
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">My account</h1>
      <p className="mt-3 text-brand-700/80">
        Signed in as <strong>{user?.email}</strong>.
      </p>
      <ul className="mt-8 space-y-2">
        <li><a href="/account/favourites" className="text-brand-700 hover:underline">My favourites</a></li>
        <li><a href="/account/searches" className="text-brand-700 hover:underline">Saved searches</a></li>
        <li><a href="/account/enquiries" className="text-brand-700 hover:underline">My enquiries</a></li>
      </ul>
    </div>
  );
}
