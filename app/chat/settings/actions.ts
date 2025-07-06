'use server';
import { users } from '@/app/db/schema';
import { db } from '@/app/db';
import { eq } from 'drizzle-orm';
import { auth } from "@/auth";
import bcrypt from "bcryptjs";


export async function updatePassword(email: string, oldPassword: string, newPassword: string,) {
  const session = await auth();
  if (session?.user.email !== email) {
    throw new Error('not allowed');
  }
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) {
      return {
        success: false,
        message: '该用户不存在',
      };
    }
    const isMatch = await bcrypt.compare(oldPassword, existingUser.password || '');
    if (!isMatch) {
      return {
        success: false,
        message: '旧密码错误',
      };
    }

    let updateResult = null;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    // 更新用户信息
    updateResult = await db.update(users)
      .set({
        password: hashedPassword,
      })
      .where(eq(users.email, email));
    return {
      success: true,
      message: '已更新',
    };

  } catch (error) {
    return {
      success: false,
      message: 'database delete error'
    }
  }
}

export const getUserUsage = async () => {
  const session = await auth();
  if (!session?.user) {
    throw new Error('not allowed');
  }
  let userTodayTotalTokens = 0;
  let userCurrentMonthTotalTokens = 0;
  let userMonthlyTokenLimit = 0;
  let userTokenLimitType = 'limited';
  const userDetail = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      group: {
        columns: {
          tokenLimitType: true,
          monthlyTokenLimit: true,
        }
      }
    }
  });
  if (userDetail && userDetail.group) {
    const { tokenLimitType, monthlyTokenLimit } = userDetail.group;
    userTokenLimitType = tokenLimitType || 'limited' as const;
    userMonthlyTokenLimit = monthlyTokenLimit || 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  if (userDetail?.usageUpdatedAt && new Date(userDetail.usageUpdatedAt) < firstDayOfMonth) {
    userTodayTotalTokens = 0;
    userCurrentMonthTotalTokens = 0;
  } else if (userDetail?.usageUpdatedAt && new Date(userDetail.usageUpdatedAt) < today) {
    userTodayTotalTokens = 0;
    userCurrentMonthTotalTokens = userDetail?.currentMonthTotalTokens || 0;
  } else {
    userTodayTotalTokens = userDetail?.todayTotalTokens || 0;
    userCurrentMonthTotalTokens = userDetail?.currentMonthTotalTokens || 0;
  }
  return {
    todayTotalTokens: userTodayTotalTokens,
    currentMonthTotalTokens: userCurrentMonthTotalTokens,
    monthlyTokenLimit: userMonthlyTokenLimit,
    tokenLimitType: userTokenLimitType,
  }
}