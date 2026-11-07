import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  const client = postgres(url, { max: 4, prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema });
}

let connection: ReturnType<typeof createDatabase> | undefined;

/** Server-side singleton. Never expose Postgres or any credentials to the browser. */
export function getDb(): ReturnType<typeof createDatabase> {
  connection ??= createDatabase();
  return connection;
}
