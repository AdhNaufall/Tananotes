import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, hashPasswordResetToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectDB();

    const { token, password } = await request.json();

    const rawToken = String(token || '').trim();
    const nextPassword = String(password || '');

    if (!rawToken || !nextPassword) {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
    }

    if (nextPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const tokenHash = hashPasswordResetToken(rawToken);

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    user.passwordHash = await hashPassword(nextPassword);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
