import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { sql } from "drizzle-orm";
import type { Database } from "../src/client.js";

// The pre-merge organizer migration had index 0003 and a timestamp after the
// upstream team migrations. Drizzle's timestamp cursor would skip those team
// migrations on an existing local database. Preserve its record and apply only
// the missing upstream migrations before invoking the normal migrator.
const LEGACY_ORGANIZER_HASH = "471171fb21013dba4874e142f6c585bd3ceab6034b2d2a497b43d9274c915117";

export async function reconcileOrganizerMigration(db: Database, migrationsFolder: string): Promise<void> {
  const [state] = await db.execute(sql`select to_regclass('drizzle.__drizzle_migrations') as ledger`);
  if (!state?.ledger) return;
  const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const teamTimestamps = new Set(journal.entries.filter(entry => /^000[3-6]_/.test(entry.tag)).map(entry => entry.when));
  const migrations = readMigrationFiles({ migrationsFolder }).filter(migration => teamTimestamps.has(migration.folderMillis));
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('cryptum:legacy-organizer-migration', 0))`);
    const applied = await tx.execute(sql`select hash from drizzle.__drizzle_migrations`);
    const hashes = new Set(applied.map(row => String(row.hash)));
    if (!hashes.has(LEGACY_ORGANIZER_HASH)) return;
    for (const migration of migrations) {
      if (hashes.has(migration.hash)) continue;
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      await tx.execute(sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`);
    }
  });
}
