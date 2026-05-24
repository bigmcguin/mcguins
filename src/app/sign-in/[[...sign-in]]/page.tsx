import { SignIn } from '@clerk/nextjs';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
      <SignIn />
    </div>
  );
}
