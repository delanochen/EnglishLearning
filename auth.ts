import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentials = z.object({ email: z.string().email().transform((v) => v.toLowerCase()), password: z.string().min(8).max(128) });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
    authorize: async (raw, request) => {
      const parsed = credentials.safeParse(raw);
      if (!parsed.success) return null;
      const emailHash = hash(parsed.data.email);
      const ipHash = hash(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown");
      const since = new Date(Date.now() - 15 * 60_000);
      const failures = await db.loginAttempt.count({ where: { emailHash, ipHash, successful: false, createdAt: { gte: since } } });
      if (failures >= 8) return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email } });
      const valid = Boolean(user?.passwordHash && user.status === "ACTIVE" && !user.deletedAt && await verifyPassword(user.passwordHash, parsed.data.password));
      await db.loginAttempt.create({ data: { userId: user?.id, emailHash, ipHash, successful: valid } });
      if (!valid || !user) return null;
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      return { id: user.id, email: user.email, name: user.name, image: user.image };
    }
  })],
  callbacks: {
    jwt({ token, user }) { if (user?.id) token.userId = user.id; return token; },
    async session({ session, token }) { if (session.user) { const userId = String(token.userId ?? token.sub); const current = await db.user.findUnique({ where: { id: userId }, select: { status: true, deletedAt: true } }); session.user.id = current?.status === "ACTIVE" && !current.deletedAt ? userId : ""; } return session; },
    authorized({ auth: session, request }) {
      const protectedPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/family");
      return !protectedPath || Boolean(session?.user);
    }
  }
});
