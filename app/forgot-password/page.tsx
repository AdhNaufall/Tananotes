"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDebugResetUrl(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Failed to request reset');
        return;
      }

      setSuccessMessage(payload.message || 'If an account exists, a reset link has been sent.');
      if (typeof payload.debugResetUrl === 'string' && payload.debugResetUrl) {
        setDebugResetUrl(payload.debugResetUrl);
      }
    } catch {
      setError('Unexpected error while requesting reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black mb-2">Forgot password</h1>
        <p className="text-sm font-semibold text-gray-600 mb-6">
          Masukkan email akun kamu. Kalau terdaftar, link reset akan dikirim.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <p className="text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] border-2 border-black rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="text-sm font-bold text-[#14532D] bg-[#DCFCE7] border-2 border-black rounded-xl px-3 py-2">
              {successMessage}
            </p>
          )}

          {debugResetUrl && (
            <p className="text-xs font-bold text-[#1E3A8A] bg-[#DBEAFE] border-2 border-black rounded-xl px-3 py-2 break-all">
              Dev reset link:{' '}
              <a href={debugResetUrl} className="underline" target="_blank" rel="noreferrer">
                {debugResetUrl}
              </a>
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FDE047] border-2 border-black rounded-xl font-extrabold hover:-translate-y-0.5 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:opacity-60"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

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
