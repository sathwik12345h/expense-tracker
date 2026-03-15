import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";

// Temporary mock user — Week 2 we replace this with a real database
const MOCK_USERS = [
  {
    id: "1",
    name: "Sathwik",
    email: "test@spendwise.com",
    // bcrypt hash of "password123"
    password: "$2b$10$UtlN7W1DNmOSvIXAgZcjZOt1UaEb6rksL8OtIU.mU9PweUnP5SvDm",
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = MOCK_USERS.find((u) => u.email === credentials.email);
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});