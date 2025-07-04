'use server';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { oauthConfigs } from '@/app/db/schema';
import { auth } from '@/auth';
import { oauthConfigType } from '@/app/db/schema';

export interface OAuthConfigFormValues {
  name: string;
  clientId: string;
  clientSecret: string;
  homepage?: string;
  description?: string;
  callbackUrl: string;
  isActive: boolean;
}

export const fetchAllOAuthConfigs = async (): Promise<oauthConfigType[]> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const configs = await db.select().from(oauthConfigs);
  return configs;
}

export const createOAuthConfig = async (values: OAuthConfigFormValues): Promise<{
  status: string;
  message?: string;
}> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    }
  }

  try {
    await db.insert(oauthConfigs).values({
      name: values.name,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      homepage: values.homepage || null,
      description: values.description || null,
      callbackUrl: values.callbackUrl,
      isActive: values.isActive,
    });

    return {
      status: 'success'
    }
  } catch (error) {
    console.error('Error creating OAuth config:', error);
    return {
      status: 'fail',
      message: '创建失败，请稍后再试'
    }
  }
}

export const updateOAuthConfig = async (id: string, values: OAuthConfigFormValues): Promise<{
  status: string;
  message?: string;
}> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    }
  }

  try {
    await db.update(oauthConfigs)
      .set({
        name: values.name,
        clientId: values.clientId,
        clientSecret: values.clientSecret,
        homepage: values.homepage || null,
        description: values.description || null,
        callbackUrl: values.callbackUrl,
        isActive: values.isActive,
        updatedAt: Date.now(),
      })
      .where(eq(oauthConfigs.id, id));

    return {
      status: 'success'
    }
  } catch (error) {
    console.error('Error updating OAuth config:', error);
    return {
      status: 'fail',
      message: '更新失败，请稍后再试'
    }
  }
}

export const deleteOAuthConfig = async (id: string): Promise<{
  status: string;
  message?: string;
}> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return {
      status: 'fail',
      message: '401 not allowed'
    }
  }

  try {
    await db.delete(oauthConfigs)
      .where(eq(oauthConfigs.id, id));

    return {
      status: 'success'
    }
  } catch (error) {
    console.error('Error deleting OAuth config:', error);
    return {
      status: 'fail',
      message: '删除失败，请稍后再试'
    }
  }
}

export const getOAuthConfigById = async (id: string): Promise<oauthConfigType | null> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }

  const config = await db.query.oauthConfigs
    .findFirst({
      where: eq(oauthConfigs.id, id)
    });

  return config || null;
}

export const getActiveOAuthConfigs = async (): Promise<oauthConfigType[]> => {
  const configs = await db.query.oauthConfigs
    .findMany({
      where: eq(oauthConfigs.isActive, true)
    });

  return configs;
}

// 用于NextAuth配置的函数，不需要管理员权限
export const getActiveOAuthConfigsForAuth = async (): Promise<oauthConfigType[]> => {
  const configs = await db.query.oauthConfigs
    .findMany({
      where: eq(oauthConfigs.isActive, true)
    });

  return configs;
}
