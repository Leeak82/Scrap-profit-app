# Deploy the Non-eBay Live Compare Backend

The GitHub Pages app can display the interface, but live price comparison needs a backend because API keys must stay private. This backend provides `/api/compare` using non-eBay providers.

## What live compare can use

Add one or more providers:

- **Brave Search API**: broad current web results from marketplaces, shops, Craigslist/OfferUp pages, and snippets.
- **SerpApi Google Shopping**: stronger shopping/product result cards and cleaner price extraction.
- **Google Custom Search JSON API**: programmable web/image search using your Google API key and search engine ID.

The backend combines provider results, extracts visible prices when possible, and returns low/median/high estimates. Always verify valuable or rare items before listing.

## Step 1: Choose provider keys

Recommended order:

1. Brave Search API first for broad web coverage.
2. SerpApi if you want stronger Google Shopping style pricing.
3. Google Custom Search if you already use Google Cloud.

## Step 2: Deploy to Render

1. Go to Render.com.
2. New → Web Service.
3. Connect this GitHub repo: `Leeak82/Scrap-profit-app`.
4. Runtime: Node.
5. Build command:

```bash
npm install
```

6. Start command:

```bash
npm start
```

7. Add environment variables for whichever provider you use:

```bash
BRAVE_API_KEY=your_brave_search_api_key
SERPAPI_KEY=your_serpapi_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_google_programmable_search_engine_id
ALLOWED_ORIGIN=https://leeak82.github.io
```

You only need one provider key to start.

8. Deploy.

## Step 3: Connect the app

1. Open the GitHub Pages app.
2. Paste the Render URL into Backend API URL.
3. Example:

```text
https://your-value-scanner-api.onrender.com
```

4. Tap Save API URL.
5. Enter an item name.
6. Tap Live Compare Current Listings.

## Test endpoints

Health check:

```text
https://your-backend-url/health
```

Compare:

```text
https://your-backend-url/api/compare?q=vintage%20coleman%20lantern&limit=20
```

## Reality check

This version does **not** use eBay. It compares live/current non-eBay web and shopping results after the item name is known. Photo-based item identification still needs a separate image-recognition API in a future backend upgrade.
