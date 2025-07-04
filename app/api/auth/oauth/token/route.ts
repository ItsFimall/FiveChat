import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs } from '@/app/db/schema';
import { oauthProviderTemplates } from '@/app/lib/oauth-provider';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const code = body.get('code') as string;
    const state = body.get('state') as string;
    const redirectUri = body.get('redirect_uri') as string;

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 解析state获取配置ID
    const [configId] = state.split(':');
    
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

    let tokenUrl: string;

    if (template) {
      tokenUrl = template.tokenUrl;
    } else {
      tokenUrl = `${config.homepage}/oauth/token`;
    }

    // 交换授权码获取访问令牌
    const tokenResponse = await fetch(tokenUrl, {
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
    
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('OAuth token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
