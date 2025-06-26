'use server';
import { db } from '@/app/db';
import { auth } from "@/auth";
import { eq, and, or, desc } from 'drizzle-orm'
import { chats, bots } from '@/app/db/schema';

export const addBotInServer = async (botInfo: {
  title: string;
  desc?: string;
  prompt: string;
  avatar: string;
  avatarType: 'emoji' | 'url';
}) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }

  try {
    // 检查标题是否重复
    const existingBot = await db.select()
      .from(bots)
      .where(eq(bots.title, botInfo.title));

    if (existingBot.length > 0) {
      return {
        status: 'fail',
        message: '智能体名称已存在，请使用不同的名称'
      }
    }

    const botResult = await db.insert(bots)
      .values({
        ...botInfo,
        creator: 'public'
      })
      .returning();

    return {
      status: 'success',
      data: botResult[0]
    }
  } catch (error) {
    console.error('Failed to create bot:', error);
    return {
      status: 'fail',
      message: '创建智能体失败，请稍后重试'
    }
  }
}

export const deleteBotInServer = async (botId: number) => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }

  await db.delete(bots)
    .where(
      and(
        eq(bots.id, botId),
        eq(bots.creator, 'public')
      ));
  return {
    status: 'success'
  }
}

export const getBotListInServer = async () => {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  const result = await db.select()
    .from(bots)
    .where(
      eq(bots.creator, 'public')
    )
    .orderBy(desc(bots.createdAt));
  if (result.length > 0) {
    return {
      status: 'success',
      data: result
    }
  } else {
    return {
      status: 'fail',
      data: []
    }
  }
}

export const getBotInfoInServer = async (botId: number) => {

  const result = await db.select()
    .from(bots)
    .where(
      eq(bots.id, botId),
    );
  if (result.length > 0) {
    return {
      status: 'success',
      data: result[0]
    }
  } else {
    return {
      status: 'fail',
    }
  }
}