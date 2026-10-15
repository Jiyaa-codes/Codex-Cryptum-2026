import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import "./env.js";
import { getDb, closeDb } from "../src/index.js";
import { reconcileOrganizerMigration } from "./reconcile-organizer-migration.js";

try {
  const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
  await reconcileOrganizerMigration(getDb(), migrationsFolder);
  await migrate(getDb(), { migrationsFolder });
  console.log("Database migrations applied.");
} finally {
  await closeDb();
}
