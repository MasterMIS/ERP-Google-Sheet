import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id')?.trim();
    const cookieName = sessionId ? `auth-${sessionId}` : 'auth';
    const authCookie = request.cookies.get(cookieName)?.value || (!sessionId ? request.cookies.get('auth')?.value : undefined);

    if (!authCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    try {
      const user = JSON.parse(authCookie);
      return NextResponse.json({
        authenticated: true,
        user,
      });
    } catch (error) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
