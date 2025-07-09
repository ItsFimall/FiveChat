'use server';

import { db } from '@/app/db';
import { oauthProviders } from '@/app/db/schema';

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
export const encryptSecret = (secret: string): string => {
  if (!secret) return '';
  const key = process.env.AUTH_SECRET || 'default-key';
  let encrypted = '';
  for (let i = 0; i < secret.length; i++) {
    encrypted += String.fromCharCode(secret.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(encrypted).toString('base64');
};

export const decryptSecret = (encryptedSecret: string): string => {
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
      clientId: provider.clientId ?? undefined,
      clientSecret: provider.clientSecret ? decryptSecret(provider.clientSecret) : '',
      logoUrl: provider.logoUrl ?? undefined,
      authorizeUrl: provider.authorizeUrl,
      tokenUrl: provider.tokenUrl,
      userInfoUrl: provider.userInfoUrl,
      scope: provider.scope ?? undefined,
      enabled: provider.enabled ?? false
    } as OAuthProvider));
  } catch (error) {
    console.error('Failed to fetch OAuth providers:', error);
    return [];
  }
} 