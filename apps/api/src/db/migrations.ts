import type { Database } from 'bun:sqlite';

type ColumnRow = { name: string; };

function tableColumns(database: Database, table: string): Set<string> {
  const rows = database.query<ColumnRow, []>(`PRAGMA table_info(${table})`).all();
  return new Set(rows.map((row) => row.name));
}

function addColumnIfMissing(
  database: Database,
  table: string,
  column: string,
  definition: string
) {
  const columns = tableColumns(database, table);
  if (columns.has(column)) return;
  database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function runMigrations(database: Database) {
  addColumnIfMissing(database, 'listing_images', 'thumb_stored_filename', 'TEXT');
  addColumnIfMissing(database, 'listing_images', 'width', 'INTEGER');
  addColumnIfMissing(database, 'listing_images', 'height', 'INTEGER');
}
