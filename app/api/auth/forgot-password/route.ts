import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { generatePasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const isLocalRequest = ['localhost', '127.0.0.1', '::1'].includes(requestUrl.hostname);
    const exposeDebugResetLink = process.env.NODE_ENV !== 'production' || isLocalRequest;

    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      requestUrl.hostname;

    const ipRate = checkRateLimit(`forgot-password:ip:${clientIp}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const emailRate = checkRateLimit(`forgot-password:email:${normalizedEmail}`, {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipRate.allowed || !emailRate.allowed) {
      const resetAt = Math.max(ipRate.resetAt, emailRate.resetAt);
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
          },
        }
      );
    }

    await connectDB();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin;
    const user = await User.findOne({ email: normalizedEmail });
    let resetUrlForDebug: string | null = null;

    if (user) {
      const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();
      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpiresAt = expiresAt;
      await user.save();

      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      resetUrlForDebug = resetUrl;

      const emailResult = await sendPasswordResetEmail({
        toEmail: normalizedEmail,
        resetUrl,
      });

      if (!emailResult.sent) {
        console.warn('Reset password email was not sent due to missing email config.');
      }

      console.info(`Password reset link for ${normalizedEmail}: ${resetUrl}`);
    }

    if (!resetUrlForDebug && exposeDebugResetLink) {
      const { rawToken } = generatePasswordResetToken();
      resetUrlForDebug = `${baseUrl}/reset-password?token=${rawToken}`;
    }

    return NextResponse.json(
      !exposeDebugResetLink
        ? { message: 'If an account exists, a password reset link has been sent.' }
        : {
            message: 'If an account exists, a password reset link has been sent.',
            debugResetUrl: resetUrlForDebug,
          }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process forgot password request' }, { status: 500 });
  }
}
