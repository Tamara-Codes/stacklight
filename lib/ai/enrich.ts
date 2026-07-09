// Fetch the full page behind an entry so the rater judges the real content,
// not a one-line feed teaser. Uses Firecrawl (the approved exception to the
// no-scraping rule — it handles JS rendering and bot walls for us).
//
// Server/background only. Degrades gracefully: no FIRECRAWL_API_KEY or any
// fetch failure just returns null and the rater falls back to the snippet —
// enrichment must never block rating.

const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";
// Plenty for a changelog post; keeps the Gemini prompt bounded.
const MAX_CHARS = 6000;

export async function fetchPageContent(url: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: { markdown?: string } };
    const markdown = json.data?.markdown?.trim();
    if (!markdown) return null;
    return markdown.slice(0, MAX_CHARS);
  } catch {
    return null;
  }
}
