import { NextRequest } from 'next/server';
import { getDynamicOAuthProviderById } from '@/app/lib/dynamic-oauth-provider';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { signIn } from '@/auth';
import bcrypt from 'bcryptjs';

// 生成随机用户名
function generateUsername(email: string): string {
  const baseUsername = email.split('@')[0];
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${baseUsername}_${randomSuffix}`;
}

// 生成随机密码
function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 处理 OAuth 错误
  if (error) {
    console.error(`OAuth error for provider ${provider}:`, error);
    return Response.redirect(new URL('/login?error=oauth_error', request.url));
  }

  if (!code) {
    console.error(`No authorization code received for provider ${provider}`);
    return Response.redirect(new URL('/login?error=oauth_error', request.url));
  }

  try {
    // 获取动态提供商配置
    const providerConfig = await getDynamicOAuthProviderById(provider);
    if (!providerConfig) {
      console.error(`Provider ${provider} not found or not configured`);
      return Response.redirect(new URL('/login?error=provider_not_found', request.url));
    }

    // 交换授权码获取访问令牌
    const tokenResponse = await fetch(providerConfig.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code,
        redirect_uri: `${new URL(request.url).origin}/api/auth/callback/${provider}`,
      }),
    });

    if (!tokenResponse.ok) {
      console.error(`Token exchange failed for provider ${provider}:`, await tokenResponse.text());
      return Response.redirect(new URL('/login?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error(`No access token received for provider ${provider}`);
      return Response.redirect(new URL('/login?error=no_access_token', request.url));
    }

    // 获取用户信息
    const userResponse = await fetch(providerConfig.userinfo, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error(`User info fetch failed for provider ${provider}:`, await userResponse.text());
      return Response.redirect(new URL('/login?error=user_info_failed', request.url));
    }

    const userData = await userResponse.json();
    
    // 使用提供商的 profile 函数处理用户数据
    const profile = providerConfig.profile(userData);

    if (!profile.email) {
      console.error(`No email received from provider ${provider}`);
      return Response.redirect(new URL('/login?error=no_email', request.url));
    }

    // 检查用户是否已存在
    let user = await db.query.users.findFirst({
      where: eq(users.email, profile.email)
    });

    let isNewUser = false;
    let generatedCredentials: { username: string; password: string } | null = null;

    if (!user) {
      // 创建新用户 - 生成用户名和密码
      isNewUser = true;
      const username = generateUsername(profile.email);
      const password = generatePassword();

      // 哈希密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUsers = await db.insert(users).values({
        username,
        email: profile.email,
        name: profile.name || username,
        image: profile.image,
        password: hashedPassword,
      }).returning();

      user = newUsers[0];
      generatedCredentials = { username, password };
    } else {
      // 更新用户信息
      await db.update(users)
        .set({
          name: profile.name || user.name,
          image: profile.image || user.image,
        })
        .where(eq(users.id, user.id));
    }

    // 创建会话 - 这里需要手动处理，因为我们绕过了 NextAuth.js 的标准流程
    // 重定向到成功页面，携带用户信息
    const successUrl = new URL('/api/auth/oauth-success', request.url);
    successUrl.searchParams.set('userId', user.id);
    successUrl.searchParams.set('provider', provider);

    // 如果是新用户，传递生成的凭据信息
    if (isNewUser && generatedCredentials) {
      successUrl.searchParams.set('isNewUser', 'true');
      successUrl.searchParams.set('username', generatedCredentials.username);
      successUrl.searchParams.set('password', generatedCredentials.password);
    }

    return Response.redirect(successUrl);

  } catch (error) {
    console.error(`OAuth callback error for provider ${provider}:`, error);
    return Response.redirect(new URL('/login?error=oauth_callback_error', request.url));
  }
}
