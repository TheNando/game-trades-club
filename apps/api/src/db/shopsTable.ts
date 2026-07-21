import type { Database } from 'bun:sqlite';

/** Represents a physical game shop pickup location. */
export type Shop = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

type CreateShopInput = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type UpdateShopInput = {
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

const shopColumns =
  'id, name, city, state, zip, address, website_url, latitude, longitude, created_at, updated_at';

/** Creates database operations for game shops. */
export function createShopsStore(database: Database) {
  const listAllStmt = database.query<Shop, []>(
    `SELECT ${shopColumns}
     FROM shops
     ORDER BY city ASC, name ASC`,
  );

  const findStmt = database.query<Shop, [string]>(
    `SELECT ${shopColumns}
     FROM shops
     WHERE id = ?`,
  );

  const createStmt = database.query(
    `INSERT INTO shops (id, name, city, state, zip, address, website_url, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const updateStmt = database.query(
    `UPDATE shops
     SET name = ?, city = ?, state = ?, zip = ?, address = ?, website_url = ?, latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  );

  const deleteStmt = database.query(`DELETE FROM shops WHERE id = ?`);

  return {
    listAllShops(): Shop[] {
      return listAllStmt.all();
    },
    findShopById(id: string): Shop | null {
      return findStmt.get(id) ?? null;
    },
    createShop(input: CreateShopInput): Shop {
      createStmt.run(
        input.id,
        input.name,
        input.city,
        input.state,
        input.zip,
        input.address,
        input.website_url,
        input.latitude,
        input.longitude,
      );
      return findStmt.get(input.id)!;
    },
    updateShop(id: string, input: UpdateShopInput): Shop | null {
      const result = updateStmt.run(
        input.name,
        input.city,
        input.state,
        input.zip,
        input.address,
        input.website_url,
        input.latitude,
        input.longitude,
        id,
      );
      if (Number(result.changes) === 0) return null;
      return findStmt.get(id) ?? null;
    },
    removeShop(id: string): boolean {
      const result = deleteStmt.run(id);
      return Number(result.changes) > 0;
    },
  };
}
