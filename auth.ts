import NextAuth from "next-auth";
import { ZodError } from "zod";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@/app/lib/zod";
import { verifyPassword } from "@/app/utils/password";
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

let authProviders: any[] = [];
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...authProviders,
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
      if (account?.provider === "credentials" && token.sub) {
        token.provider = 'credentials';
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
  },
})