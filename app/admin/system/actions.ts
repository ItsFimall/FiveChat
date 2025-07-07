'use server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm'
import { appSettings } from '@/app/db/schema';
import { auth } from '@/auth';

export const fetchAppSettings = async (key: string) => {
  const result = await db.query.appSettings
    .findFirst({
      where: eq(appSettings.key, key)
    });
  return result?.value;
}

export const adminAndSetAppSettings = async (key: string, newValue: string): Promise<{
  status: string;
  message?: string;
}> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowd'
    }
  }
  return setAppSettings(key, newValue);
}

export const setAppSettings = async (key: string, newValue: string): Promise<{
  status: string;
  message?: string;
}> => {

  const result = await db.query.appSettings
    .findFirst({
      where: eq(appSettings.key, key)
    });
  if (result) {
    await db.update(appSettings)
      .set({
        value: newValue,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({
      key: key,
      value: newValue,
      updatedAt: new Date()
    });
  }
  return {
    status: 'success'
  }
}

// OAuth 配置相关的 Actions
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

export interface OAuthProviderConfig {
  google?: OAuthConfig;
  github?: OAuthConfig;
  discord?: OAuthConfig;
}

// 简单的加密/解密函数（生产环境建议使用更强的加密）
const encryptSecret = (secret: string): string => {
  if (!secret) return '';
  // 使用 AUTH_SECRET 作为密钥进行简单的 XOR 加密
  const key = process.env.AUTH_SECRET || 'default-key';
  let encrypted = '';
  for (let i = 0; i < secret.length; i++) {
    encrypted += String.fromCharCode(secret.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(encrypted).toString('base64');
};

const decryptSecret = (encryptedSecret: string): string => {
  if (!encryptedSecret) return '';
  try {
    const key = process.env.AUTH_SECRET || 'default-key';
    const encrypted = Buffer.from(encryptedSecret, 'base64').toString();
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt secret:', error);
    return '';
  }
};

// 获取 OAuth 配置
export const fetchOAuthConfig = async (provider: 'google' | 'github' | 'discord'): Promise<OAuthConfig | null> => {
  try {
    const clientIdResult = await fetchAppSettings(`oauth_${provider}_client_id`);
    const clientSecretResult = await fetchAppSettings(`oauth_${provider}_client_secret`);
    const enabledResult = await fetchAppSettings(`oauth_${provider}_enabled`);

    if (!clientIdResult || !clientSecretResult) {
      return null;
    }

    return {
      clientId: clientIdResult,
      clientSecret: decryptSecret(clientSecretResult),
      enabled: enabledResult === 'true'
    };
  } catch (error) {
    console.error(`Failed to fetch OAuth config for ${provider}:`, error);
    return null;
  }
};

// 保存 OAuth 配置
export const saveOAuthConfig = async (
  provider: 'google' | 'github' | 'discord',
  config: OAuthConfig
): Promise<{ status: string; message?: string }> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    };
  }

  try {
    // 保存客户端 ID
    await setAppSettings(`oauth_${provider}_client_id`, config.clientId);

    // 加密并保存客户端密钥
    const encryptedSecret = encryptSecret(config.clientSecret);
    await setAppSettings(`oauth_${provider}_client_secret`, encryptedSecret);

    // 保存启用状态
    await setAppSettings(`oauth_${provider}_enabled`, config.enabled.toString());

    // 清除配置缓存
    const { clearOAuthConfigCache } = await import('@/app/lib/auth-config');
    clearOAuthConfigCache();

    return {
      status: 'success'
    };
  } catch (error) {
    console.error(`Failed to save OAuth config for ${provider}:`, error);
    return {
      status: 'fail',
      message: 'Failed to save configuration'
    };
  }
};

// 获取所有 OAuth 配置
export const fetchAllOAuthConfigs = async (): Promise<OAuthProviderConfig> => {
  const configs: OAuthProviderConfig = {};

  const providers: Array<'google' | 'github' | 'discord'> = ['google', 'github', 'discord'];

  for (const provider of providers) {
    const config = await fetchOAuthConfig(provider);
    if (config) {
      configs[provider] = config;
    }
  }

  return configs;
};

// 删除 OAuth 配置
export const deleteOAuthConfig = async (
  provider: 'google' | 'github' | 'discord'
): Promise<{ status: string; message?: string }> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    };
  }

  try {
    // 删除相关配置
    await setAppSettings(`oauth_${provider}_client_id`, '');
    await setAppSettings(`oauth_${provider}_client_secret`, '');
    await setAppSettings(`oauth_${provider}_enabled`, 'false');

    return {
      status: 'success'
    };
  } catch (error) {
    console.error(`Failed to delete OAuth config for ${provider}:`, error);
    return {
      status: 'fail',
      message: 'Failed to delete configuration'
    };
  }
};

// 验证 OAuth 配置
export const validateOAuthConfig = async (
  provider: 'google' | 'github' | 'discord',
  config: OAuthConfig
): Promise<{ status: string; message?: string }> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    };
  }

  try {
    // 基本格式验证
    if (!config.clientId || !config.clientSecret) {
      return {
        status: 'fail',
        message: 'Client ID 和 Client Secret 不能为空'
      };
    }

    if (config.clientId.length < 10 || config.clientSecret.length < 10) {
      return {
        status: 'fail',
        message: 'Client ID 或 Client Secret 格式可能不正确'
      };
    }

    // 这里可以添加更多的验证逻辑，比如测试 OAuth 端点连接等
    // 由于需要实际的网络请求，这里暂时只做基本验证

    return {
      status: 'success',
      message: '配置验证通过'
    };
  } catch (error) {
    console.error(`Failed to validate OAuth config for ${provider}:`, error);
    return {
      status: 'fail',
      message: '验证过程中发生错误'
    };
  }
};