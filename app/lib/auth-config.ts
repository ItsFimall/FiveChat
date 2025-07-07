import { fetchOAuthConfig } from '@/app/admin/system/actions';
import { getAllOAuthProviders } from '@/app/admin/oauth/actions';

// 缓存配置以避免频繁数据库查询
let configCache: {
  google?: { clientId: string; clientSecret: string; enabled: boolean };
  github?: { clientId: string; clientSecret: string; enabled: boolean };
  discord?: { clientId: string; clientSecret: string; enabled: boolean };
} = {};

let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取动态 OAuth 配置
export async function getDynamicOAuthConfig() {
  const now = Date.now();

  // 如果缓存还有效，直接返回
  if (now - lastCacheUpdate < CACHE_DURATION && Object.keys(configCache).length > 0) {
    return configCache;
  }

  try {
    // 从新的动态服务商表获取配置
    const providers = await getAllOAuthProviders();

    configCache = {};

    providers.forEach(provider => {
      if (provider.enabled && provider.clientId && provider.clientSecret) {
        configCache[provider.name as keyof typeof configCache] = {
          clientId: provider.clientId,
          clientSecret: provider.clientSecret,
          enabled: provider.enabled
        };
      }
    });

    lastCacheUpdate = now;
  } catch (error) {
    console.error('Failed to fetch OAuth config from database:', error);
    // 如果数据库查询失败，尝试从旧的配置系统获取
    try {
      const [googleConfig, githubConfig, discordConfig] = await Promise.all([
        fetchOAuthConfig('google'),
        fetchOAuthConfig('github'),
        fetchOAuthConfig('discord')
      ]);

      configCache = {};

      if (googleConfig?.enabled && googleConfig.clientId && googleConfig.clientSecret) {
        configCache.google = googleConfig;
      }

      if (githubConfig?.enabled && githubConfig.clientId && githubConfig.clientSecret) {
        configCache.github = githubConfig;
      }

      if (discordConfig?.enabled && discordConfig.clientId && discordConfig.clientSecret) {
        configCache.discord = discordConfig;
      }

      lastCacheUpdate = now;
    } catch (fallbackError) {
      console.error('Failed to fetch fallback OAuth config:', fallbackError);
      configCache = {};
    }
  }

  return configCache;
}

// 清除配置缓存（在配置更新时调用）
export function clearOAuthConfigCache() {
  configCache = {};
  lastCacheUpdate = 0;
}

// 检查是否有可用的 OAuth 配置（数据库或环境变量）
export async function hasOAuthConfig(provider: 'google' | 'github' | 'discord'): Promise<boolean> {
  // 首先检查环境变量
  if (provider === 'google' && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return true;
  }
  if (provider === 'github' && process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    return true;
  }
  if (provider === 'discord' && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    return true;
  }

  // 然后检查数据库配置
  const config = await getDynamicOAuthConfig();
  return !!config[provider];
}
