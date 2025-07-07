'use server';

import { auth } from '@/auth';
import { db } from '@/app/db';
import { oauthProviders } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';

// OAuth 服务商接口
export interface OAuthProvider {
  id?: string;
  name: string;
  displayName: string;
  clientId?: string;
  clientSecret?: string;
  logoUrl?: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope?: string;
  enabled: boolean;
}

// 简单的加密/解密函数
const encryptSecret = (secret: string): string => {
  if (!secret) return '';
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

// 获取所有 OAuth 服务商
export async function getAllOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const providers = await db.select().from(oauthProviders);

    return providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId || undefined,
      clientSecret: provider.clientSecret ? decryptSecret(provider.clientSecret) : '',
      logoUrl: provider.logoUrl || undefined,
      authorizeUrl: provider.authorizeUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scope: provider.scope || undefined,
      enabled: provider.enabled ?? false
    }));
  } catch (error) {
    console.error('Failed to fetch OAuth providers:', error);
    return [];
  }
}

// 获取单个 OAuth 服务商
export async function getOAuthProvider(id: string): Promise<OAuthProvider | null> {
  try {
    const provider = await db.query.oauthProviders.findFirst({
      where: eq(oauthProviders.id, id)
    });

    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId || undefined,
      clientSecret: provider.clientSecret ? decryptSecret(provider.clientSecret) : '',
      logoUrl: provider.logoUrl || undefined,
      authorizeUrl: provider.authorizeUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scope: provider.scope || undefined,
      enabled: provider.enabled ?? false
    };
  } catch (error) {
    console.error('Failed to fetch OAuth provider:', error);
    return null;
  }
}

// 根据名称获取 OAuth 服务商
export async function getOAuthProviderByName(name: string): Promise<OAuthProvider | null> {
  try {
    const provider = await db.query.oauthProviders.findFirst({
      where: eq(oauthProviders.name, name)
    });

    if (!provider) return null;

    return {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId || undefined,
      clientSecret: provider.clientSecret ? decryptSecret(provider.clientSecret) : '',
      logoUrl: provider.logoUrl || undefined,
      authorizeUrl: provider.authorizeUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scope: provider.scope || undefined,
      enabled: provider.enabled ?? false
    };
  } catch (error) {
    console.error('Failed to fetch OAuth provider by name:', error);
    return null;
  }
}

// 创建 OAuth 服务商
export async function createOAuthProvider(provider: OAuthProvider): Promise<{ status: string; message?: string; id?: string }> {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return { status: 'fail', message: 'Unauthorized' };
  }

  try {
    // 检查名称是否已存在
    const existing = await db.query.oauthProviders.findFirst({
      where: eq(oauthProviders.name, provider.name)
    });

    if (existing) {
      return { status: 'fail', message: 'Provider name already exists' };
    }

    // 加密客户端密钥
    const encryptedSecret = provider.clientSecret ? encryptSecret(provider.clientSecret) : '';

    const result = await db.insert(oauthProviders).values({
      name: provider.name,
      displayName: provider.displayName,
      clientId: provider.clientId || '',
      clientSecret: encryptedSecret,
      logoUrl: provider.logoUrl || '',
      authorizeUrl: provider.authorizeUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scope: provider.scope || 'openid profile email',
      enabled: provider.enabled
    }).returning();

    // 清除配置缓存
    const { clearOAuthConfigCache } = await import('@/app/lib/auth-config');
    clearOAuthConfigCache();

    return { status: 'success', id: result[0].id };
  } catch (error) {
    console.error('Failed to create OAuth provider:', error);
    return { status: 'fail', message: 'Failed to create provider' };
  }
}

