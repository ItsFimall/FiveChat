'use server';
import { groups, users } from '@/app/db/schema';
import { db } from '@/app/db';
import { desc, eq, is } from 'drizzle-orm';
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

type UserActionParams = {
  email: string;
  password?: string;
  isAdmin: boolean;
  groupId?: string;
};

const handleDatabaseError = (error: unknown, defaultMessage: string) => ({
  success: false,
  message: error instanceof Error ? error.message : defaultMessage
});

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export async function getUserList(groupId?: string) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('Not allowed');
  }
  let result
  try {
    if (!groupId || groupId === '_all') {
      result = await db.query.users.findMany({
        orderBy: [desc(users.createdAt)],
        with: {
          group: {
            columns: {
              name: true,
              tokenLimitType: true,
              monthlyTokenLimit: true,
            }
          }
        }
      });
    } else {
      result = await db.query.users.findMany({
        where: eq(users.groupId, groupId),
        orderBy: [desc(users.createdAt)],
        with: {
          group: {
            columns: {
              name: true,
              tokenLimitType: true,
              monthlyTokenLimit: true,
            }
          }
        }
      });
    }

    // 获取今天凌晨 0 点的时间戳
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    // 处理每条记录的 todayTotalTokens
    result = result.map(user => ({
      ...user,
      todayTotalTokens: new Date(user.usageUpdatedAt) >= today
        ? user.todayTotalTokens
        : 0,
      currentMonthTotalTokens: new Date(user.usageUpdatedAt) >= firstDayOfMonth
        ? user.currentMonthTotalTokens
        : 0,
      group: user.group ? {
        ...user.group,
        tokenLimitType: user.group.tokenLimitType as 'unlimited' | 'limited'
      } : null
    }));
    return result;
  } catch (error) {
    throw new Error('Failed to fetch user list');
  }
}

export async function addUser(user: UserActionParams & { password: string }) {
  const session = await auth();
  if (!session?.user.isAdmin) return handleDatabaseError(null, 'Not allowed');
  try {
    const emailExists = await db.query.users.findFirst({
      where: eq(users.email, user.email),
    });
    if (emailExists) return { success: false, message: 'Email has been registered' }
    const hashedPassword = await hashPassword(user.password);
    const group = user.groupId ? await db.query.groups.findFirst({
      where: eq(groups.id, user.groupId)
    }) : null;
    if (user.groupId && !group) {
      return {
        success: false,
        message: 'Group not found'
      }
    }
    await db.insert(users).values({
      email: user.email,
      password: hashedPassword,
      isAdmin: user.isAdmin,
      groupId: user.groupId
    })
    return {
      success: true,
      message: 'User added successfully'
    }
  } catch (error) {
    return handleDatabaseError(error, 'User registration failed');
  }
}

export async function deleteUser(email: string) {
  const session = await auth();
  if (!session?.user.isAdmin) {
    throw new Error('not allowed');
  }
  try {
    await db.delete(users).where(eq(users.email, email));
    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: 'User delete failed'
    }
  }
}

export async function updateUser(email: string, user: UserActionParams) {
  const session = await auth();
  if (!session?.user.isAdmin) return handleDatabaseError(null, 'Not Allowed');
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })
    if (!existingUser) return {
      success: false, message: 'User not found'
    }
    const updateData = {
      email: user.email,
      isAdmin: user.isAdmin,
      groupId: user.groupId,
      ...(user.password && {
        password: await hashPassword(user.password)
      })
    }
    await db.update(users).set(updateData).where(eq(users.email, email))
    return {
      success: true,
      message: 'User updated successfully'
    }
  } catch (error) {
    return handleDatabaseError(error, 'User update failed');
  }
}