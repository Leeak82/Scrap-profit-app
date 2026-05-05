# Deploy the Live Compare Backend

The GitHub Pages app can display the interface, but it cannot safely call eBay directly from the browser because API credentials must stay private. This backend provides `/api/compare` for live current eBay listing comparisons.

## What live compare currently uses

- eBay Browse API current active listings
- Median, low, high, and average price math
- Up to 50 current listings per search

Important: eBay Browse API gives current active listings. Sold/completed prices require a different approved data source or manual verification.

## Step 1: Get eBay API credentials

1. Create/login to an eBay Developer account.
2. Create an application.
3. Copy the Production Client ID and Client Secret.

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

7. Add environment variables:

```bash
EBAY_ENV=production
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
ALLOWED_ORIGIN=https://leeak82.github.io
```

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

This is not magic image recognition yet. It is live market comparison after the item name is known. A future version can add image recognition using Google Vision, OpenAI Vision, or another image classification API, but that requires a paid/credentialed backend as well.
