import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const provider = searchParams.get('provider');
  const isNewUser = searchParams.get('isNewUser') === 'true';
  const username = searchParams.get('username');
  const password = searchParams.get('password');

  if (!userId) {
    return Response.redirect(new URL('/login?error=invalid_session', request.url));
  }

  try {
    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return Response.redirect(new URL('/login?error=user_not_found', request.url));
    }

    // 创建 JWT token
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'default-secret');
    
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || false,
      provider: provider || 'oauth',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);

    // 设置会话 cookie
    const cookieStore = cookies();
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // 如果是新用户，重定向到凭据显示页面
    if (isNewUser && username && password) {
      const credentialsUrl = new URL('/oauth-credentials', request.url);
      credentialsUrl.searchParams.set('username', username);
      credentialsUrl.searchParams.set('password', password);
      return Response.redirect(credentialsUrl);
    }

    // 重定向到聊天页面
    return Response.redirect(new URL('/chat', request.url));

  } catch (error) {
    console.error('OAuth success handling error:', error);
    return Response.redirect(new URL('/login?error=session_creation_failed', request.url));
  }
}
