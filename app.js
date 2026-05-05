const els = id => document.getElementById(id);
let currentItem = null;
let deferredPrompt = null;
let selectedPhotoName = '';

const scrapRanges = {
  copper: [2.8, 4.2],
  brass: [1.5, 2.5],
  aluminum: [0.3, 0.8],
  lead: [0.3, 0.7],
  steel: [0.03, 0.12]
};

const categoryTips = {
  general: ['Check current listings and sold-looking comps', 'Bundle low-value items', 'Clean before photos'],
  tools: ['Brand matters: Snap-on, Matco, Milwaukee, DeWalt, Makita', 'Sets sell better than singles', 'Show model numbers'],
  auto: ['Part number is king', 'Check fitment before pricing', 'Clean tags and cast numbers'],
  electronics: ['Test power-on', 'Include chargers/cables if available', 'Factory reset devices'],
  collectibles: ['Do not clean aggressively', 'Look for maker marks and dates', 'Check completed/sold comps manually too'],
  furniture: ['Measure everything', 'Stage photos well', 'Offer local pickup'],
  jewelry: ['Test metal before pricing', 'Look for stamps', 'Use macro photos'],
  scrap: ['Separate clean metals', 'Call local yards for current rate', 'Bulk steel only pays when heavy']
};

function money(n) {
  return `$${Number(n || 0).toFixed(0)}`;
}

function safeQuery() {
  return encodeURIComponent(els('itemName').value.trim() || 'storage unit find');
}

function saveApiBase() {
  const raw = els('apiBase').value.trim().replace(/\/$/, '');
  if (!raw) {
    alert('Paste your backend API URL first.');
    return;
  }
  localStorage.setItem('valueScannerApiBase', raw);
  alert('API URL saved.');
}

function loadApiBase() {
  const saved = localStorage.getItem('valueScannerApiBase') || '';
  if (els('apiBase')) els('apiBase').value = saved;
}

function openTool(type) {
  const q = safeQuery();
  const urls = {
    googleApp: `intent://lens.google/#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end`,
    googleFallback: `https://www.google.com/search?udm=2&q=${q}`,
    ebayImage: 'https://www.ebay.com/b/Visual-Search/bn_7115801858',
    ebaySold: `https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`,
    ebayActive: `https://www.ebay.com/sch/i.html?_nkw=${q}`,
    googleShopping: `https://www.google.com/search?tbm=shop&q=${q}`,
    amazon: `https://www.amazon.com/s?k=${q}`,
    facebook: `https://www.facebook.com/marketplace/search/?query=${q}`,
    offerup: `https://offerup.com/search?q=${q}`,
    worthpoint: `https://www.google.com/search?q=${q}+worthpoint+sold`,
    images: `https://www.google.com/search?udm=2&q=${q}`,
    parts: `https://www.google.com/search?q=${q}+part+number+value+sold`,
    maps: `https://www.google.com/maps/search/resale+shop+scrap+yard+near+me`
  };

  if (type === 'googleApp') {
    const opened = window.open(urls.googleApp, '_blank');
    setTimeout(() => {
      if (!opened || opened.closed) window.open(urls.googleFallback, '_blank');
    }, 700);
    return;
  }
  window.open(urls[type], '_blank');
}

function handlePhoto(event) {
  const file = event.target.files && event.target.files[0];
  const box = els('photoPreview');
  if (!file) return;
  selectedPhotoName = file.name;
  currentItem = null;
  const url = URL.createObjectURL(file);
  box.classList.remove('hidden');
  box.innerHTML = `
    <img src="${url}" alt="Selected item photo" />
    <div class="action warningBox">
      <b>Photo loaded.</b><br>
      Use Lens/eBay image search to identify it, then enter the item name. Live price compare needs the backend API URL connected.
    </div>`;
}

function buildLinks() {
  const category = els('category').value;
  const base = [
    ['eBay Sold', 'ebaySold'],
    ['eBay Active', 'ebayActive'],
    ['Google Images', 'images'],
    ['Google Shopping', 'googleShopping'],
    ['Facebook Marketplace', 'facebook'],
    ['OfferUp', 'offerup']
  ];
  if (category === 'tools' || category === 'electronics') base.push(['Amazon', 'amazon']);
  if (category === 'collectibles' || category === 'jewelry') base.push(['WorthPoint Search', 'worthpoint']);
  if (category === 'auto') base.push(['Part Number Search', 'parts']);
  if (category === 'scrap') base.push(['Local Buyers', 'maps']);
  els('links').innerHTML = base.map(([label, key]) => `<a href="#" onclick="openTool('${key}')">${label}</a>`).join('');
}

