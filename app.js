const API_URL = 'https://ddpro-production.up.railway.app';

// ============================================================
// Category enrichment — what each category actually measures
// ============================================================

const CATEGORY_CHECKS = {
  market: [
    'Median days on market (DOM)',
    'Price per sq ft trend (12-month)',
    'Active listing inventory levels',
    'Sale-to-list price ratio',
  ],
  location: [
    'FEMA flood zone designation',
    'Crime index (FBI crime data)',
    'School district GreatSchools rating',
    'Walk score & transit access',
  ],
  property: [
    'Year built & permit history',
    'HOA status and monthly fees',
    'Property tax assessment history',
    'Known liens or title encumbrances',
  ],
};

function getCategoryChecks(name) {
  const key = Object.keys(CATEGORY_CHECKS).find(k => name.toLowerCase().includes(k));
  return CATEGORY_CHECKS[key] || [
    'Data sourced from public records',
    'Cross-referenced with MLS data',
    'Verified against county assessor',
  ];
}

// ============================================================
// Color helpers — return hex + bg RGBA strings
// ============================================================

function scoreColor(score) {
  if (score >= 75) return { hex: '#22c55e', bg: 'rgba(34,197,94,0.11)',  label: 'Low Risk' };
  if (score >= 50) return { hex: '#eab308', bg: 'rgba(234,179,8,0.11)', label: 'Medium Risk' };
  return             { hex: '#ef4444', bg: 'rgba(239,68,68,0.11)',  label: 'High Risk' };
}

function levelColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'excellent': return { hex: '#22c55e', bg: 'rgba(34,197,94,0.11)' };
    case 'good':      return { hex: '#4b79f5', bg: 'rgba(75,121,245,0.11)' };
    case 'average':   return { hex: '#eab308', bg: 'rgba(234,179,8,0.11)' };
    case 'poor':      return { hex: '#ef4444', bg: 'rgba(239,68,68,0.11)' };
    default:          return { hex: '#52637a', bg: 'rgba(82,99,122,0.11)' };
  }
}

// ============================================================
// SVG: Semicircle gauge for overall score
// ============================================================

function buildGaugeSVG(score) {
  const cx = 110, cy = 110, r = 88;
  const c = scoreColor(score);

  const startX = cx - r;   // 22
  const endX   = cx + r;   // 198
  const startY = cy;        // 110

  // Angle in standard math coords (Y-up, CCW positive)
  // score=0 → angle=PI (left), score=100 → angle=0 (right)
  const angle = Math.PI * (1 - score / 100);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);   // negate: SVG Y is flipped

  // Background arc: full semicircle, clockwise (flag=1) = top arc in SVG
  const bgPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${startY}`;

  // Foreground arc: start at left, sweep clockwise to score point
  // Arc span is always ≤ 180°, so large-arc-flag is always 0
  let fgPath = '';
  if (score >= 100) {
    // Degenerate: split into two arcs to avoid start=end ambiguity
    fgPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${endX} ${startY}`;
  } else if (score > 0) {
    fgPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }

  // Tick marks at 25, 50, 75 — crossing the arc
  const ticks = [25, 50, 75].map(t => {
    const a  = Math.PI * (1 - t / 100);
    const ix = cx + (r - 8) * Math.cos(a);
    const iy = cy - (r - 8) * Math.sin(a);
    const ox = cx + (r + 8) * Math.cos(a);
    const oy = cy - (r + 8) * Math.sin(a);
    return `<line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ix.toFixed(1)}" y2="${iy.toFixed(1)}" stroke="#1d2738" stroke-width="2"/>`;
  }).join('');

  return `<svg width="220" height="122" viewBox="0 0 220 122" role="img" aria-label="Risk score gauge: ${score} out of 100">
  <path d="${bgPath}" fill="none" stroke="#1d2738" stroke-width="11" stroke-linecap="round"/>
  ${ticks}
  ${fgPath ? `<path d="${fgPath}" fill="none" stroke="${c.hex}" stroke-width="11" stroke-linecap="round"/>` : ''}
  <text x="19"  y="120" text-anchor="middle" fill="#2a3a50" font-size="10" font-family="-apple-system,system-ui,sans-serif">0</text>
  <text x="201" y="120" text-anchor="middle" fill="#2a3a50" font-size="10" font-family="-apple-system,system-ui,sans-serif">100</text>
  <text x="${cx}" y="86" text-anchor="middle" fill="${c.hex}" font-size="46" font-weight="700" font-family="-apple-system,system-ui,sans-serif" letter-spacing="-1">${score}</text>
  <text x="${cx}" y="105" text-anchor="middle" fill="#52637a" font-size="11" font-family="-apple-system,system-ui,sans-serif">/ 100</text>
</svg>`;
}

// ============================================================
// SVG: Donut chart for category cards
// ============================================================

function buildDonutSVG(score) {
  const cx = 35, cy = 35, r = 26;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const c = scoreColor(score);

  return `<svg width="70" height="70" viewBox="0 0 70 70">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1d2738" stroke-width="5"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.hex}" stroke-width="5"
    stroke-dasharray="${filled.toFixed(2)} ${circ.toFixed(2)}"
    stroke-linecap="round"
    transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="${c.hex}"
    font-size="14" font-weight="700"
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
// UI state helpers
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
  document.getElementById('loading-section').classList.toggle('visible', on);
  const btn = document.getElementById('analyze-btn');
  btn.disabled = on;
  btn.textContent = on ? 'Analyzing...' : 'Analyze Property';
}

// ============================================================
// API call
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
// Render
// ============================================================

function renderResults(data, address) {
  const sc = scoreColor(data.riskScore);

  // Gauge SVG
  document.getElementById('gauge-container').innerHTML = buildGaugeSVG(data.riskScore);

  // Score meta
  const badge = document.getElementById('score-badge');
  badge.textContent = sc.label;
  badge.style.color = sc.hex;
  badge.style.background = sc.bg;

  document.getElementById('analyzed-address').textContent = address;
  document.getElementById('score-description').textContent = data.description || '';

  // Horizontal score bar
  const fill = document.getElementById('score-bar-fill');
  fill.style.width = `${data.riskScore}%`;
  fill.style.background = sc.hex;

  // Category cards
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';
  (data.riskCategories || []).forEach(cat => {
    const c = scoreColor(cat.score);
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

  // Risk factors table
  const tbody = document.getElementById('factors-tbody');
  tbody.innerHTML = '';
  (data.riskFactors || []).forEach(fac => {
    const lc = levelColor(fac.level);
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

  document.getElementById('results-section').classList.add('visible');
}

// ============================================================
// Event handlers
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

  try {
    const data = await analyzeProperty(address);
    renderResults(data, address);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

function resetForm() {
  document.getElementById('address-input').value = '';
  document.getElementById('results-section').classList.remove('visible');
  clearError();
  document.getElementById('address-input').focus();
}

document.getElementById('address-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnalyze();
});
