'use server';
import { groupModels, groups, llmModels, users } from '@/app/db/schema';
import { db } from '@/app/db';
import { eq, inArray } from 'drizzle-orm';
import { auth } from "@/auth";
import type { InferSelectModel } from 'drizzle-orm';

type GroupWithModels = Awaited<ReturnType<typeof db.query.groups.findMany>>[number] & {
  models: {
    model: {
      id: number;
      name: string;
      displayName: string;
      provider: {
        providerName: string;
        provider: string;
        isActive: boolean;
      };
    };
  }[];
}

type GroupActionParams = {
  name: string;
  modelType?: 'all' | 'specific';
  models?: number[];
  tokenLimitType: 'unlimited' | 'limited',
  monthlyTokenLimit?: number | null,
};


export async function getGroupList() {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    const result = await db.query.groups.findMany({
      with: {
        models: {
          with: {
            model: {
              columns: {
                id: true,
                name: true,
                displayName: true,
                createdAt: true,
                updatedAt: true,
              },
              with: {
                provider: {
                  columns: {
                    providerName: true,
                    provider: true,
                    isActive: true,
                  },
                } as const
              }
            }
          }
        }
      },
      orderBy: (groups) => [groups.createdAt],
    });

    const groupsTableList = result.map(group => ({
      id: group.id,
      name: group.name,
      tokenLimitType: group.tokenLimitType,
      monthlyTokenLimit: group.monthlyTokenLimit,
      modelProviderList: (group as unknown as GroupWithModels).models.filter(m => m.model.provider.isActive).map(m => `${m.model.provider.providerName || 'unknown'} | ${m.model.displayName}`),
      models: (group as unknown as GroupWithModels).models.filter(m => m.model.provider.isActive).map(m => m.model.id),
      modelType: group.modelType,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      isDefault: group.isDefault,
    }))
    return groupsTableList;
  } catch (error) {
    throw new Error('query group list fail: \n' + error);
  }
}

export async function addGroup(groupInfo: {
  name: string, modelType?: 'all' | 'specific',
  tokenLimitType: 'unlimited' | 'limited',
  monthlyTokenLimit?: number | null,
  models?: number[]
}) {
  const session = await auth();
  if (!session?.user.isAdmin) throw new Error('Not allowed');

  // let allModels: typeof llmModels.$inferSelect[] = []
  try {

    const [group] = await db.insert(groups).values({
      name: groupInfo.name,
      modelType: groupInfo.modelType,
      tokenLimitType: groupInfo.tokenLimitType,
      monthlyTokenLimit: groupInfo.monthlyTokenLimit,
    }).returning();

    if (groupInfo.modelType === 'specific' && groupInfo.models?.length) {
      const modelLinks = groupInfo.models.map(modelId => ({
        groupId: group.id,
        modelId
      }));
      await db.insert(groupModels).values(modelLinks)
    }
    return { success: true };


  } catch (error) {
    return {
      success: false,
      message: `Add failed: ${error instanceof Error ? error.message : error}`
    }
  }

}

export async function deleteGroup(groupId: string) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId)
    });

    if (group?.isDefault) {
      return {
        success: false,
        message: 'Cannot delete default group'
      };
    }
    // 删除分组
    await db.delete(groups).where(eq(groups.id, groupId));
    // 同时将所有当前分组的用户，修改为默认分组
    const defaultGroup = await db.query.groups.findFirst({
      where: eq(groups.isDefault, true)
    });
    if (defaultGroup) {
      await db.update(users).set({
        groupId: defaultGroup.id,
      }).where(eq(users.groupId, groupId));
    }
    return {
      success: true,
      message: 'delete success'
    }
  } catch (error) {
    return {
      success: false,
      message: 'delete fail'
    }
  }
}

export async function updateGroup(groupId: string, groupInfo: GroupActionParams) {
  const session = await auth();
  if (!session?.user.isAdmin) throw new Error('Not allowed');
  try {
    await db.update(groups)
      .set({
        name: groupInfo.name,
        modelType: groupInfo.modelType,
        tokenLimitType: groupInfo.tokenLimitType,
        monthlyTokenLimit: groupInfo.monthlyTokenLimit,
      })
      .where(eq(groups.id, groupId));

    await db.delete(groupModels)
      .where(eq(groupModels.groupId, groupId))
    if (groupInfo.modelType === 'specific' && groupInfo.models?.length) {
      const modelLinks = groupInfo.models.map(modelId => ({
        groupId: groupId,
        modelId
      }));
      await db.insert(groupModels).values(modelLinks);
    }
    return { success: true };

  } catch (error) {
    return {
      success: false,
      message: `Update failed: ${error instanceof Error ? error.message : error}`
    };
  }
}