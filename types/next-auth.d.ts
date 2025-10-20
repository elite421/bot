import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      role?: "user" | "admin";
      totalAuthCredits?: number;
    };
  }

  interface User extends DefaultUser {
    role?: "user" | "admin";
    totalAuthCredits?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "user" | "admin";
    totalAuthCredits?: number;
  }
}

export {};
