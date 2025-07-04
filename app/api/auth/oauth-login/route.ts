import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs, users, groups } from '@/app/db/schema';
import { oauthProviderTemplates } from '@/app/lib/oauth-provider';
import { signIn } from '@/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const configId = searchParams.get('config_id');
  
  if (!configId) {
    return NextResponse.redirect(new URL('/auth/error?error=missing_config', request.url));
  }

  try {
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

    let authorizationUrl: string;
    let scope: string;

    if (template) {
      authorizationUrl = template.authorizationUrl;
      scope = template.scope || 'openid email profile';
    } else {
      // 如果没有预定义模板，返回错误
      return NextResponse.redirect(new URL('/auth/error?error=unsupported_provider', request.url));
    }

    // 生成state参数
    const state = `${configId}:${Date.now()}`;

    // 构建授权URL
    const authUrl = new URL(authorizationUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    // 重定向到OAuth提供商
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=server_error', request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, configId } = body;

    if (!code || !state || !configId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 获取OAuth配置
    const config = await db.query.oauthConfigs
      .findFirst({
        where: eq(oauthConfigs.id, configId)
      });

    if (!config || !config.isActive) {
      return NextResponse.json({ error: 'OAuth config not found or inactive' }, { status: 404 });
    }

    // 尝试从预定义模板中获取配置
    const template = Object.values(oauthProviderTemplates).find(t => 
      t.name.toLowerCase() === config.name.toLowerCase()
    );

    if (!template) {
      return NextResponse.json({ error: 'Unsupported OAuth provider' }, { status: 400 });
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
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token received' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to fetch user info' }, { status: 400 });
    }

    const userData = await userResponse.json();
    const userEmail = userData.email;
    const userName = userData.name || userData.login || userData.username || userEmail;
    const userImage = userData.avatar_url || userData.picture || userData.image;

    if (!userEmail) {
      return NextResponse.json({ error: 'No email provided by OAuth provider' }, { status: 400 });
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

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
