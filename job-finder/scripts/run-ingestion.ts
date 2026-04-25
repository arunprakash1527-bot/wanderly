/**
 * Run the ingestion pipeline once from the CLI.
 * Usage: npx tsx scripts/run-ingestion.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { runIngestion } from "../src/lib/ingestors";

async function main() {
  const summary = await runIngestion();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
