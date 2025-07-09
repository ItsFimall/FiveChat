import NextAuth from "next-auth";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/app/utils/password";
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq, or } from 'drizzle-orm';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        username: {}, // 支持用户名或邮箱
        email: {}, // 保持兼容性
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const loginField = credentials?.username || credentials?.email;
          const password = credentials?.password;

          if (!loginField || !password || typeof loginField !== 'string' || typeof password !== 'string') {
            return null;
          }

          // 查找用户：支持用户名或邮箱登录
          const user = await db.query.users
            .findFirst({
              where: or(
                eq(users.username, loginField),
                eq(users.email, loginField)
              )
            })

          if (!user || !user.password) {
            return null;
          }

          const passwordMatch = await verifyPassword(password, user.password);
          if (passwordMatch) {
            return {
              id: user.id,
              name: user.name || user.username,
              email: user.email,
              username: user.username,
              isAdmin: user.isAdmin || false,
            };
          } else {
            return null;
          }
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
    // 内置OAuth提供商已移除，仅支持动态OAuth提供商
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