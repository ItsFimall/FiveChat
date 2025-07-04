import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs, users, groups } from '@/app/db/schema';
import { oauthProviderTemplates } from '@/app/lib/oauth-provider';
import { signIn } from '@/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 处理OAuth错误
  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL(`/auth/error?error=${error}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/auth/error?error=missing_parameters', request.url));
  }

  try {
    // 解析state获取配置ID
    const [configId] = state.split(':');
    
    // 获取OAuth配置
    const config = await db.query.oauthConfigs
      .findFirst({
        where: eq(oauthConfigs.id, configId)
      });

    if (!config || !config.isActive) {
      return NextResponse.redirect(new URL('/auth/error?error=config_not_found', request.url));
    }

    // 尝试从预定义模板中获取配置
    const template = Object.values(oauthProviderTemplates).find(t => 
      t.name.toLowerCase() === config.name.toLowerCase()
    );

    if (!template) {
      return NextResponse.redirect(new URL('/auth/error?error=unsupported_provider', request.url));
    }

    // 交换授权码获取访问令牌
    const tokenResponse = await fetch(template.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/auth/error?error=no_access_token', request.url));
    }

    // 获取用户信息
    const userResponse = await fetch(template.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', errorText);
      return NextResponse.redirect(new URL('/auth/error?error=user_info_failed', request.url));
    }

    const userData = await userResponse.json();
    const userEmail = userData.email;
    const userName = userData.name || userData.login || userData.username || userEmail;
    const userImage = userData.avatar_url || userData.picture || userData.image;
    const providerId = userData.id || userData.sub;

    if (!userEmail) {
      return NextResponse.redirect(new URL('/auth/error?error=no_email', request.url));
    }

    // 查找或创建用户
    let user = await db.query.users
      .findFirst({
        where: eq(users.email, userEmail)
      });

    if (!user) {
      // 创建新用户
      const defaultGroup = await db.query.groups.findFirst({
        where: eq(groups.isDefault, true)
      });
      const groupId = defaultGroup?.id || null;

      const result = await db.insert(users).values({
        email: userEmail,
        name: userName,
        image: userImage,
        groupId: groupId,
        password: null, // OAuth用户没有密码
      }).returning();

      user = result[0];
    } else {
      // 更新用户信息
      await db.update(users)
        .set({
          name: userName,
          image: userImage,
        })
        .where(eq(users.id, user.id));
    }

    // 使用NextAuth的signIn函数进行登录
    // 这里我们需要创建一个临时的凭据来让NextAuth识别这个用户
    const signInResult = await signIn("credentials", {
      email: user.email,
      password: "oauth_login", // 特殊标识
      redirect: false,
    });

    // 重定向到主页
    return NextResponse.redirect(new URL('/chat', request.url));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=server_error', request.url));
  }
}