async function liveCompare() {
  const item = els('itemName').value.trim();
  const apiBase = (els('apiBase').value.trim() || localStorage.getItem('valueScannerApiBase') || '').replace(/\/$/, '');
  if (!item) {
    els('liveResults').innerHTML = '<div class="action warningBox"><b>Enter an item name first.</b></div>';
    return;
  }
  if (!apiBase) {
    els('liveResults').innerHTML = '<div class="action warningBox"><b>Backend not connected.</b><br>Paste your deployed API URL above. GitHub Pages alone cannot fetch live marketplace data.</div>';
    return;
  }
  saveApiBase();
  els('liveResults').innerHTML = '<div class="action">Searching live listings...</div>';
  try {
    const res = await fetch(`${apiBase}/api/compare?q=${encodeURIComponent(item)}&limit=20`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Live compare failed');
    if (!data.items || data.items.length === 0) {
      els('liveResults').innerHTML = '<div class="action warningBox">No current listings found. Try a broader item name.</div>';
      return;
    }
    els('lowComp').value = Math.round(data.priceStats.low || 0);
    els('highComp').value = Math.round(data.priceStats.high || 0);
    els('liveResults').innerHTML = `
      <div class="action">
        <b>Live current listing summary</b><br>
        Low: ${money(data.priceStats.low)} • Median: ${money(data.priceStats.median)} • High: ${money(data.priceStats.high)} • Results: ${data.items.length}
      </div>
      ${data.items.slice(0, 8).map(item => `
        <a class="resultItem" href="${item.url}" target="_blank" rel="noopener">
          ${item.image ? `<img src="${item.image}" alt="" />` : ''}
          <span><b>${item.title}</b><br>${money(item.price)} ${item.condition ? `• ${item.condition}` : ''}<br><small>${item.source}</small></span>
        </a>`).join('')}`;
    analyze();
  } catch (err) {
    els('liveResults').innerHTML = `<div class="action warningBox"><b>Live compare error.</b><br>${err.message}<br>Check backend URL and API keys.</div>`;
  }
}

function calcScrap() {
  const metal = els('metal').value;
  const weight = Number(els('weight').value || 0);
  const [low, high] = scrapRanges[metal];
  return { low: low * weight, high: high * weight, avg: ((low + high) / 2) * weight, metal, weight };
}

function profitScore(avg, fastPrice, category) {
  let score = Math.round(Math.min(100, Math.max(5, fastPrice * 1.4)));
  if (category === 'collectibles' || category === 'jewelry' || category === 'tools') score += 8;
  if (avg < 20) score -= 18;
  if (avg > 100) score += 12;
  return Math.min(100, Math.max(1, score));
}

function recommendation(score, fastPrice, category) {
  if (category === 'scrap') return 'Scrap only if the trip makes sense or you already have a load going.';
  if (score >= 75) return 'List this first. This is a good profit candidate.';
  if (score >= 45) return 'Worth listing, but price it to move or bundle it.';
  if (fastPrice < 15) return 'Bundle, donate, or sell in a lot. Solo listing may waste time.';
  return 'Research a little more before listing. Watch for rare model numbers.';
}

function listingText(item, category, fastPrice, fairPrice) {
  return `${item}\n\nPrice: $${fastPrice}\n\nGood storage-unit find. See photos for condition. I priced it based on current comparable listings for a faster local sale.\n\nDetails:\n- Category: ${category}\n- Condition: used / as shown\n- Estimated fair value: around $${fairPrice}\n- Pickup/local meet preferred\n\nMessage with questions. First reasonable offer gets it.`;
}

function analyze() {
  const item = els('itemName').value.trim();
  const category = els('category').value;
  const condition = Number(els('condition').value);
  const urgency = Number(els('urgency').value);
  const lowComp = Number(els('lowComp').value || 0);
  const highComp = Number(els('highComp').value || 0);
  let low = lowComp;
  let high = highComp;

  if (category === 'scrap' && (!low || !high)) {
    const scrap = calcScrap();
    low = scrap.low;
    high = scrap.high;
  }

  if (!item) {
    currentItem = null;
    els('result').innerHTML = '<h2>2. Result</h2><div class="action warningBox"><b>No value yet.</b><br>Enter the item name first.</div>';
    buildLinks();
    return;
  }

  if (!low && !high) {
    currentItem = null;
    els('result').innerHTML = `<h2>2. Result</h2><div class="action warningBox"><b>${item}</b><br>No comp prices loaded yet. Run Live Compare with backend connected or enter low/high comps manually.</div>`;
    buildLinks();
    return;
  }

  if (!low && high) low = Math.round(high * 0.55);
  if (!high && low) high = Math.round(low * 1.7);
  if (low > high) [low, high] = [high, low];

  const rawAvg = (low + high) / 2;
  const fairPrice = Math.max(1, Math.round(rawAvg * condition));
  const fastPrice = Math.max(1, Math.round(fairPrice * urgency));
  const floorPrice = Math.max(1, Math.round(low * condition * 0.8));
  const holdPrice = Math.max(fastPrice, Math.round(high * condition));
  const score = profitScore(rawAvg, fastPrice, category);
  const scoreClass = score >= 75 ? 'good' : score >= 45 ? 'ok' : 'bad';
  const tips = categoryTips[category] || categoryTips.general;
  const post = listingText(item, category, fastPrice, fairPrice);

  currentItem = { item, category, low, high, fairPrice, fastPrice, floorPrice, holdPrice, score, photo: selectedPhotoName, created: new Date().toLocaleString() };
  els('result').innerHTML = `
    <h2>2. Result</h2>
    <div class="priceBig">List at $${fastPrice}</div>
    <div>
      <span class="pill">Floor: $${floorPrice}</span>
      <span class="pill">Fair: $${fairPrice}</span>
      <span class="pill">Hold-out: $${holdPrice}</span>
      <span class="pill">Comps: $${Math.round(low)} - $${Math.round(high)}</span>
    </div>
    <div class="action"><div class="score ${scoreClass}">Profit Score: ${score}/100</div><p>${recommendation(score, fastPrice, category)}</p></div>
    <div class="action"><b>What makes it better:</b><p>${tips.map(t => `• ${t}`).join('<br>')}</p></div>
    <div class="action"><b>Marketplace post</b><div class="copyBox" id="postText">${post}</div><button onclick="copyPost()">Copy Post</button></div>`;
  buildLinks();
}

async function copyPost() {
  const text = els('postText')?.innerText || '';
  try { await navigator.clipboard.writeText(text); alert('Post copied.'); }
  catch { alert('Copy failed. Long press the text and copy manually.'); }
}

function saveItem() {
  if (!currentItem) { analyze(); if (!currentItem) return; }
  const inv = JSON.parse(localStorage.getItem('valueScannerInventory') || '[]');
  inv.push(currentItem);
  localStorage.setItem('valueScannerInventory', JSON.stringify(inv));
  renderInventory();
}

function clearInventory() {
  if (!confirm('Clear saved inventory?')) return;
  localStorage.removeItem('valueScannerInventory');
  renderInventory();
}

function renderInventory() {
  const inv = JSON.parse(localStorage.getItem('valueScannerInventory') || '[]');
  const totalFast = inv.reduce((sum, x) => sum + Number(x.fastPrice || 0), 0);
  const totalHold = inv.reduce((sum, x) => sum + Number(x.holdPrice || 0), 0);
  els('inventory').innerHTML = `<div class="action"><b>Saved items:</b> ${inv.length}<br><b>Fast-sale total:</b> $${totalFast}<br><b>Hold-out total:</b> $${totalHold}</div>${inv.map(x => `<div class="item"><b>${x.item}</b><br>${x.category} • list $${x.fastPrice} • score ${x.score}/100${x.photo ? `<br>Photo: ${x.photo}` : ''}<br><small>${x.created}</small></div>`).join('')}`;
}

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; els('installBtn').classList.remove('hidden'); });
els('installBtn').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; els('installBtn').classList.add('hidden'); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
els('photoInput').addEventListener('change', handlePhoto);
['itemName', 'category'].forEach(id => els(id).addEventListener('input', buildLinks));
loadApiBase();
buildLinks();
renderInventory();
