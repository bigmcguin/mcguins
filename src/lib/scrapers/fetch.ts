// Tiered HTML fetcher for the listings cron.
//
// The ladder is designed to spend as few ScrapingBee credits as possible while
// still getting past whatever protection a site has:
//
//   1. direct       — fetch from the Vercel function IP. Free. Often blocked
//                     by Cloudflare/Akamai on commercial sites, but worth a try.
//   2. sb-basic     — ScrapingBee, no JS rendering, datacenter proxy. 1 credit.
//   3. sb-js        — ScrapingBee with headless browser. 5 credits. Use when
//                     the page is a SPA.
//   4. sb-premium   — ScrapingBee with residential premium proxies + JS.
//                     25 credits. Last resort for hard-protected sites.
//
// fetchWithFallback walks the ladder until one tier returns a "real-looking"
// response (HTTP 200 AND body large enough to plausibly contain listings).

export type FetchTier = 'direct' | 'sb-basic' | 'sb-js' | 'sb-premium';

export type FetchResult = {
  html: string;
  tier: FetchTier;
  bytes: number;
  attempts: { tier: FetchTier; status: number; bytes: number; error?: string }[];
};

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const MIN_BYTES = 2000;
const FETCH_TIMEOUT_MS = 25_000;

async function fetchOne(url: string, tier: FetchTier): Promise<{ status: number; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    if (tier === 'direct') {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        signal: ctrl.signal,
        redirect: 'follow',
      });
      return { status: res.status, body: await res.text() };
    }

    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    if (!apiKey) {
      throw new Error('SCRAPINGBEE_API_KEY not set');
    }

    const params = new URLSearchParams({ api_key: apiKey, url });
    if (tier === 'sb-js' || tier === 'sb-premium') params.set('render_js', 'true');
    if (tier === 'sb-premium') params.set('premium_proxy', 'true');
    params.set('country_code', 'au');

    const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
      signal: ctrl.signal,
    });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithFallback(url: string): Promise<FetchResult> {
  const ladder: FetchTier[] = ['direct', 'sb-basic', 'sb-js', 'sb-premium'];
  const attempts: FetchResult['attempts'] = [];

  for (const tier of ladder) {
    try {
      const { status, body } = await fetchOne(url, tier);
      attempts.push({ tier, status, bytes: body.length });
      if (status >= 200 && status < 300 && body.length >= MIN_BYTES) {
        return { html: body, tier, bytes: body.length, attempts };
      }
    } catch (err) {
      attempts.push({
        tier,
        status: 0,
        bytes: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const reason = attempts.map((a) => `${a.tier}:${a.status}/${a.bytes}`).join(' → ');
  throw new Error(`fetchWithFallback exhausted all tiers for ${url} (${reason})`);
}
