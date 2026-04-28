import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select("+password");
        if (!user || !user.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user._id.toString(), email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
          const parts = (user.name || "").trim().split(" ");
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || "";
          dbUser = await User.create({
            name: user.name,
            firstName,
            lastName,
            email: user.email,
            image: user.image,
            onboarded: false,
          });
        }
        user.id = dbUser._id.toString();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
});
