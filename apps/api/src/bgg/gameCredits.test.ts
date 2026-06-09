import { describe, expect, test } from 'bun:test';
import { fetchGameCredits } from './gameCredits';

function createCreditsHtml(links: Record<string, Array<{ objectid: string; name: string; }>>) {
  return `
    <html>
      <body>
        <script>
          GEEK.geekitemPreload = ${JSON.stringify({
    item: { links },
  })};
	
        </script>
      </body>
    </html>
  `;
}

function createGeekPreloadHtml(geekData: unknown) {
  return `
    <html>
      <body>
        <script>
          GEEK.geekitemPreload = ${JSON.stringify(geekData)};
	
        </script>
      </body>
    </html>
  `;
}

describe('fetchGameCredits', () => {
  test('extracts credits from geek preload data and dedupes duplicate links', async () => {
    let requestedUrl = '';
    const result = await fetchGameCredits({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async (input) => {
        requestedUrl = input;

        return new Response(
          createCreditsHtml({
            boardgamepublisher: [
              { objectid: '395', name: 'Asmodee' },
              { objectid: '21608', name: 'Capstone Games' },
            ],
            boardgamedesigner: [
              { objectid: '2', name: 'Reiner Knizia' },
            ],
            boardgamesolodesigner: [
              { objectid: '2', name: 'Reiner Knizia' },
              { objectid: '5000', name: 'Ricky Royal' },
            ],
            boardgameartist: [
              { objectid: '100', name: "Ian O'Toole" },
            ],
            boardgamecategory: [
              { objectid: '1023', name: 'Bluffing' },
            ],
            boardgamemechanic: [
              { objectid: '2040', name: 'Hand Management' },
              { objectid: '2040', name: 'Hand Management' },
            ],
          }),
          { status: 200 }
        );
      },
    });

    expect(requestedUrl).toBe('https://boardgamegeek.com/boardgame/42/name/credits');
    expect(result.credits).toEqual({
      publishers: [
        { bggId: 395, description: null, name: 'Asmodee' },
        { bggId: 21608, description: null, name: 'Capstone Games' },
      ],
      designers: [
        { bggId: 2, description: null, name: 'Reiner Knizia' },
        { bggId: 5000, description: null, name: 'Ricky Royal' },
      ],
      artists: [
        { bggId: 100, description: null, name: "Ian O'Toole" },
      ],
      categories: [
        { bggId: 1023, description: null, name: 'Bluffing' },
      ],
      mechanics: [
        { bggId: 2040, description: null, name: 'Hand Management' },
      ],
    });
    expect(result.stats).toEqual({
      minPlayers: null,
      maxPlayers: null,
      minPlaytime: null,
      maxPlaytime: null,
    });
  });

  const emptyLinks = {
    boardgamepublisher: [],
    boardgamedesigner: [],
    boardgamesolodesigner: [],
    boardgameartist: [],
    boardgamecategory: [],
    boardgamemechanic: [],
  };

  test('parses player and playtime stats from the geek preload data', async () => {
    const result = await fetchGameCredits({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createGeekPreloadHtml({
            item: {
              links: emptyLinks,
              minplayers: '2',
              maxplayers: '4',
              minplaytime: '45',
              maxplaytime: '90',
            },
          }),
          { status: 200 }
        ),
    });

    expect(result.stats).toEqual({
      minPlayers: 2,
      maxPlayers: 4,
      minPlaytime: 45,
      maxPlaytime: 90,
    });
  });

  test('treats empty or zero stat values as null', async () => {
    const result = await fetchGameCredits({
      gameId: 42,
      gameName: 'Ra',
      fetchFn: async () =>
        new Response(
          createGeekPreloadHtml({
            item: {
              links: emptyLinks,
              minplayers: '',
              maxplayers: '0',
              minplaytime: '45',
              maxplaytime: '',
            },
          }),
          { status: 200 }
        ),
    });

    expect(result.stats).toEqual({
      minPlayers: null,
      maxPlayers: null,
      minPlaytime: 45,
      maxPlaytime: null,
    });
  });

  test('throws a not found error when BGG returns 404', async () => {
    await expect(
      fetchGameCredits({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response('missing', { status: 404 }),
      })
    ).rejects.toThrow('Game not found on BGG');
  });

  test('throws a fetch error when BGG returns another non-ok status', async () => {
    await expect(
      fetchGameCredits({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response('broken', { status: 503 }),
      })
    ).rejects.toThrow('Failed to fetch BGG page');
  });

  test('throws when geek preload data cannot be parsed', async () => {
    await expect(
      fetchGameCredits({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response('<html><body>no preload here</body></html>', {
          status: 200,
        }),
      })
    ).rejects.toThrow("Can't parse geek data");
  });

  test('throws when geek preload data does not include item links', async () => {
    await expect(
      fetchGameCredits({
        gameId: 42,
        gameName: 'Ra',
        fetchFn: async () => new Response(createGeekPreloadHtml({ item: {} }), { status: 200 }),
      })
    ).rejects.toThrow("Geek data doesn't contain links.");
  });
});
