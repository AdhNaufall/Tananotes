"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const resetDone = new URLSearchParams(window.location.search).get('reset') === '1';
    if (resetDone) {
      setSuccessMessage('Password berhasil di-reset. Silakan login dengan password baru.');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Login failed');
        return;
      }

      const nextPath = new URLSearchParams(window.location.search).get('next') || '/';
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Unexpected error while logging in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black mb-2">Welcome back</h1>
        <p className="text-sm font-semibold text-gray-600 mb-6">Login dulu untuk akses semua fitur Tananotes.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <p className="text-sm font-bold text-[#14532D] bg-[#DCFCE7] border-2 border-black rounded-xl px-3 py-2">
              {successMessage}
            </p>
          )}

          <div>
            <label className="block text-sm font-bold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              placeholder="********"
            />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-xs font-extrabold underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] border-2 border-black rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#93C5FD] border-2 border-black rounded-xl font-extrabold hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="text-sm font-semibold mt-5 text-center">
          Belum punya akun?{' '}
          <Link href="/register" className="underline font-extrabold">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
