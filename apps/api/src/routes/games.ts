import { BunRequest } from 'bun';
import { gameSearchQuerySchema } from '@game-trades-club/shared/validation';
import { searchGamesByName } from '../db/gamesTable';
import { RouteDependencies } from '../middleware/dependencies';
import { json, validationError } from '../utils/http';

/** Searches catalog games by name. */
export async function getGames(_: BunRequest<'/api/games'>, { url }: RouteDependencies) {
  const parsed = gameSearchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return validationError(parsed.error);

  const items = searchGamesByName(parsed.data.q, parsed.data.limit ?? 25);
  return json({ items });
}
