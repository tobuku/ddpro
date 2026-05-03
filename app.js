const API_URL = 'https://ddpro-production.up.railway.app';

// ============================================================
// Category enrichment
// ============================================================

const CATEGORY_CHECKS = {
  market: [
    'Median days on market (DOM)',
    'Price per sq ft trend',
    'Sale-to-list price ratio',
  ],
  location: [
    'FEMA flood zone designation',
    'Crime index (FBI data)',
    'School district rating',
  ],
  property: [
    'Year built & permit history',
    'HOA status & monthly fees',
    'Known liens or encumbrances',
  ],
};

function getCategoryChecks(name) {
  const key = Object.keys(CATEGORY_CHECKS).find(k => name.toLowerCase().includes(k));
  return CATEGORY_CHECKS[key] || ['Public records data', 'MLS cross-reference', 'County assessor'];
}

// ============================================================
// Color helpers — light theme
// ============================================================

function scoreColor(score) {
  if (score >= 75) return { hex: '#15803d', bg: 'rgba(21,128,61,0.09)',  label: 'Low Risk' };
  if (score >= 50) return { hex: '#b45309', bg: 'rgba(180,83,9,0.09)',   label: 'Medium Risk' };
  return             { hex: '#b91c1c', bg: 'rgba(185,28,28,0.09)',  label: 'High Risk' };
}

function levelColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'excellent': return { hex: '#15803d', bg: 'rgba(21,128,61,0.09)' };
    case 'good':      return { hex: '#1d4ed8', bg: 'rgba(29,78,216,0.09)' };
    case 'average':   return { hex: '#b45309', bg: 'rgba(180,83,9,0.09)' };
    case 'poor':      return { hex: '#b91c1c', bg: 'rgba(185,28,28,0.09)' };
    default:          return { hex: '#64748b', bg: 'rgba(100,116,139,0.09)' };
  }
}

// ============================================================
// SVG: Semicircle gauge (light theme)
// Semicircle: left=(22,110) → clockwise (CW in SVG = top arc) → right=(198,110)
// ============================================================

function buildGaugeSVG(score) {
  const cx = 110, cy = 110, r = 88;
  const c = scoreColor(score);

  const startX = cx - r;   // 22
  const endX   = cx + r;   // 198

  // Standard math angle: π at score=0 (left), 0 at score=100 (right)
  const angle = Math.PI * (1 - score / 100);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);   // SVG Y is flipped

  // CW sweep (flag=1) from left → top → right = top semicircle
  const bgPath = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`;

  let fgPath = '';
  if (score >= 100) {
    fgPath = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${endX} ${cy}`;
  } else if (score > 0) {
    fgPath = `M ${startX} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }

  // Tick marks at 25 / 50 / 75 — white cuts through the arc
  const ticks = [25, 50, 75].map(t => {
    const a  = Math.PI * (1 - t / 100);
    const ix = cx + (r - 9) * Math.cos(a);
    const iy = cy - (r - 9) * Math.sin(a);
    const ox = cx + (r + 9) * Math.cos(a);
    const oy = cy - (r + 9) * Math.sin(a);
    return `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="#ffffff" stroke-width="2.5"/>`;
  }).join('');

  return `<svg width="180" height="102" viewBox="0 0 220 122" role="img" aria-label="Risk score gauge: ${score} out of 100">
  <path d="${bgPath}" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
  ${fgPath ? `<path d="${fgPath}" fill="none" stroke="${c.hex}" stroke-width="12" stroke-linecap="round"/>` : ''}
  ${ticks}
  <text x="19"  y="120" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="-apple-system,system-ui,sans-serif">0</text>
  <text x="201" y="120" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="-apple-system,system-ui,sans-serif">100</text>
  <text x="${cx}" y="86" text-anchor="middle" fill="${c.hex}" font-size="48" font-weight="700" font-family="-apple-system,system-ui,sans-serif" letter-spacing="-1">${score}</text>
  <text x="${cx}" y="105" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="-apple-system,system-ui,sans-serif">/ 100</text>
</svg>`;
}

// ============================================================
// SVG: Donut chart for category cards (light theme, 56×56)
// ============================================================

function buildDonutSVG(score) {
  const cx = 28, cy = 28, r = 21;
  const circ  = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const c = scoreColor(score);

  return `<svg width="56" height="56" viewBox="0 0 56 56">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.hex}" stroke-width="4.5"
    stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}"
    stroke-linecap="round"
    transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${c.hex}"
    font-size="12" font-weight="700"
    font-family="-apple-system,system-ui,sans-serif">${score}</text>
</svg>`;
}

// ============================================================
// Factor bar with tick marks at 25 / 50 / 75
// ============================================================

function buildFactorBar(score, hex) {
  return `<div class="factor-bar-bg">
  <div class="factor-bar-fill" style="width:${score}%; background:${hex};"></div>
  <div class="factor-tick" style="left:25%"></div>
  <div class="factor-tick" style="left:50%"></div>
  <div class="factor-tick" style="left:75%"></div>
