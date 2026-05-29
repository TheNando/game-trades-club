import type { GameCreditRecord, GameCredits } from '../db/gameCreditsTable';
import type { GeekData, ItemLink } from '../types/bgg';

const publishersId = 'boardgamepublisher';
const designersIds = [
  'boardgamedesigner',
  'boardgamesolodesigner',
] as const;
const artistId = 'boardgameartist';
const categoryId = 'boardgamecategory';
const mechanicsId = 'boardgamemechanic';

type FetchGameCreditsOptions = {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  gameId: number;
  gameName: string;
};

// function extractBggIdFromHref(href: string | null | undefined) {
//   if (!href) return null;

//   const match = href.match(/\/(\d+)(?:\/|$)/);
//   if (!match) return null;

//   const parsed = Number.parseInt(match[1], 10);
//   return Number.isInteger(parsed) ? parsed : null;
// }

// export function slugifyBggGameName(gameName: string) {
//   return gameName
//     .trim()
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-')
//     .replace(/^-+|-+$/g, '');
// }

function extractGeekData(html: string): GeekData {
  try {
    return JSON.parse(html.split("GEEK.geekitemPreload = ")[1].split(";\n\t")[0]) as GeekData;
  } catch (error) {
    throw new Error("Can't parse geek data");
  }
}

function getCreditRecordsFromLinks(links: ItemLink[]): GameCreditRecord[] {
  // Remove dupes
  return [...new Map(links.map(item => [item.objectid, item])).values()]
    .map((link) => ({
      bggId: parseInt(link.objectid, 10),
      description: null,
      name: link.name,
    })) as GameCreditRecord[];
}

export async function fetchGameCredits({
  fetchFn = fetch,
  gameId,
  gameName,
}: FetchGameCreditsOptions): Promise<GameCredits> {
  const url = `https://boardgamegeek.com/boardgame/${gameId}/name/credits`;

  const response = await fetchFn(url);

  if (response.status === 404) {
    throw new Error('Game not found on BGG');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch BGG page');
  }

  // Scrape credits page for links
  const html = await response.text();
  const { item } = extractGeekData(html);

  if (!item?.links) {
    throw new Error("Geek data doesn't contain links.");
  }

  return {
    artists: getCreditRecordsFromLinks(item.links[artistId]),
    categories: getCreditRecordsFromLinks(item.links[categoryId]),
    designers:
      getCreditRecordsFromLinks(designersIds.flatMap((id) => item.links[id])),
    mechanics: getCreditRecordsFromLinks(item.links[mechanicsId]),
    publishers: getCreditRecordsFromLinks(item.links[publishersId]),
  };
}

