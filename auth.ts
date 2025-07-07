import NextAuth from "next-auth";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import { signInSchema } from "@/app/lib/zod";
import { verifyPassword } from "@/app/utils/password";
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { fetchOAuthConfig } from '@/app/admin/system/actions';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = await signInSchema.parseAsync(credentials);
          const user = await db.query.users
            .findFirst({
              where: eq(users.email, email)
            })
          if (!user || !user.password) {
            return null;
          }
          const passwordMatch = await verifyPassword(password, user.password);
          if (passwordMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              isAdmin: user.isAdmin || false,
            };
          } else {
            return null;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            // 如果验证失败，返回 null 表示凭据无效
            return null;
          }
          // 处理其他错误
          throw error;
        }
      },
    }),
    // OAuth Providers - 优先从环境变量读取，数据库配置通过 getActiveAuthProvides 检查
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      })
    ] : []),
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET ? [
      Discord({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      })
    ] : []),
  ],
  pages: {
    error: '/auth/error', // 自定义错误页面
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      if (account?.provider) {
        token.provider = account.provider;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user, // 保留已有的属性
          id: String(token.id),
          isAdmin: Boolean(token.isAdmin), // 添加 isAdmin
          provider: token.provider as string,
        };
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in
      if (account?.provider !== "credentials") {
        try {
          // Check if user already exists
          const existingUser = await db.query.users
            .findFirst({
              where: eq(users.email, user.email!)
            });

          if (existingUser) {
            // Update user info if needed
            user.id = existingUser.id;
            user.isAdmin = existingUser.isAdmin || false;
            return true;
          } else {
            // Create new user for OAuth sign-in
            const newUser = await db.insert(users).values({
              email: user.email!,
              name: user.name || (profile as any)?.name || user.email!.split('@')[0],
              image: user.image || (profile as any)?.image,
              // OAuth users don't have passwords
              password: null,
            }).returning();

            if (newUser[0]) {
              user.id = newUser[0].id;
              user.isAdmin = newUser[0].isAdmin || false;
            }
            return true;
          }
        } catch (error) {
          console.error("Error during OAuth sign-in:", error);
          return false;
        }
      }
      return true;
    },
  },
})