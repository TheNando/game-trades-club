import { Database } from 'bun:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
mkdirSync(dirname(databasePath), { recursive: true });

const schemaSql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

const db = new Database(databasePath, { create: true, strict: true });
db.exec(schemaSql);

export { db };
