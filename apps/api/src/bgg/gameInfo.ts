import type { GameCreditRecord, GameInfo } from '../db/gameInfoTable';
import type { GameStats } from '../db/gamesTable';
import type { GeekData, Item, ItemLink } from '../types/bgg';

export type GamePageData = {
  credits: GameInfo;
  imageUrl: string | null;
  stats: GameStats;
};

const artistId = 'boardgameartist';
const categoryId = 'boardgamecategory';
const designersIds = 'boardgamedesigner';
const mechanicsId = 'boardgamemechanic';
const publishersId = 'boardgamepublisher';

type FetchGameInfoOptions = {
  fetchFn?: (input: string, init?: RequestInit) => Promise<Response>;
  gameId: number;
  gameName: string;
};

function parsePositiveIntField(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseFloatField(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

const xmlNamedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (_, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return xmlNamedEntities[entity] ?? `&${entity};`;
  });
}

function extractTagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}\\s+value="([^"]*)"\\s*/?>`));
  return match ? match[1] : null;
}

function extractTagText(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) return null;
  const value = decodeXmlEntities(match[1]).trim();
  return value === '' ? null : value;
}

function getCreditRecordsFromXmlLinks(xml: string, type: string): GameCreditRecord[] {
  const pattern = new RegExp(
    `<link\\s+type="${type}"\\s+id="(\\d+)"\\s+value="([^"]*)"\\s*/?>`,
    'g'
  );
  const records = new Map<number, GameCreditRecord>();
  for (const match of xml.matchAll(pattern)) {
    const bggId = parseInt(match[1], 10);
    if (!records.has(bggId)) {
      records.set(bggId, {
        bggId,
        description: null,
        name: decodeXmlEntities(match[2]),
      });
    }
  }
  return [...records.values()];
}

export async function fetchGameInfo({
  fetchFn = fetch,
  gameId,
}: FetchGameInfoOptions): Promise<GamePageData> {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;

  const response = await fetchFn(url, {
    headers: {
      Authorization: process.env.BGG_API_TOKEN ? `Bearer ${process.env.BGG_API_TOKEN}` : 'Bearer',
    },
  });

  if (response.status === 404) {
    throw new Error('Game not found on BGG');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch BGG page');
  }

  const xml = await response.text();
  const itemMatch = xml.match(/<item\b[^>]*>([\s\S]*?)<\/item>/);

  if (!itemMatch) {
    throw new Error("XML data doesn't contain an item.");
  }

  const itemXml = itemMatch[1];

  const ratingsMatch = itemXml.match(/<ratings\b[^>]*>([\s\S]*?)<\/ratings>/);
  const ratingsXml = ratingsMatch ? ratingsMatch[1] : '';

  return {
    credits: {
      artists: getCreditRecordsFromXmlLinks(itemXml, artistId),
      categories: getCreditRecordsFromXmlLinks(itemXml, categoryId),
      designers: getCreditRecordsFromXmlLinks(itemXml, designersIds),
      mechanics: getCreditRecordsFromXmlLinks(itemXml, mechanicsId),
      publishers: getCreditRecordsFromXmlLinks(itemXml, publishersId),
    },
    imageUrl: extractTagText(itemXml, 'image'),
    stats: {
      minPlayers: parsePositiveIntField(extractTagValue(itemXml, 'minplayers')),
      maxPlayers: parsePositiveIntField(extractTagValue(itemXml, 'maxplayers')),
      minPlaytime: parsePositiveIntField(extractTagValue(itemXml, 'minplaytime')),
      maxPlaytime: parsePositiveIntField(extractTagValue(itemXml, 'maxplaytime')),
      rating: parseFloatField(extractTagValue(ratingsXml, 'average')),
      adjusted_rating: parseFloatField(extractTagValue(ratingsXml, 'bayesaverage')),
      weight: parseFloatField(extractTagValue(ratingsXml, 'averageweight')),
    },
  };
}
