# Storage Unit Value Scanner

A phone-friendly no-key resale assistant for storage unit finds. It helps you identify an item, check resale sources, estimate a fast-sale price, save inventory, and generate a marketplace listing.

## What it does

- Opens Google Lens and eBay image search for item identification.
- Builds research links for eBay sold, eBay active, Google Shopping, Facebook Marketplace, OfferUp, Amazon, WorthPoint search, part-number search, and local buyers.
- Calculates floor price, fair price, fast-sale price, and hold-out price from realistic comps.
- Saves inventory in browser local storage.
- Generates a copy-ready Marketplace/Craigslist style post.
- Includes optional scrap metal calculator.
- Works as a static web app and installable PWA.

## How to run in Termux

```bash
cd ~
pkg install git -y
git clone https://github.com/Leeak82/Scrap-profit-app.git
cd Scrap-profit-app
termux-open index.html
```

If Chrome does not open it correctly:

```bash
cp -r ~/Scrap-profit-app ~/storage/downloads/ValueScanner
termux-open ~/storage/downloads/ValueScanner/index.html
```

## How to use

1. Tap Google Lens or eBay Image Search.
2. Identify the item as close as possible.
3. Paste the item name into the app.
4. Use the research links to find real sold/active comps.
5. Enter low and high realistic comp prices.
6. Tap Analyze Value.
7. Save the item to inventory or copy the generated listing post.

## Pricing logic

The app does not pretend to know exact live prices without verification. It uses your low/high comp inputs, condition, and urgency to calculate a realistic resale range.

- Floor price: lowest safe quick-sale number.
- Fast-sale price: good listing price when you want it gone quickly.
- Fair price: normal reasonable resale price.
- Hold-out price: higher listing price when you can wait.

## Free-first design

This version avoids paid API lock-in. It uses smart research links instead of requiring keys. Later, optional API integrations can be added for automatic results.

Possible future add-ons:

- eBay Browse API
- Google Shopping data provider
- Barcode lookup API
- OCR for labels/model numbers
- Image classification API
- Export inventory to CSV

## Repo

https://github.com/Leeak82/Scrap-profit-app
