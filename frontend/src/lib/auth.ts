import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureDefaultAdminUser, ensureGoogleUser, getUserByEmail, verifyCredentials } from "@/lib/store/users";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await ensureDefaultAdminUser();
        const email = (credentials?.email || "").toLowerCase().trim();
        const password = credentials?.password || "";
        if (!email || !password) return null;

        const user = await verifyCredentials({ email, password });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      if (account?.provider === "google") {
        await ensureGoogleUser({ email: user.email, name: user.name || null });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await getUserByEmail(user.email.toLowerCase());
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/account/login",
  },
};
