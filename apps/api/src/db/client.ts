import { Database } from 'bun:sqlite';
import { mkdir } from "node:fs/promises";
import { dirname } from 'node:path';
import schema from "./schema.sql" with { type: "file" };

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
await mkdir(dirname(databasePath), { recursive: true });

const schemaSql = await Bun.file(schema).text();

const db = new Database(databasePath, { create: true, strict: true });
db.run(schemaSql);

// Reconcile additive columns on pre-existing dev databases without dropping data.
// schema.sql remains the source of truth; this stays minimal until a real
// migration system lands (see TASKS.md).
function addColumnIfMissing(table: string, column: string, definition: string) {
  const existing = db
    .query<{ name: string; }, []>(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
  if (!existing.includes(column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('games', 'min_players', 'INTEGER');
addColumnIfMissing('games', 'max_players', 'INTEGER');
addColumnIfMissing('games', 'min_playtime', 'INTEGER');
addColumnIfMissing('games', 'max_playtime', 'INTEGER');

export { db };
