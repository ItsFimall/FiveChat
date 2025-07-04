import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs } from '@/app/db/schema';
import { oauthProviderTemplates } from '@/app/lib/oauth-provider';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7);
    const configId = request.nextUrl.searchParams.get('config_id');

    if (!configId) {
      return NextResponse.json({ error: 'Missing config_id parameter' }, { status: 400 });
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

    let userInfoUrl: string;

    if (template) {
      userInfoUrl = template.userInfoUrl;
    } else {
      userInfoUrl = `${config.homepage}/api/user`;
    }

    // 获取用户信息
    const userResponse = await fetch(userInfoUrl, {
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
    
    return NextResponse.json(userData);
  } catch (error) {
    console.error('OAuth userinfo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
