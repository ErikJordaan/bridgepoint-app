import { config } from "dotenv";
config({ path: ".env.local" });

// Using a dynamic import here (rather than a static one at the top of the
// file) is deliberate: static imports are resolved before any other code in
// the file runs, regardless of where they're written - which would mean
// db/index.ts tries to read DATABASE_URL before the config() call above has
// actually populated it. A dynamic import runs exactly where it's written.
async function main() {
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { db } = await import("./index");

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
