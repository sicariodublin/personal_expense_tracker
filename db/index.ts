import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1DatabaseBinding = Parameters<typeof drizzle>[0];
type CloudflareWorkersModule = { env?: { DB?: D1DatabaseBinding } };

const dynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as (specifier: string) => Promise<CloudflareWorkersModule>;

export async function getDb() {
  const { env } = await dynamicImport("cloudflare:workers");
  if (!env?.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Local development uses data/transactions.json through the transaction store."
    );
  }

  return drizzle(env.DB, { schema });
}