// 更新 OAuth 服务商
export async function updateOAuthProvider(id: string, provider: Partial<OAuthProvider>): Promise<{ status: string; message?: string }> {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return { status: 'fail', message: 'Unauthorized' };
  }

  try {
    // 检查服务商是否存在
    const existing = await db.query.oauthProviders.findFirst({
      where: eq(oauthProviders.id, id)
    });

    if (!existing) {
      return { status: 'fail', message: 'Provider not found' };
    }

    // 如果更新名称，检查是否与其他服务商冲突
    if (provider.name && provider.name !== existing.name) {
      const nameExists = await db.query.oauthProviders.findFirst({
        where: and(
          eq(oauthProviders.name, provider.name),
          eq(oauthProviders.id, id)
        )
      });

      if (nameExists) {
        return { status: 'fail', message: 'Provider name already exists' };
      }
    }

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date()
    };

    if (provider.name !== undefined) updateData.name = provider.name;
    if (provider.displayName !== undefined) updateData.displayName = provider.displayName;
    if (provider.clientId !== undefined) updateData.clientId = provider.clientId;
    if (provider.clientSecret !== undefined) {
      updateData.clientSecret = provider.clientSecret ? encryptSecret(provider.clientSecret) : existing.clientSecret;
    }
    if (provider.logoUrl !== undefined) updateData.logoUrl = provider.logoUrl;
    if (provider.authorizeUrl !== undefined) updateData.authorizeUrl = provider.authorizeUrl;
    if (provider.tokenUrl !== undefined) updateData.tokenUrl = provider.tokenUrl;
    if (provider.userInfoUrl !== undefined) updateData.userInfoUrl = provider.userInfoUrl;
    if (provider.scope !== undefined) updateData.scope = provider.scope;
    if (provider.enabled !== undefined) updateData.enabled = provider.enabled;

    await db.update(oauthProviders)
      .set(updateData)
      .where(eq(oauthProviders.id, id));

    // 清除配置缓存
    const { clearOAuthConfigCache } = await import('@/app/lib/auth-config');
    clearOAuthConfigCache();

    return { status: 'success' };
  } catch (error) {
    console.error('Failed to update OAuth provider:', error);
    return { status: 'fail', message: 'Failed to update provider' };
  }
}

// 删除 OAuth 服务商
export async function deleteOAuthProvider(id: string): Promise<{ status: string; message?: string }> {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return { status: 'fail', message: 'Unauthorized' };
  }

  try {
    // 检查服务商是否存在
    const existing = await db.select().from(oauthProviders).where(eq(oauthProviders.id, id)).limit(1);

    if (existing.length === 0) {
      return { status: 'fail', message: 'Provider not found' };
    }

    // 直接删除服务商
    await db.delete(oauthProviders)
      .where(eq(oauthProviders.id, id));

    // 清除配置缓存
    const { clearOAuthConfigCache } = await import('@/app/lib/auth-config');
    clearOAuthConfigCache();

    return { status: 'success' };
  } catch (error) {
    console.error('Failed to delete OAuth provider:', error);
    return { status: 'fail', message: 'Failed to delete provider' };
  }
}

// 验证 OAuth 配置
export async function validateOAuthProvider(provider: Partial<OAuthProvider>): Promise<{ status: string; errors: string[] }> {
  const errors: string[] = [];

  if (!provider.name?.trim()) {
    errors.push('Provider name is required');
  } else if (!/^[a-z0-9_-]+$/.test(provider.name)) {
    errors.push('Provider name can only contain lowercase letters, numbers, hyphens and underscores');
  }

  if (!provider.displayName?.trim()) {
    errors.push('Display name is required');
  }

  if (!provider.authorizeUrl?.trim()) {
    errors.push('Authorize URL is required');
  } else if (!isValidUrl(provider.authorizeUrl)) {
    errors.push('Invalid authorize URL format');
  }

  if (!provider.tokenUrl?.trim()) {
    errors.push('Token URL is required');
  } else if (!isValidUrl(provider.tokenUrl)) {
    errors.push('Invalid token URL format');
  }

  if (!provider.userInfoUrl?.trim()) {
    errors.push('User info URL is required');
  } else if (!isValidUrl(provider.userInfoUrl)) {
    errors.push('Invalid user info URL format');
  }

  if (provider.logoUrl && !isValidUrl(provider.logoUrl)) {
    errors.push('Invalid logo URL format');
  }

  return {
    status: errors.length > 0 ? 'fail' : 'success',
    errors
  };
}

// URL 验证辅助函数
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
