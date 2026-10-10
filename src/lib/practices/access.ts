import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "practice_access";

export function practiceAccessCode(): string {
  return process.env.PRACTICE_ACCESS_CODE?.trim() ?? "";
}

function signature(code: string): string {
  const secret = process.env.SESSION_SECRET || "practice-dev-secret";
  return createHmac("sha256", secret).update(code).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function hasPracticeAccess(): Promise<boolean> {
  const code = practiceAccessCode();
  if (!code) return true;
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, signature(code));
}

export async function grantPracticeAccess(code: string): Promise<boolean> {
  const expected = practiceAccessCode();
  if (!expected || !safeEqual(signature(code), signature(expected))) return false;
  const jar = await cookies();
  jar.set(COOKIE, signature(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return true;
}

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}
