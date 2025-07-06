'use server';
import { db } from '@/app/db';
import { eq, and, sql } from 'drizzle-orm'
import { chats, usageReport, users } from '@/app/db/schema';

type UsageType = {
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
}

type UsageDetail = {
  chatId?: string,
  date: string,
  userId: string,
  modelId: string,
  providerId: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens: number,
}

export const isUserWithinQuota = async (userId: string, providerId: string, modelId: string):
  Promise<{ tokenPassFlag: boolean, modelPassFlag: boolean }> => {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      group: {
        columns: {
          tokenLimitType: true,
          monthlyTokenLimit: true,
          modelType: true,
        },
        with: {
          models: {
            with: {
              model: {
                columns: {
                  name: true,
                  providerId: true,
                }
              }
            }
          }
        }
      }
    }
  }) as {
    group: {
      modelType: 'all' | 'specific',
      tokenLimitType: 'unlimited' | 'limited',
      monthlyTokenLimit: number | null,
      models?: { model: { name: string, providerId: string } }[]
    } | null,
    usageUpdatedAt: Date,
    currentMonthTotalTokens: number
  } | null;

  let tokenPassFlag = false;
  let modelPassFlag = false;

  if (result && result.group) {
    const { tokenLimitType, monthlyTokenLimit } = result.group;
    const monthlyTokenLimitNumber = monthlyTokenLimit || 0;
    if (tokenLimitType === 'unlimited') {
      tokenPassFlag = true;
    } else {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      let realMonthlyTotalTokens = 0;
      if (result.usageUpdatedAt > firstDayOfMonth) {
        realMonthlyTotalTokens = result.currentMonthTotalTokens;
      }

      if (realMonthlyTotalTokens < monthlyTokenLimitNumber) {
        tokenPassFlag = true;
      } else {
        tokenPassFlag = false;
      }
    }

    if (result.group.modelType === 'all') {
      modelPassFlag = true;
    } else {
      const hasMatchingModel = result.group.models?.some(
        (groupModel) =>
          groupModel.model.providerId === providerId &&
          groupModel.model.name === modelId
      );
      modelPassFlag = hasMatchingModel || false;
    }
  } else {
    tokenPassFlag = false;
  }
  return {
    tokenPassFlag,
    modelPassFlag,
  }
}

export const updateUsage = async (userId: string, usage: UsageDetail) => {
  updateUserUsage(userId, {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });

  if (usage.chatId) {
    updateChatUsage(usage.chatId, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    });
  }
  updateUsageReport(usage);
}

export const updateUserUsage = async (userId: string, usage: UsageType) => {
  const userDetail = await db.query.users
    .findFirst({
      where: eq(users.id, userId)
    });
  // 获取今天0点的时间
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  if (userDetail?.usageUpdatedAt && new Date(userDetail.usageUpdatedAt) < firstDayOfMonth) {
    // 如果最后更新时间早于本月 1 日 0点，重置计数
    await db.update(users).set({
      todayTotalTokens: usage.totalTokens,
      currentMonthTotalTokens: usage.totalTokens,
      usageUpdatedAt: new Date(),
    })
      .where(eq(users.id, userId));
  } else if (userDetail?.usageUpdatedAt && new Date(userDetail.usageUpdatedAt) < today) {
    // 如果最后更新时间早于今日 0点，重置当日计数
    await db.update(users).set({
      todayTotalTokens: usage.totalTokens,
      currentMonthTotalTokens: sql`${users.currentMonthTotalTokens} + ${usage.totalTokens}`,
      usageUpdatedAt: new Date(),
    })
      .where(eq(users.id, userId));
  } else {
    // 如果是本日内的更新，累加计数
    await db.update(users).set({
      todayTotalTokens: sql`${users.todayTotalTokens} + ${usage.totalTokens}`,
      currentMonthTotalTokens: sql`${users.currentMonthTotalTokens} + ${usage.totalTokens}`,
      usageUpdatedAt: new Date(),
    })
      .where(eq(users.id, userId));
  }
}

const updateChatUsage = async (chatId: string, usage: UsageType) => {
  await db.update(chats).set({
    inputTokens: sql`${chats.inputTokens} + ${usage.inputTokens}`,
    outputTokens: sql`${chats.outputTokens} + ${usage.outputTokens}`,
    totalTokens: sql`${chats.totalTokens} + ${usage.totalTokens}`,
  })
    .where(eq(chats.id, chatId))
}

const updateUsageReport = async (updateRecord: UsageDetail) => {
  const existingRecord = await db.select()
    .from(usageReport)
    .where(
      and(
        eq(usageReport.date, updateRecord.date),
        eq(usageReport.userId, updateRecord.userId),
        eq(usageReport.modelId, updateRecord.modelId),
        eq(usageReport.providerId, updateRecord.providerId)
      )
    )
    .limit(1);

  if (existingRecord.length > 0) {
    // 如果记录存在，更新tokens值
    await db.update(usageReport)
      .set({
        inputTokens: sql`${usageReport.inputTokens} + ${updateRecord.inputTokens}`,
        outputTokens: sql`${usageReport.outputTokens} + ${updateRecord.outputTokens}`,
        totalTokens: sql`${usageReport.totalTokens} + ${updateRecord.totalTokens}`,
      })
      .where(
        and(
          eq(usageReport.date, updateRecord.date),
          eq(usageReport.userId, updateRecord.userId),
          eq(usageReport.modelId, updateRecord.modelId),
          eq(usageReport.providerId, updateRecord.providerId)
        )
      );
  } else {
    // 如果记录不存在，插入新记录
    await db.insert(usageReport).values(updateRecord);
  }
}