</div>`;
}

// ============================================================
// UI state
// ============================================================

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('visible');
}

function clearError() {
  const el = document.getElementById('error-msg');
  el.textContent = '';
  el.classList.remove('visible');
}

function setLoading(on) {
  document.getElementById('loading-indicator').classList.toggle('visible', on);
  document.getElementById('hero-placeholder').classList.toggle('hidden', on);
  const btn = document.getElementById('analyze-btn');
  btn.disabled = on;
  btn.textContent = on ? 'Analyzing...' : 'Analyze Property';
}

// ============================================================
// API
// ============================================================

async function analyzeProperty(address) {
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Server error ${res.status}`);
  }
  return res.json();
}

// ============================================================
// Map — Leaflet + Nominatim geocoding
// ============================================================

let mapInstance = null;

async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function renderMap(lat, lon, address) {
  const section = document.getElementById('map-section');
  section.classList.remove('hidden');
  document.getElementById('map-address-label').textContent = address;

  // Destroy previous instance
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map('map').setView([lat, lon], 17);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(mapInstance);

  const marker = L.marker([lat, lon]).addTo(mapInstance);
  marker.bindPopup(`<strong>${address}</strong>`).openPopup();

  // Ensure Leaflet computes dimensions after display
  setTimeout(() => mapInstance.invalidateSize(), 100);
}

// ============================================================
// Render results
// ============================================================

function renderResults(data, address) {
  const sc = scoreColor(data.riskScore);

  // Gauge
  document.getElementById('gauge-container').innerHTML = buildGaugeSVG(data.riskScore);

  // Score meta
  const badge = document.getElementById('score-badge');
  badge.textContent = sc.label;
  badge.style.color = sc.hex;
  badge.style.background = sc.bg;

  document.getElementById('analyzed-address').textContent = address;
  document.getElementById('score-description').textContent = data.description || '';

  // Category cards
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';
  (data.riskCategories || []).forEach(cat => {
    const c      = scoreColor(cat.score);
    const checks = getCategoryChecks(cat.name);
    const checksHTML = checks.map(ch => `<li>${ch}</li>`).join('');
    grid.insertAdjacentHTML('beforeend', `
      <div class="category-card">
        <div class="cat-top">
          ${buildDonutSVG(cat.score)}
          <div class="cat-info">
            <div class="cat-name">${cat.name}</div>
            <span class="cat-badge" style="color:${c.hex};background:${c.bg};">${c.label}</span>
          </div>
        </div>
        <p class="cat-desc">${cat.description || ''}</p>
        <div class="cat-checks-label">What we analyze</div>
        <ul class="cat-checks">${checksHTML}</ul>
      </div>
    `);
  });

  // Factors table
  const tbody = document.getElementById('factors-tbody');
  tbody.innerHTML = '';
  (data.riskFactors || []).forEach(fac => {
    const lc  = levelColor(fac.level);
    const pct = Math.min(100, Math.max(0, fac.score ?? 50));
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td><span class="factor-name">${fac.name}</span></td>
        <td>${buildFactorBar(pct, lc.hex)}</td>
        <td class="col-num"><span class="factor-score-num" style="color:${lc.hex}">${pct}</span></td>
        <td><span class="level-badge" style="color:${lc.hex};background:${lc.bg};">${fac.level || '—'}</span></td>
      </tr>
    `);
  });

  // Show results and below-fold sections
  document.getElementById('hero-placeholder').classList.add('hidden');
  document.getElementById('results-section').classList.add('visible');
  document.getElementById('dd-guide').classList.remove('hidden');
  document.getElementById('page-footer').classList.remove('hidden');
}

// ============================================================
// Main flow
// ============================================================

async function handleAnalyze() {
  clearError();
  const address = document.getElementById('address-input').value.trim();

  if (!address) {
    showError('Please enter a property address.');
    return;
  }
  if (!address.includes(',')) {
    showError('Include city and state — e.g. "123 Main St, Honolulu, HI"');
    return;
  }

  setLoading(true);
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('dd-guide').classList.add('hidden');
  document.getElementById('map-section').classList.add('hidden');
  document.getElementById('page-footer').classList.add('hidden');

  try {
    // Run API analysis and geocoding in parallel
    const [data, coords] = await Promise.all([
      analyzeProperty(address),
      geocodeAddress(address),
    ]);

    renderResults(data, address);

    if (coords) {
      renderMap(coords.lat, coords.lon, address);
    }
  } catch (err) {
    document.getElementById('hero-placeholder').classList.remove('hidden');
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

function resetForm() {
  document.getElementById('address-input').value = '';
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('hero-placeholder').classList.remove('hidden');
  document.getElementById('dd-guide').classList.add('hidden');
  document.getElementById('map-section').classList.add('hidden');
  document.getElementById('page-footer').classList.add('hidden');
  clearError();
  document.getElementById('address-input').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('address-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnalyze();
});
