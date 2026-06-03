import { Database } from 'bun:sqlite';
import { mkdir } from "node:fs/promises";
import { dirname } from 'node:path';
import schema from "./schema.sql" with { type: "file" };
import { runMigrations } from './migrations';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
await mkdir(dirname(databasePath), { recursive: true });

const schemaSql = await Bun.file(schema).text();

const db = new Database(databasePath, { create: true, strict: true });
db.run(schemaSql);
runMigrations(db);

export { db };
