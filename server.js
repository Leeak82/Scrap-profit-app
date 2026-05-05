import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_CX = process.env.GOOGLE_CX || '';

app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static('.'));

function cleanPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = String(value || '').replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : 0;
}

function extractPrice(text) {
  const s = String(text || '').replace(/,/g, '');
  const matches = [...s.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)].map(m => Number(m[1])).filter(n => n > 0 && n < 50000);
  return matches[0] || 0;
}

function median(numbers) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function priceStats(items) {
  const prices = items.map(x => cleanPrice(x.price)).filter(x => x > 0).sort((a, b) => a - b);
  if (!prices.length) return { low: 0, median: 0, high: 0, average: 0 };
  return {
    low: prices[0],
    median: median(prices),
    high: prices[prices.length - 1],
    average: prices.reduce((a, b) => a + b, 0) / prices.length
  };
}

function normalize(items, source) {
  return items.map(item => ({
    source: item.source || source,
    title: item.title || 'Untitled result',
    price: cleanPrice(item.price),
    currency: item.currency || 'USD',
    condition: item.condition || '',
    url: item.url || '',
    image: item.image || '',
    snippet: item.snippet || ''
  })).filter(item => item.title && item.url);
}

async function searchSerpApi(query, limit = 20) {
  if (!SERPAPI_KEY) return [];
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', query);
  url.searchParams.set('gl', 'us');
  url.searchParams.set('hl', 'en');
  url.searchParams.set('num', String(Math.min(Math.max(Number(limit) || 20, 1), 60)));
  url.searchParams.set('api_key', SERPAPI_KEY);

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'SerpApi Google Shopping search failed');

  return normalize((data.shopping_results || []).map(item => ({
    source: 'Google Shopping via SerpApi',
    title: item.title,
    price: item.extracted_price || item.price,
    url: item.link || item.product_link || item.serpapi_product_api,
    image: item.thumbnail,
    condition: item.source || '',
    snippet: item.snippet || item.source || ''
  })), 'Google Shopping via SerpApi');
}

async function searchBrave(query, limit = 20) {
  if (!BRAVE_API_KEY) return [];
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', `${query} price for sale marketplace offerup craigslist facebook`);
  url.searchParams.set('count', String(Math.min(Math.max(Number(limit) || 20, 1), 20)));
  url.searchParams.set('country', 'US');
  url.searchParams.set('search_lang', 'en');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Brave Search failed');

  return normalize((data.web?.results || []).map(item => ({
    source: 'Brave Web Search',
    title: item.title,
    price: extractPrice(`${item.title} ${item.description}`),
    url: item.url,
    image: '',
    snippet: item.description || ''
  })), 'Brave Web Search');
}

async function searchGoogleCustom(query, limit = 10) {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.set('cx', GOOGLE_CX);
  url.searchParams.set('q', `${query} price for sale marketplace offerup craigslist`);
  url.searchParams.set('num', String(Math.min(Math.max(Number(limit) || 10, 1), 10)));

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Google Custom Search failed');

  return normalize((data.items || []).map(item => ({
    source: 'Google Custom Search',
    title: item.title,
    price: extractPrice(`${item.title} ${item.snippet}`),
    url: item.link,
    image: item.pagemap?.cse_thumbnail?.[0]?.src || '',
    snippet: item.snippet || ''
  })), 'Google Custom Search');
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    providers: {
      serpapi: Boolean(SERPAPI_KEY),
      brave: Boolean(BRAVE_API_KEY),
      googleCustomSearch: Boolean(GOOGLE_API_KEY && GOOGLE_CX)
    }
  });
});

app.get('/api/compare', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Number(req.query.limit || 20);
    if (!q) return res.status(400).json({ ok: false, error: 'Missing q query parameter' });

    const providers = String(req.query.providers || 'serpapi,brave,google').split(',').map(x => x.trim().toLowerCase());
    const tasks = [];
    if (providers.includes('serpapi')) tasks.push(searchSerpApi(q, limit));
    if (providers.includes('brave')) tasks.push(searchBrave(q, limit));
    if (providers.includes('google')) tasks.push(searchGoogleCustom(q, Math.min(limit, 10)));

    const settled = await Promise.allSettled(tasks);
    const items = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    const errors = settled.filter(result => result.status === 'rejected').map(result => result.reason.message);

    if (!items.length && errors.length) throw new Error(errors.join(' | '));
    if (!items.length) throw new Error('No search provider keys are configured. Add BRAVE_API_KEY, SERPAPI_KEY, or GOOGLE_API_KEY + GOOGLE_CX.');

    res.json({
      ok: true,
      query: q,
      items: items.slice(0, 50),
      priceStats: priceStats(items),
      errors,
      note: 'Live results come from non-eBay search providers. Prices extracted from shopping APIs/snippets should be verified before listing.'
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Value Scanner non-eBay API running on port ${PORT}`);
});
