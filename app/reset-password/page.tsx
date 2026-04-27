"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token') || '';
    setToken(value);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Failed to reset password');
        return;
      }

      router.replace('/login?reset=1');
      router.refresh();
    } catch {
      setError('Unexpected error while resetting password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black mb-2">Reset password</h1>
        <p className="text-sm font-semibold text-gray-600 mb-6">Masukkan password baru untuk akun kamu.</p>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] border-2 border-black rounded-xl px-3 py-2">
              Invalid reset token.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full text-center py-3 bg-[#FDE047] border-2 border-black rounded-xl font-extrabold hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            >
              Request New Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] border-2 border-black rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#93EB7D] border-2 border-black rounded-xl font-extrabold hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-60"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="text-sm font-semibold mt-5 text-center">
          Balik ke{' '}
          <Link href="/login" className="underline font-extrabold">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
