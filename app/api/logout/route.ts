import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const sessionId = request.headers.get('x-session-id')?.trim();
  const cookieName = sessionId ? `auth-${sessionId}` : 'auth';
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the auth cookie
  response.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Also clear legacy cookie if no sessionId provided
  if (!sessionId) {
    response.cookies.set('auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  }

  return response;
}
