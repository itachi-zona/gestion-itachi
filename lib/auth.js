import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "sm_session";
const SECRET = process.env.JWT_SECRET;

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Para usar dentro de Server Components / Route Handlers
export function getSessionFromCookies() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE_NAME;
