import type { NextAuthConfig } from 'next-auth';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export const authConfig = {
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
  providers: [], // providers 将在主 auth.ts 文件中动态添加
} satisfies NextAuthConfig; 