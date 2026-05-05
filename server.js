import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const EBAY_ENV = process.env.EBAY_ENV || 'production';
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || '';
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const EBAY_BASE = EBAY_ENV === 'sandbox'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

let tokenCache = { token: '', expiresAt: 0 };

app.use(cors({ origin: ALLOWED_ORIGIN === '*' ? true : ALLOWED_ORIGIN }));
app.use(express.json());
app.use(express.static('.'));

function cleanPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

async function getEbayToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
    throw new Error('Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${EBAY_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope'
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'eBay auth failed');
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 7200) - 120) * 1000
  };
  return tokenCache.token;
}

async function searchEbay(query, limit = 20) {
  const token = await getEbayToken();
  const url = new URL(`${EBAY_BASE}/buy/browse/v1/item_summary/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(Math.min(Math.max(Number(limit) || 20, 1), 50)));
  url.searchParams.set('sort', 'price');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'eBay search failed');

  return (data.itemSummaries || []).map(item => ({
    source: 'eBay Browse API - current active listing',
    title: item.title || 'Untitled listing',
    price: cleanPrice(item.price?.value),
    currency: item.price?.currency || 'USD',
    condition: item.condition || '',
    url: item.itemWebUrl || '',
    image: item.image?.imageUrl || ''
  })).filter(item => item.price > 0);
}

app.get('/health', (req, res) => {
  res.json({ ok: true, env: EBAY_ENV, hasEbayCredentials: Boolean(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET) });
});

app.get('/api/compare', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Number(req.query.limit || 20);
    if (!q) return res.status(400).json({ ok: false, error: 'Missing q query parameter' });
    const items = await searchEbay(q, limit);
    res.json({ ok: true, query: q, items, priceStats: priceStats(items), note: 'These are current active listings, not guaranteed sold prices.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Value Scanner API running on port ${PORT}`);
});
