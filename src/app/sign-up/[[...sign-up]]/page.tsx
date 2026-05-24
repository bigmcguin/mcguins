import { SignUp } from '@clerk/nextjs';

export const metadata = { title: 'Sign up' };

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
      <SignUp />
    </div>
  );
}
