'use server';
import { db } from '@/app/db';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { LLMModel, LLMModelProvider, llmSettingsType } from '@/types/llm';
import { llmSettingsTable, llmModels, groupModels, groups, users, messages } from '@/app/db/schema';
import { llmModelType } from '@/app/db/schema';
import { getLlmConfigByProvider } from '@/app/utils/llms';
import { auth } from '@/auth';
import { modelFamilies } from '@/app/db/schema';

type FormValues = {
  isActive?: boolean;
  apikey?: string;
  providerName?: string;
  endpoint?: string;
  order?: number;
}
export const saveToServer = async (providerId: string, values: FormValues) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const existingRecord = await db.select().from(llmSettingsTable)
    .where(
      eq(llmSettingsTable.provider, providerId),
    )
    .limit(1);

  if (existingRecord.length > 0) {
    await db.update(llmSettingsTable)
      .set(values)
      .where(eq(llmSettingsTable.provider, providerId))
  } else {
    // 如果用户不存在，插入新记录
    await db.insert(llmSettingsTable)
      .values({
        provider: providerId,
        providerName: values.providerName || 'Untitled',
        ...values
      })
  }
};

export const fetchAllProviders = async () => {
  const settings = await db.select({
    provider: llmSettingsTable.provider,
    providerName: llmSettingsTable.providerName,
    isActive: llmSettingsTable.isActive,
    apiStyle: llmSettingsTable.apiStyle,
    logo: llmSettingsTable.logo,
  })
    .from(llmSettingsTable);
  return settings;
}

export const fetchAllLlmSettings = async () => {
  // 包含 key 等敏感信息
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const settings = await db.select().from(llmSettingsTable).orderBy(asc(llmSettingsTable.order));
  return settings;
}

export async function fetchAllLlmModels(): Promise<llmModelType[]> {
  const allModels = await db.select()
    .from(llmModels)
    .leftJoin(llmSettingsTable, eq(llmModels.providerId, llmSettingsTable.provider))
    .where(eq(llmSettingsTable.isActive, true))
    .orderBy(desc(llmModels.order));

  return allModels.map(m => ({
    ...m.models,
    providerLogo: m.llm_settings?.logo || '',
    apiStyle: m.llm_settings?.apiStyle || 'openai',
  }));
}

export const fetchLlmModels = async (providerId?: string): Promise<llmModelType[]> => {
  // 明确指定字段，避免类型错误
  const modelFields = {
    id: llmModels.id,
    name: llmModels.name,
    displayName: llmModels.displayName,
    maxTokens: llmModels.maxTokens,
    supportVision: llmModels.supportVision,
    supportTool: llmModels.supportTool,
    selected: llmModels.selected,
    providerId: llmModels.providerId,
    providerName: llmModels.providerName,
    type: llmModels.type,
    order: llmModels.order,
    createdAt: llmModels.createdAt,
    updatedAt: llmModels.updatedAt,
  };
  if (providerId) {
    const result = await db
      .select({
        ...modelFields,
        providerLogo: llmSettingsTable.logo,
        apiStyle: llmSettingsTable.apiStyle,
      })
      .from(llmModels)
      .innerJoin(llmSettingsTable, eq(llmModels.providerId, llmSettingsTable.provider))
      .where(eq(llmModels.providerId, providerId))
      .orderBy(asc(llmModels.order), asc(llmModels.createdAt));
    return result.map((item: any) => ({
      ...item,
      providerLogo: item.providerLogo,
      apiStyle: item.apiStyle,
    }));
  } else {
    const result = await db
      .select({
        ...modelFields,
        providerLogo: llmSettingsTable.logo,
        apiStyle: llmSettingsTable.apiStyle,
      })
      .from(llmModels)
      .innerJoin(llmSettingsTable, eq(llmModels.providerId, llmSettingsTable.provider));
    return result.map((item: any) => ({
      ...item,
      providerLogo: item.providerLogo,
      apiStyle: item.apiStyle,
    }));
  }
}

export const getProviderById = async (providerId: string): Promise<LLMModelProvider> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }

  const result = await db.select().from(llmSettingsTable).where(
    eq(llmSettingsTable.provider, providerId),
  );

  if (!result || result.length === 0) {
    const error = new Error(`Provider with ID '${providerId}' not found`);
    (error as any).status = 404;
    throw error;
  }

  const dbProvider = result[0];

  // 将数据库字段映射到 LLMModelProvider 类型
  return {
    id: dbProvider.provider,
    providerName: dbProvider.providerName,
    apiStyle: dbProvider.apiStyle,
    providerLogo: dbProvider.logo || undefined,
    status: dbProvider.isActive || false,
    type: dbProvider.type || 'default'
  };
}

