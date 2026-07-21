import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { fetchGameInfo } from './gameInfo';

type XmlLink = { type: string; id: string | number; value: string };
type XmlStats = {
  minplayers?: string;
  maxplayers?: string;
  minplaytime?: string;
  maxplaytime?: string;
};
type XmlRatings = {
  average?: string;
  bayesaverage?: string;
  averageweight?: string;
};

function createThingXml({
  image,
  links = [],
  stats = {},
  ratings,
}: { image?: string; links?: XmlLink[]; stats?: XmlStats; ratings?: XmlRatings } = {}) {
  const linkLines = links
    .map((l) => `    <link type="${l.type}" id="${l.id}" value="${l.value}" />`)
    .join('\n');
  const statLines = (['minplayers', 'maxplayers', 'minplaytime', 'maxplaytime'] as const)
    .filter((k) => stats[k] !== undefined)
    .map((k) => `    <${k} value="${stats[k]}" />`)
    .join('\n');
  const imageLine = image === undefined ? '' : `    <image>${image}</image>`;
  const statisticsBlock = ratings
    ? `    <statistics page="1">
      <ratings >
        ${ratings.average !== undefined ? `<average value="${ratings.average}" />` : ''}
        ${ratings.bayesaverage !== undefined ? `<bayesaverage value="${ratings.bayesaverage}" />` : ''}
        <ranks>
          <rank type="subtype" id="1" name="boardgame" friendlyname="Board Game Rank" value="9" bayesaverage="${ratings.bayesaverage ?? ''}" />
        </ranks>
        ${ratings.averageweight !== undefined ? `<averageweight value="${ratings.averageweight}" />` : ''}
      </ratings>
    </statistics>`
    : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="42">
${imageLine}
${statLines}
${linkLines}
${statisticsBlock}
  </item>
</items>`;
}

describe('fetchGameInfo', () => {
  const originalToken = process.env.BGG_API_TOKEN;

  beforeEach(() => {
    process.env.BGG_API_TOKEN = 'test-token';
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.BGG_API_TOKEN;
    } else {
      process.env.BGG_API_TOKEN = originalToken;
    }
  });

  test('calls the BGG XML API with the bearer token and parses credits and stats', async () => {
    let requestedUrl = '';
    let requestedAuth: string | null = null;

    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async (input, init) => {
        requestedUrl = input;
        requestedAuth = new Headers(init?.headers).get('Authorization');
        return new Response(
          createThingXml({
            image: 'https://cf.geekdo-images.com/abc/ra.png',
            stats: { minplayers: '2', maxplayers: '4', minplaytime: '45', maxplaytime: '90' },
            links: [
              { type: 'boardgamepublisher', id: 395, value: 'Asmodee' },
              { type: 'boardgamepublisher', id: 21608, value: 'Capstone Games' },
              { type: 'boardgamedesigner', id: 2, value: 'Reiner Knizia' },
              { type: 'boardgameartist', id: 100, value: "Ian O'Toole" },
              { type: 'boardgamecategory', id: 1023, value: 'Bluffing' },
              { type: 'boardgamemechanic', id: 2040, value: 'Hand Management' },
            ],
          }),
          { status: 200 },
        );
      },
    });

    expect(requestedUrl).toBe('https://boardgamegeek.com/xmlapi2/thing?id=42&stats=1');
    expect(requestedAuth).toBe('Bearer test-token');
    expect(result.credits).toEqual({
      publishers: [
        { bggId: 395, description: null, name: 'Asmodee' },
        { bggId: 21608, description: null, name: 'Capstone Games' },
      ],
      designers: [{ bggId: 2, description: null, name: 'Reiner Knizia' }],
      artists: [{ bggId: 100, description: null, name: "Ian O'Toole" }],
      categories: [{ bggId: 1023, description: null, name: 'Bluffing' }],
      mechanics: [{ bggId: 2040, description: null, name: 'Hand Management' }],
    });
    expect(result.imageUrl).toBe('https://cf.geekdo-images.com/abc/ra.png');
    expect(result.stats).toEqual({
      minPlayers: 2,
      maxPlayers: 4,
      minPlaytime: 45,
      maxPlaytime: 90,
      rating: null,
      adjusted_rating: null,
      weight: null,
    });
  });

  test('decodes XML entities in the image URL', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(createThingXml({ image: 'https://example.com/pic.png?a=1&amp;b=2' }), {
          status: 200,
        }),
    });

    expect(result.imageUrl).toBe('https://example.com/pic.png?a=1&b=2');
  });

  test('returns a null image URL when the XML omits or empties the image tag', async () => {
    const missing = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () => new Response(createThingXml(), { status: 200 }),
    });
    expect(missing.imageUrl).toBeNull();

    const empty = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () => new Response(createThingXml({ image: '   ' }), { status: 200 }),
    });
    expect(empty.imageUrl).toBeNull();
  });

  test('dedupes duplicate link ids and ignores unrelated link types', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createThingXml({
            links: [
              { type: 'boardgamemechanic', id: 2040, value: 'Hand Management' },
              { type: 'boardgamemechanic', id: 2040, value: 'Hand Management' },
              { type: 'boardgamefamily', id: 99, value: 'Should be ignored' },
              { type: 'boardgameexpansion', id: 555, value: 'Also ignored' },
            ],
          }),
          { status: 200 },
        ),
    });

    expect(result.credits.mechanics).toEqual([
      { bggId: 2040, description: null, name: 'Hand Management' },
    ]);
    expect(result.credits.publishers).toEqual([]);
    expect(result.credits.designers).toEqual([]);
    expect(result.credits.artists).toEqual([]);
    expect(result.credits.categories).toEqual([]);
  });

  test('decodes XML entities in link names', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createThingXml({
            links: [
              { type: 'boardgamepublisher', id: 1, value: 'Tom &amp; Jerry' },
              { type: 'boardgamedesigner', id: 2, value: 'Architectes du Royaume de l&#039;Ouest' },
            ],
          }),
          { status: 200 },
        ),
    });

    expect(result.credits.publishers).toEqual([
      { bggId: 1, description: null, name: 'Tom & Jerry' },
    ]);
    expect(result.credits.designers).toEqual([
      { bggId: 2, description: null, name: "Architectes du Royaume de l'Ouest" },
    ]);
  });

  test('treats missing, empty, or zero stat values as null', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createThingXml({ stats: { minplayers: '', maxplayers: '0', minplaytime: '45' } }),
          { status: 200 },
        ),
    });

    expect(result.stats).toEqual({
      minPlayers: null,
      maxPlayers: null,
      minPlaytime: 45,
      maxPlaytime: null,
      rating: null,
      adjusted_rating: null,
      weight: null,
    });
  });

  test('parses rating, adjusted_rating, and weight from the ratings block', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createThingXml({
            ratings: { average: '7.70626', bayesaverage: '7.5111', averageweight: '2.7633' },
          }),
          { status: 200 },
        ),
    });

    expect(result.stats.rating).toBeCloseTo(7.70626);
    expect(result.stats.adjusted_rating).toBeCloseTo(7.5111);
    expect(result.stats.weight).toBeCloseTo(2.7633);
  });

  test('returns null for rating fields when the ratings block is absent', async () => {
    const result = await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () => new Response(createThingXml(), { status: 200 }),
    });

    expect(result.stats.rating).toBeNull();
    expect(result.stats.adjusted_rating).toBeNull();
    expect(result.stats.weight).toBeNull();
  });

  test('throws a not found error when BGG returns 404', async () => {
    await expect(
      fetchGameInfo({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response('missing', { status: 404 }),
      }),
    ).rejects.toThrow('Game not found on BGG');
  });

  test('throws a fetch error when BGG returns another non-ok status', async () => {
    await expect(
      fetchGameInfo({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response('broken', { status: 503 }),
      }),
    ).rejects.toThrow('Failed to fetch BGG page');
  });

  test('throws when the XML response does not contain an item', async () => {
    await expect(
      fetchGameInfo({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () =>
          new Response('<?xml version="1.0" encoding="utf-8"?><items termsofuse="x"/>', {
            status: 200,
          }),
      }),
    ).rejects.toThrow("XML data doesn't contain an item.");
  });

  test('sends an empty bearer token when BGG_API_TOKEN is unset', async () => {
    delete process.env.BGG_API_TOKEN;
    let requestedAuth: string | null = null;

    await fetchGameInfo({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async (_input, init) => {
        requestedAuth = new Headers(init?.headers).get('Authorization');
        return new Response(createThingXml(), { status: 200 });
      },
    });

    expect(requestedAuth).toBe('Bearer');
  });
});
