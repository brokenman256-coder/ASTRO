import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "./env";

export interface UserTokenPayload {
  sub: string;
  email: string;
  role: "user";
}

export interface AdminTokenPayload {
  sub: string;
  username: string;
  role: "admin";
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.jwtUserSecret, { expiresIn: "7d" });
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtAdminSecret, { expiresIn: "12h" });
}

export function verifyUserToken(token: string): UserTokenPayload {
  return jwt.verify(token, env.jwtUserSecret) as UserTokenPayload;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtAdminSecret) as AdminTokenPayload;
}
