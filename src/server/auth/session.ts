import { headers } from "next/headers";
import { auth } from "./index";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getViewer() {
  return (await getSession())?.user ?? null;
}

export async function requireViewer() {
  const session = await getSession();
  if (!session) return null;
  return session;
}
