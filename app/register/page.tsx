"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || 'Registration failed');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Unexpected error while registering');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,1)]">
        <h1 className="text-3xl font-black mb-2">Create account</h1>
        <p className="text-sm font-semibold text-gray-600 mb-6">Daftar dulu untuk mulai pakai semua fitur Tananotes.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              placeholder="Your name"
            />
          </div>

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
              minLength={8}
              required
              className="w-full px-4 py-3 border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              placeholder="Minimum 8 characters"
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
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-sm font-semibold mt-5 text-center">
          Sudah punya akun?{' '}
          <Link href="/login" className="underline font-extrabold">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
