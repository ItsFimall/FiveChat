import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs } from '@/app/db/schema';
import { oauthProviderTemplates } from '@/app/lib/oauth-provider';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const configId = searchParams.get('config_id');
  const state = searchParams.get('state');
  const redirectUri = searchParams.get('redirect_uri');

  if (!configId) {
    return NextResponse.json({ error: 'Missing config_id parameter' }, { status: 400 });
  }

  try {
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

    let authorizationUrl: string;
    let scope: string;

    if (template) {
      authorizationUrl = template.authorizationUrl;
      scope = template.scope || 'openid email profile';
    } else {
      // 如果没有预定义模板，使用通用配置
      authorizationUrl = `${config.homepage}/oauth/authorize`;
      scope = 'openid email profile';
    }

    // 构建授权URL
    const authUrl = new URL(authorizationUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', config.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', `${configId}:${state || ''}`);

    // 重定向到OAuth提供商
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
