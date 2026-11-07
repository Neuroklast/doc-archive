import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const user = await getViewer();
  redirect(user ? "/archive" : "/login");
}
