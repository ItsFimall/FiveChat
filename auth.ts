import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { GetServerSidePropsContext } from "next";
import NextAuth, { getServerSession as nextAuthGetServerSession, NextAuthOptions } from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/app/db";
import { accounts, users } from "@/app/db/schema";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "密码",
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "example@hivechat.net" },
        password: { label: "密码", type: "password" }
      },
      // @ts-expect-error
      authorize: async ({ email, password, domain }) => {
        try {
          const ret = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email,
              password,
              domain,
            })
          }).then(res => res.json())

          if (ret?.code === 200) {
            return ret.user;
          }

          return null;
        } catch (e) {
          console.error(e);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/setup",
    verifyRequest: "/verification-request"
  },
  session: {
    strategy: "jwt",
    maxAge: 604800, // 7 days
  },
  callbacks: {
    signIn: async ({ user, account, profile, email, credentials }) => {
      const isAllowedToSignIn = true
      if (isAllowedToSignIn) {
        return true
      } else {
        return false
      }
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      if (user) {
        token = {
          ...token,
          id: user.id,
          email: user.email || "",
          name: user.name,
          isAdmin: user.isAdmin,
          image: user.image,
        }
      }

      return token;
    },
    async session({ session, token, user }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        email: token.email as string,
        name: token.name,
        isAdmin: token.isAdmin as boolean,
        image: token.image,
        provider: token.provider,
      }
      return session
    }
  }
}

export function auth(...args: [GetServerSidePropsContext] | []) {
  return nextAuthGetServerSession(...args, authOptions)
}