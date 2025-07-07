import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { getAllOAuthProviders } from '@/app/admin/oauth/actions';

// 动态 OAuth 提供商接口
interface DynamicOAuthProvider {
  id: string;
  name: string;
  type: "oauth";
  clientId: string;
  clientSecret: string;
  authorization: {
    url: string;
    params: Record<string, any>;
  };
  token: string;
  userinfo: string;
  profile: (profile: any) => any;
  style?: {
    logo?: string;
    bg?: string;
    text?: string;
  };
  options?: Record<string, any>;
}

// 创建动态 OAuth 提供商
export function createDynamicOAuthProvider(
  id: string,
  displayName: string,
  clientId: string,
  clientSecret: string,
  authorizeUrl: string,
  tokenUrl: string,
  userInfoUrl: string,
  scope: string = "openid profile email"
): DynamicOAuthProvider {
  return {
    id,
    name: displayName,
    type: "oauth",
    clientId,
    clientSecret,
    authorization: {
      url: authorizeUrl,
      params: {
        scope,
        response_type: "code",
      },
    },
    token: tokenUrl,
    userinfo: userInfoUrl,
    profile(profile: any) {
      // 通用的用户信息映射
      return {
        id: profile.id || profile.sub || profile.user_id || profile.login,
        name: profile.name || profile.display_name || profile.username || profile.login,
        email: profile.email || profile.email_address,
        image: profile.picture || profile.avatar_url || profile.image || profile.avatar,
      };
    },
    style: {
      logo: "", // 将在前端动态设置
      bg: "#fff",
      text: "#000",
    },
    options: {},
  };
}

// 获取所有启用的动态 OAuth 提供商
export async function getDynamicOAuthProviders(): Promise<DynamicOAuthProvider[]> {
  try {
    const providers = await getAllOAuthProviders();
    
    return providers
      .filter(provider => 
        provider.enabled && 
        provider.clientId && 
        provider.clientSecret
      )
      .map(provider => 
        createDynamicOAuthProvider(
          provider.name,
          provider.displayName,
          provider.clientId!,
          provider.clientSecret!,
          provider.authorizeUrl,
          provider.tokenUrl,
          provider.userInfoUrl,
          provider.scope || "openid profile email"
        )
      );
  } catch (error) {
    console.error('Failed to get dynamic OAuth providers:', error);
    return [];
  }
}

// 根据 ID 获取单个动态提供商
export async function getDynamicOAuthProviderById(id: string): Promise<DynamicOAuthProvider | null> {
  try {
    const providers = await getDynamicOAuthProviders();
    return providers.find(provider => provider.id === id) || null;
  } catch (error) {
    console.error('Failed to get dynamic OAuth provider by ID:', error);
    return null;
  }
}

// 检查是否有可用的动态提供商
export async function hasDynamicOAuthProviders(): Promise<boolean> {
  try {
    const providers = await getDynamicOAuthProviders();
    return providers.length > 0;
  } catch (error) {
    console.error('Failed to check dynamic OAuth providers:', error);
    return false;
  }
}

// 获取所有可用提供商的名称列表
export async function getDynamicOAuthProviderNames(): Promise<string[]> {
  try {
    const providers = await getDynamicOAuthProviders();
    return providers.map(provider => provider.id);
  } catch (error) {
    console.error('Failed to get dynamic OAuth provider names:', error);
    return [];
  }
}
