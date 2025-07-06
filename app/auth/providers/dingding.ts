import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { users, groups } from '@/app/db/schema';
import { OAuthConfig } from "next-auth/providers";

export interface DingdingProfile {
  unionId: string;
  nick?: string;
  email?: string;
  avatarUrl?: string;
}


export default function Dingding(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<DingdingProfile> {
  const apiUserUrl = 'https://api.dingtalk.com/v1.0/contact/users/me';
  const apiAuthUrl = 'https://login.dingtalk.com/oauth2/auth';
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return {
    id: "dingding",
    name: "dingding",
    type: "oauth",
    checks: ["pkce"],
    authorization: {
      url: apiAuthUrl,
      params: {
        client_id: options.clientId,
        response_type: 'code',
        scope: 'openid',
        prompt: 'consent',
        redirect_uri: encodeURI(`${baseUrl}/api/auth/callback/dingding`),
      }
    },
    token: {
      url: `${process.env.NEXTAUTH_URL}/api/dingdingProxy?clientId=${options.clientId}&clientSecret=${options.clientSecret}`,
    },

    userinfo: {
      url: apiUserUrl,
      async request({ tokens, provider }: any) {
        try {
          // 添加超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
          
          const request = await fetch(provider.userinfo?.url as URL, {
            headers: {
              'x-acs-dingtalk-access-token': tokens.access_token,
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!request.ok) {
            console.error('获取钉钉用户信息失败:', request.status, request.statusText);
            throw new Error(`获取用户信息失败: ${request.status} ${request.statusText}`);
          }
          
          const userData = await request.json();
          if (!userData.unionId) {
            throw new Error('钉钉用户信息中缺少 unionId');
          }
          
          const existingUser = await db
            .query
            .users
            .findFirst({
              where: eq(users.dingdingUnionId, userData.unionId)
            });
            
          if (existingUser) {
            await db.update(users).set({
              name: userData.nick,
              email: userData.email || `${userData.unionId}@dingtalk.com`,
              image: userData.avatarUrl || null,
            }).where(eq(users.dingdingUnionId, userData.unionId));
          } else {
            const defaultGroup = await db.query.groups.findFirst({
              where: eq(groups.isDefault, true)
            });
            const groupId = defaultGroup?.id || null;
            await db.insert(users).values({
              name: userData.nick,
              email: userData.email || `${userData.unionId}@dingtalk.com`,
              image: userData.avatarUrl || null,
              dingdingUnionId: userData.unionId,
              groupId: groupId,
            });
          }
          
          return userData;
        } catch (error: any) {
          console.error('钉钉用户信息请求失败:', error);
          
          // 根据错误类型抛出更具体的错误
          if (error.name === 'AbortError') {
            throw new Error('获取用户信息超时，请重试');
          } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw new Error('无法连接到钉钉服务器，请检查网络连接');
          } else {
            throw new Error(`获取用户信息失败: ${error.message}`);
          }
        }
      },
    },
    profile(profile: DingdingProfile) {
      return {
        id: profile.unionId,
        unionId: profile.unionId,
        name: profile.nick,
        email: profile.email,
        image: profile.avatarUrl,
      };
    },
    clientId: options.clientId,
    clientSecret: options.clientSecret,
  };
}