export const fetchAvailableProviders = async () => {
  const availableProviders = await db.select().from(llmSettingsTable).where(
    eq(llmSettingsTable.isActive, true),
  );
  return availableProviders;
}
const getUserModels = async (): Promise<number[]> => {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) return [];
  const dbUserInfo = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  const groupId = dbUserInfo?.groupId;
  if (!groupId) {
    return (await db.query.llmModels.findMany({
      columns: { id: true }
    })).map(m => m.id);
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  return group?.modelType === 'all'
    ? (await db.query.llmModels.findMany({ columns: { id: true } })).map(m => m.id)
    : (await db.query.groupModels.findMany({
      where: eq(groupModels.groupId, groupId),
      columns: { modelId: true },
    })).map(m => m.modelId);

}
export const fetchAvailableLlmModels = async (requireAuth: boolean = true): Promise<llmModelType[]> => {
  const userModels = requireAuth ? new Set(await getUserModels()) : new Set<number>();
  const result = await db
    .select()
    .from(llmSettingsTable)
    .innerJoin(llmModels, eq(llmSettingsTable.provider, llmModels.providerId))
    .orderBy(
      asc(llmSettingsTable.order),
      asc(llmModels.order),
    )
    .where(
      and(
        eq(llmSettingsTable.isActive, true),
        eq(llmModels.selected, true),
      )
    );
  const llmModelList: llmModelType[] = result
    .map((i) => {
      return {
        ...i.models,
        id: i.models?.id ?? 0,
        providerName: i.llm_settings.providerName,
        providerLogo: i.llm_settings.logo || '',
        apiStyle: i.llm_settings.apiStyle,
      }
    })
    .filter((model) => model !== null && (!requireAuth || userModels.has(model.id)));
  return llmModelList;
}

export const changeSelectInServer = async (modelName: string, selected: boolean) => {
  await db.update(llmModels)
    .set({
      selected: selected,
    })
    .where(eq(llmModels.name, modelName))
}

export const changeModelSelectInServer = async (model: LLMModel, selected: boolean) => {
  const hasExist = await db.select()
    .from(llmModels)
    .where(
      and(
        eq(llmModels.name, model.id),
        eq(llmModels.providerId, model.provider.id)
      )
    )
  if (hasExist.length > 0) {
    await db.update(llmModels)
      .set({
        selected: selected,
      })
      .where(eq(llmModels.name, model.id))
  } else {
    await db.insert(llmModels).values({
      name: model.id,
      displayName: model.displayName,
      selected: selected,
      type: 'default',
      providerId: model.provider.id,
      providerName: model.provider.providerName,
      order: 100,
    })
  }
}

export const deleteCustomModelInServer = async (modelName: string) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  await db.delete(llmModels).where(eq(llmModels.name, modelName));
}

export const addCustomModelInServer = async (modelInfo: {
  name: string,
  displayName: string,
  maxTokens: number,
  supportVision: boolean,
  supportTool: boolean,
  selected: boolean,
  type: 'custom',
  providerId: string,
  providerName: string,
}) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  await db.insert(llmModels).values({
    name: modelInfo.name,
    displayName: modelInfo.displayName,
    maxTokens: modelInfo.maxTokens,
    supportVision: modelInfo.supportVision,
    supportTool: modelInfo.supportTool,
    selected: modelInfo.selected,
    type: modelInfo.type,
    providerId: modelInfo.providerId,
    providerName: modelInfo.providerName,
    order: 100,
  })
}

export const updateCustomModelInServer = async (oldModelName: string, modelInfo: {
  name: string,
  displayName: string,
  maxTokens: number,
  supportVision: boolean,
  supportTool: boolean,
  selected: boolean,
  type: 'custom',
  providerId: string,
  providerName: string,
}) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  await db.update(llmModels).set({
    name: modelInfo.name,
    displayName: modelInfo.displayName,
    maxTokens: modelInfo.maxTokens,
    supportVision: modelInfo.supportVision,
    supportTool: modelInfo.supportTool,
    selected: modelInfo.selected,
    type: modelInfo.type,
    providerId: modelInfo.providerId,
    providerName: modelInfo.providerName,
  }).where(eq(llmModels.name, oldModelName));
}

export const addCustomProviderInServer = async (providerInfo: {
  provider: string,
  providerName: string,
  endpoint: string,
  apiStyle: 'openai' | 'openai_response' | 'claude' | 'gemini',
  apikey: string,
}) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const existingProvider = await db
    .select()
    .from(llmSettingsTable)
    .where(eq(llmSettingsTable.provider, providerInfo.provider));

  if (existingProvider.length > 0) {
    throw new Error('Provider already exists');
  }

  await db.insert(llmSettingsTable).values({
    ...providerInfo,
    isActive: true,
    type: 'custom',
    order: 100,
  });
};

