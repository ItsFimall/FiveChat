import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from "next-auth/providers/credentials";
import { getDynamicOAuthProviders } from '@/app/lib/dynamic-oauth-provider';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq, or } from 'drizzle-orm';
import { verifyPassword } from "@/app/utils/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: {},
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const loginField = credentials?.username || credentials?.email;
        const password = credentials?.password;

        if (!loginField || !password || typeof loginField !== 'string' || typeof password !== 'string') {
          return null;
        }
        const user = await db.query.users.findFirst({
          where: or(eq(users.username, loginField), eq(users.email, loginField))
        });
        if (!user || !user.password) return null;

        const passwordMatch = await verifyPassword(password, user.password);
        if (passwordMatch) {
          return {
            id: user.id,
            name: user.name || user.username,
            email: user.email,
            username: user.username,
            isAdmin: user.isAdmin || false,
          };
        }
        return null;
      }
    }),
    ...(await getDynamicOAuthProviders()),
    ...authConfig.providers,
  ],
});