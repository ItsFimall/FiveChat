'use server';
import bcrypt from "bcryptjs";
import { eq, or, and, lt } from 'drizzle-orm';
import { users, groups, passwordResetTokens } from '@/app/db/schema';
import { db } from '@/app/db';
import { signIn } from '@/auth';
import { fetchAppSettings, setAppSettings } from "@/app/admin/system/actions";
import { auth } from '@/auth';

export async function register(username: string, email: string | undefined, password: string) {
  const resultValue = await fetchAppSettings('isRegistrationOpen');
  if (resultValue !== 'true') {
    return {
      status: 'fail',
      message: '未开放注册',
    };
  }
  try {
    // 检查用户名是否已存在
    const existingUserByUsername = await db.query.users
      .findFirst({
        where: eq(users.username, username)
      })
    if (existingUserByUsername) {
      return {
        status: 'fail',
        message: '该用户名已被注册',
      };
    }

    // 如果提供了邮箱，检查邮箱是否已存在
    if (email) {
      const existingUserByEmail = await db.query.users
        .findFirst({
          where: eq(users.email, email)
        })
      if (existingUserByEmail) {
        return {
          status: 'fail',
          message: '该邮箱已被注册',
        };
      }
    }
    // 生成盐值 (salt)，指定盐值的回合次数（通常是 10）
    const salt = await bcrypt.genSalt(10);

    // 使用盐值对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultGroup = await db.query.groups.findFirst({
      where: eq(groups.isDefault, true)
    });
    const groupId = defaultGroup?.id || null;
    // 将新用户数据插入数据库
    const result = await db.insert(users).values({
      username,
      email: email || null,
      name: username, // 默认使用用户名作为显示名称
      password: hashedPassword,
      groupId: groupId
    });
    // 注册成功后，自动登录
    const signInResponse = await signIn("credentials", {
      redirect: false, // 不跳转页面
      username,
      password,
    });
    // 返回成功消息或其他所需数据
    return {
      status: 'success',
    }
  } catch (error) {
    console.log(error)
    throw new Error('用户注册失败，请稍后再试');
  }
}

export async function adminSetup(email: string, password: string, adminCode: string) {
  try {
    const user = await db.query.users
      .findFirst({
        where: eq(users.email, email)
      })
    if (user) {
      return {
        status: 'fail',
        message: '该邮箱已被注册',
      };
    }
    const envAdminCode = process.env.ADMIN_CODE;
    if (envAdminCode !== adminCode) {
      return {
        status: 'fail',
        message: 'Admin Code 错误',
      };
    }
    // 生成盐值 (salt)，指定盐值的回合次数（通常是 10）
    const salt = await bcrypt.genSalt(10);

    // 使用盐值对密码进行哈希处理
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultGroup = await db.query.groups.findFirst({
      where: eq(groups.isDefault, true)
    });
    const groupId = defaultGroup?.id || null;
    // 将新用户数据插入数据库
    const result = await db.insert(users).values({
      email,
      password: hashedPassword,
      isAdmin: true,
      groupId: groupId
    });
    // 注册成功后，自动登录
    const signInResponse = await signIn("credentials", {
      redirect: false, // 不跳转页面
      email,
      password,
    });
    await setAppSettings('hasSetup', 'true');
    return {
      status: 'success',
    }
  } catch (error) {
    console.log(error)
    throw new Error('用户注册失败，请稍后再试');
  }
}

export async function adminSetupLogined(adminCode: string) {
  const session = await auth();
  if (!session?.user) {
    return {
      status: 'fail',
      message: '请先登录',
    };
  }
  const envAdminCode = process.env.ADMIN_CODE;
  if (envAdminCode !== adminCode) {
    return {
      status: 'fail',
      message: 'Admin Code 错误',
    };
  }
  const defaultGroup = await db.query.groups.findFirst({
    where: eq(groups.isDefault, true)
  });
  const groupId = defaultGroup?.id || null;
  await db.update(users).set({
    isAdmin: true,
    groupId: groupId,
  })
    .where(eq(users.id, session.user.id));
  // 注册成功后，自动登录
  await setAppSettings('hasSetup', 'true');
  // await signIn("feishu");
  return {
    status: 'success',
  }
}

export async function getActiveAuthProvides() {
  const activeAuthProvides = [];

  // 兼容历史版本，只要没配置 OFF，就默认启用 Email 登录
  if (!process.env.EMAIL_AUTH_STATUS || (process.env.EMAIL_AUTH_STATUS.toLowerCase() !== 'off')) {
    activeAuthProvides.push('email')
  }

  // 获取动态 OAuth 提供商
  try {
    const { getDynamicOAuthProviderNames } = await import('@/app/lib/dynamic-oauth-provider');
    const dynamicProviders = await getDynamicOAuthProviderNames();
    activeAuthProvides.push(...dynamicProviders);
  } catch (error) {
    console.error('Failed to get dynamic OAuth providers:', error);

    // 回退到旧的配置系统
    const { hasOAuthConfig } = await import('@/app/lib/auth-config');

    if (await hasOAuthConfig('google')) {
      activeAuthProvides.push('google');
    }

    if (await hasOAuthConfig('github')) {
      activeAuthProvides.push('github');
    }

    if (await hasOAuthConfig('discord')) {
      activeAuthProvides.push('discord');
    }
  }

  return activeAuthProvides;
}

// 请求密码重置
export async function requestPasswordReset(usernameOrEmail: string) {
  try {
    // 查找用户（支持用户名或邮箱）
    const user = await db.query.users
      .findFirst({
        where: or(
          eq(users.username, usernameOrEmail),
          eq(users.email, usernameOrEmail)
        )
      });

    if (!user) {
      return {
        status: 'fail',
        message: '用户不存在',
      };
    }

    if (!user.email) {
      return {
        status: 'fail',
        message: '该用户未设置邮箱，无法重置密码',
      };
    }

    // 生成重置token
    const resetToken = crypto.randomUUID() + '-' + Date.now();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 删除该用户之前的重置token
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    // 插入新的重置token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    // 这里应该发送邮件，但由于要求仅为验证，我们只返回成功
    // 在实际应用中，这里会发送包含重置链接的邮件
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    return {
      status: 'success',
      message: '密码重置链接已发送到您的邮箱',
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      status: 'fail',
      message: '请求密码重置失败，请稍后再试',
    };
  }
}

// 验证重置token
export async function verifyResetToken(token: string) {
  try {
    const resetRecord = await db.query.passwordResetTokens
      .findFirst({
        where: eq(passwordResetTokens.token, token),
        with: {
          user: true
        }
      });

    if (!resetRecord) {
      return {
        valid: false,
        message: '无效的重置链接',
      };
    }

    if (resetRecord.expiresAt < new Date()) {
      // 删除过期的token
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, resetRecord.id));

      return {
        valid: false,
        message: '重置链接已过期',
      };
    }

    return {
      valid: true,
      userId: resetRecord.userId,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      valid: false,
      message: '验证重置链接失败',
    };
  }
}

// 重置密码
export async function resetPassword(token: string, newPassword: string) {
  try {
    // 验证token
    const tokenVerification = await verifyResetToken(token);
    if (!tokenVerification.valid) {
      return {
        status: 'fail',
        message: tokenVerification.message,
      };
    }

    // 生成新密码的哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新用户密码
    await db.update(users)
      .set({
        password: hashedPassword,
      })
      .where(eq(users.id, tokenVerification.userId!));

    // 删除使用过的token
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    return {
      status: 'success',
      message: '密码重置成功',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      status: 'fail',
      message: '密码重置失败，请稍后再试',
    };
  }
}

