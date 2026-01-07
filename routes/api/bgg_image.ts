import { DOMParser } from "linkedom";

const CACHE = new Map<string, string>();

export const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const cachedUrl = CACHE.get(id);
  if (cachedUrl) {
    return new Response(JSON.stringify({ url: cachedUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const bggUrl = `https://boardgamegeek.com/boardgame/${id}`;
    const response = await fetch(bggUrl);

    if (!response.ok) {
      return new Response(`Failed to fetch BGG page: ${response.status}`, { status: 502 });
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    if (!doc) {
      return new Response("Failed to parse HTML", { status: 500 });
    }

    const preloadLink = doc.querySelector("link[rel='preload'][as='image'][href*='itemrep']");
    let imgSrc = preloadLink?.getAttribute("href");

    if (!imgSrc) {
      const meta = doc.querySelector("meta[property='og:image']");
      imgSrc = meta?.getAttribute("content");
    }

    if (!imgSrc) {
      return new Response("Image not found", { status: 404 });
    }

    CACHE.set(id, imgSrc);

    return new Response(JSON.stringify({ url: imgSrc }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error scraping BGG:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
