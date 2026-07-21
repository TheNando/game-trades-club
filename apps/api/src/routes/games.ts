import { BunRequest } from 'bun';
import { searchGamesByName } from '../db/gamesTable';
import { RouteDependencies } from '../middleware/dependencies';
import { json } from '../utils/http';

/** Searches catalog games by name. */
export async function getGames(_: BunRequest<'/api/games'>, { url }: RouteDependencies) {
  const query = url.searchParams.get('q') ?? '';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 25;

  const items = searchGamesByName(query, Number.isNaN(limit) ? 25 : limit);
  return json({ items });
}
