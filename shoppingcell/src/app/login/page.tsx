import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-white">
      <Suspense>
        <LoginClient />
      </Suspense>
    </main>
  );
}