export const deleteCustomProviderInServer = async (providerId: string) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  await db.delete(llmSettingsTable).where(eq(llmSettingsTable.provider, providerId));
};

export const saveModelsOrder = async (
  providerId: string,
  newOrderModels: {
    modelId: string;
    order: number
  }[]) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    await db.transaction(async (tx) => {
      for (const item of newOrderModels) {
        await tx
          .update(llmModels)
          .set({ order: item.order })
          .where(and(eq(llmModels.name, item.modelId), eq(llmModels.providerId, providerId)));
      }
    });
  } catch (error) {
    console.error('Failed to update models order:', error);
    throw new Error('Failed to update models order');
  }
}

export const saveProviderOrder = async (
  newOrderProviders: {
    providerId: string;
    order: number
  }[]) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    await db.transaction(async (tx) => {
      for (const item of newOrderProviders) {
        await tx
          .update(llmSettingsTable)
          .set({ order: item.order })
          .where(eq(llmSettingsTable.provider, item.providerId));
      }
    });
  } catch (error) {
    console.error('Failed to update providers order:', error);
    throw new Error('Failed to update providers order');
  }
}

export const updateModelFamilyOrder = async (
  orders: { id: number; order: number }[]
) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    await db.transaction(async (tx) => {
      for (const item of orders) {
        await tx
          .update(modelFamilies)
          .set({ order: item.order })
          .where(eq(modelFamilies.id, item.id));
      }
    });
  } catch (error) {
    console.error('Failed to update model families order:', error);
    throw new Error('Failed to update model families order');
  }
};

export const fetchGroupedModels = async () => {
  const allFamilies = await db.query.modelFamilies.findMany({
    orderBy: asc(modelFamilies.order),
  });

  const allModels = await db.query.llmModels.findMany({
    orderBy: asc(llmModels.order),
    with: {
      provider: {
        columns: {
          logo: true,
          apiStyle: true,
        }
      }
    }
  });

  const groupedModels = allFamilies.map(family => ({
    ...family,
    models: allModels.filter(model => model.familyId === family.id).map(m => ({
      ...m,
      providerLogo: m.provider?.logo || '',
      apiStyle: m.provider?.apiStyle || 'openai',
    })),
  }));

  const uncategorizedModels = allModels.filter(model => !model.familyId).map(m => ({
    ...m,
    providerLogo: m.provider?.logo || '',
    apiStyle: m.provider?.apiStyle || 'openai',
  }));

  return {
    groupedModels,
    uncategorizedModels,
  };
};

export const syncAndGroupModels = async (providerId: string) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('Not allowed');
  }

  // 1. 获取所有模型家族及其规则
  const families = await db.query.modelFamilies.findMany();

  // 2. 获取远程模型
  const remoteModels = await getRemoteModelsByProvider(providerId);

  // 3. 准备要插入/更新的数据
  const modelsToUpsert = remoteModels.map(model => {
    // 寻找匹配的家族
    const foundFamily = families.find(family =>
      family.matchRules.some(rule => model.id.toLowerCase().includes(rule.toLowerCase()))
    );

    return {
      name: model.id,
      displayName: model.id, // 默认显示名称为ID，之后可修改
      providerId: providerId,
      providerName: providerId, // 暂时用ID
      familyId: foundFamily?.id,
      // 其他默认值
      selected: true,
      type: 'default' as const,
    };
  });

  if (modelsToUpsert.length === 0) {
    return { success: true, message: 'No new models found.' };
  }

  // 4. 使用事务和 upsert 批量写入
  try {
    await db.transaction(async (tx) => {
      await tx.insert(llmModels)
        .values(modelsToUpsert)
        .onConflictDoUpdate({
          target: [llmModels.name, llmModels.providerId],
          set: {
            // 在冲突时，可以只更新特定的字段，例如 familyId
            familyId: sql`excluded.family_id`,
            displayName: sql`excluded.display_name`,
          }
        });
    });
    return { success: true, message: `Successfully synchronized ${modelsToUpsert.length} models.` };
  } catch (error) {
    console.error('Failed to sync and group models:', error);
    return { success: false, message: 'Failed to synchronize models.' };
  }
};

export const getRemoteModelsByProvider = async (providerId: string): Promise<{
  id: string;
  object: string;
  created: number;
  owned_by: string;
}[]> => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const llmConfig = await getLlmConfigByProvider(providerId);
  const response = await fetch(`${llmConfig.endpoint}/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${llmConfig.apikey}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch remote models');
  }

  const result = await response.json();
  return result.data;
}
