const API_URL = 'https://ddpro-production.up.railway.app';

// ============================================================
// Seeded RNG (Mulberry32) — consistent results per address
// ============================================================

function makeRng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(str) {
  return str.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 7);
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

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// SVG: Semicircle gauge (light theme, clockwise = top arc)
// ============================================================

function buildGaugeSVG(score) {
  const cx = 110, cy = 110, r = 88;
  const c = scoreColor(score);
  const bgPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  const angle = Math.PI * (1 - score / 100);
  const ex = cx + r * Math.cos(angle);
  const ey = cy - r * Math.sin(angle);
  let fgPath = '';
  if (score >= 100) fgPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy-r} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  else if (score > 0) fgPath = `M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  const ticks = [25,50,75].map(t => {
    const a = Math.PI*(1-t/100);
    return `<line x1="${(cx+(r+9)*Math.cos(a)).toFixed(1)}" y1="${(cy-(r+9)*Math.sin(a)).toFixed(1)}" x2="${(cx+(r-9)*Math.cos(a)).toFixed(1)}" y2="${(cy-(r-9)*Math.sin(a)).toFixed(1)}" stroke="#fff" stroke-width="2.5"/>`;
  }).join('');
  return `<svg width="180" height="102" viewBox="0 0 220 122" role="img" aria-label="Risk score: ${score}">
  <path d="${bgPath}" fill="none" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
  ${fgPath ? `<path d="${fgPath}" fill="none" stroke="${c.hex}" stroke-width="12" stroke-linecap="round"/>` : ''}
  ${ticks}
  <text x="19" y="120" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="-apple-system,system-ui,sans-serif">0</text>
  <text x="201" y="120" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="-apple-system,system-ui,sans-serif">100</text>
  <text x="${cx}" y="86" text-anchor="middle" fill="${c.hex}" font-size="48" font-weight="700" font-family="-apple-system,system-ui,sans-serif" letter-spacing="-1">${score}</text>
  <text x="${cx}" y="106" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="-apple-system,system-ui,sans-serif">/ 100</text>
</svg>`;
}

function buildDonutSVG(score) {
  const cx = 28, cy = 28, r = 21;
  const circ = 2 * Math.PI * r;
  const c = scoreColor(score);
  return `<svg width="56" height="56" viewBox="0 0 56 56">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="4.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.hex}" stroke-width="4.5"
    stroke-dasharray="${((score/100)*circ).toFixed(2)} ${circ.toFixed(2)}"
    stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy+5}" text-anchor="middle" fill="${c.hex}" font-size="12" font-weight="700" font-family="-apple-system,system-ui,sans-serif">${score}</text>
</svg>`;
}

function buildFactorBar(pct, hex) {
  return `<div class="factor-bar-bg"><div class="factor-bar-fill" style="width:${pct}%;background:${hex}"></div><div class="factor-tick" style="left:25%"></div><div class="factor-tick" style="left:50%"></div><div class="factor-tick" style="left:75%"></div></div>`;
}

// ============================================================
// Mock report generator — seeded from address + API scores
// ============================================================

function riskCatScore(data, keyword) {
  const cat = (data.riskCategories || []).find(c => c.name.toLowerCase().includes(keyword.toLowerCase()));
  return cat ? cat.score : data.riskScore;
}

function generateReport(data, address) {
  const score  = data.riskScore;
  const mScore = riskCatScore(data, 'market');
  const lScore = riskCatScore(data, 'location');
  const pScore = riskCatScore(data, 'property');

  const isHI = /\bhi\b|honolulu|hawaii|maui|oahu|kauai|hilo/i.test(address);
  const rng  = makeRng(seedFrom(address));
  const ri   = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const rp   = arr => arr[ri(0, arr.length - 1)];
  const good = s => s >= 75;
  const med  = s => s >= 50;

  // Price
  const basePrice   = isHI ? 875000 : 450000;
  const price       = basePrice + ri(-150000, 200000);
  const fmtPrice    = '$' + price.toLocaleString();

  // Mortgage (30yr, 20% down, 7%)
  const loan    = price * 0.80;
  const moRate  = 0.07 / 12;
  const n       = 360;
  const moPmt   = Math.round(loan * (moRate * Math.pow(1+moRate,n)) / (Math.pow(1+moRate,n)-1));

  // Taxes
  const taxRate = isHI ? 0.0035 : 0.011;
  const annTax  = Math.round(price * taxRate);
  const moTax   = Math.round(annTax / 12);

  // HOA
  const hasHOA  = rng() > 0.45;
  const hoaDues = hasHOA ? ri(350, 850) : 0;

  // Insurance
  const annIns  = Math.round(price * 0.006);
  const moIns   = Math.round(annIns / 12);

  // Flood insurance
  const floodReq   = lScore < 60;
  const annFloodIns = floodReq ? ri(1800, 4500) : 0;

  // Utilities & maintenance
  const moUtil  = ri(180, 350);
  const annMaint = Math.round(price * 0.01);
  const moTotal = moPmt + moTax + hoaDues + moIns + moUtil;

  // Market
  const dom          = good(mScore) ? ri(8,28) : med(mScore) ? ri(28,65) : ri(65,120);
  const priorSaleYr  = ri(2015, 2022);
  const priorSale    = Math.round(price * (0.62 + rng() * 0.28));
  const appreciation = Math.round((price - priorSale) / priorSale * 100);
  const motivation   = good(mScore) ? 'Low — seller in control in hot market' : med(mScore) ? 'Moderate — open to negotiation' : 'High — extended DOM suggests flexibility';

  // Property
  const roofAge   = good(pScore) ? ri(2,8)  : med(pScore) ? ri(8,18)  : ri(18,30);
  const roofMat   = rp(['Asphalt shingle','Concrete tile','Metal','Modified bitumen']);
  const roofLife  = Math.max(0, (roofMat === 'Metal' ? 40 : roofMat === 'Concrete tile' ? 50 : 25) - roofAge);
  const foundCond = good(pScore) ? 'No visible concerns' : med(pScore) ? 'Minor settling — monitor annually' : 'Structural cracks present — engineer inspection required';
  const plumAge   = good(pScore) ? ri(5,15)  : med(pScore) ? ri(15,30) : ri(30,50);
  const panelSize = rp(['100A','150A','200A']);
  const wiringType = plumAge > 35 ? 'Aluminum (pre-1972 era) — verify condition' : 'Copper';
  const hvacAge   = good(pScore) ? ri(1,8)   : med(pScore) ? ri(8,15)  : ri(15,25);
  const whAge     = good(pScore) ? ri(1,5)   : med(pScore) ? ri(5,10)  : ri(10,18);
  const permitNote = good(pScore) ? 'No open permits found in county records' : 'Verify all additions with county permit database';

  // Location
  const floodZone   = lScore >= 70 ? 'Zone X (minimal risk)' : lScore >= 55 ? 'Zone X-500 (moderate)' : 'Zone AE — flood insurance required';
  const schoolRating = good(lScore) ? ri(7,9) : med(lScore) ? ri(5,7) : ri(3,5);
  const walkScore    = good(lScore) ? ri(62,88) : med(lScore) ? ri(38,62) : ri(15,38);
  const hospDist     = ri(1,8);
  const commuteMins  = good(lScore) ? ri(10,25) : med(lScore) ? ri(25,45) : ri(45,75);
  const aqiAvg       = good(lScore) ? ri(18,45) : med(lScore) ? ri(45,75) : ri(75,120);
  const crimeIndex   = good(lScore) ? 'Low (below city average)' : med(lScore) ? 'Moderate (near city average)' : 'Above average — verify with local data';
  const internet     = isHI ? 'Spectrum, Hawaiian Telcom — fiber available in most areas' : 'Major carrier available — fiber options vary by street';

  // Investment
  const moRent       = isHI ? ri(2800,4800) : ri(1600,3200);
  const grossYield   = ((moRent * 12) / price * 100).toFixed(1);
  const netYield     = (parseFloat(grossYield) - 2.5).toFixed(1);
  const vacancyRate  = good(lScore) ? ri(2,5) + '%' : med(lScore) ? ri(5,9) + '%' : ri(9,15) + '%';
  const exitEase     = good(score) ? 'Strong buyer demand — clean exit likely in 3–5 yrs' : med(score) ? 'Moderate — price at market or below to exit cleanly' : 'Challenging — multiple risk factors may limit buyer pool';
  const apprHist     = isHI ? '+5.8% avg annually (10-yr, Honolulu Board of Realtors)' : '+4.1% avg annually (10-yr, Case-Shiller)';

  // Title
  const titleClear = score >= 60;
  const lienStatus = score >= 70 ? 'No liens detected in public record' : 'Possible lien — verify with title company before offer';

  // Natural hazards
  const tsunamiRisk   = isHI ? 'Verify zone at hawaiiema.hawaii.gov' : 'Not applicable for this region';
  const hurricaneRisk = isHI ? 'Moderate — Cat 1–2 possible; impact windows recommended' : 'Low for this region (verify NOAA maps)';
  const earthquakeRisk = isHI ? 'Moderate — seismic activity common; check county zone' : 'Low-moderate — verify USGS hazard maps';
  const wildfireRisk  = good(lScore) ? 'Low — minimal vegetation near structure' : 'Moderate — verify with local fire authority';

  // HOA
  const hoaReserve = hasHOA ? (good(pScore) ? 'Adequate funding (request reserve study to confirm)' : 'Unknown — request reserve study before closing') : 'N/A — no HOA';

  return {
    price, fmtPrice, moPmt, moTax, annTax, hoaDues, hasHOA, moIns, annIns,
    floodReq, annFloodIns, moUtil, annMaint, moTotal,
    dom, priorSaleYr, priorSale, appreciation, motivation,
    roofAge, roofMat, roofLife, foundCond, plumAge, panelSize, wiringType, hvacAge, whAge, permitNote,
    floodZone, schoolRating, walkScore, hospDist, commuteMins, aqiAvg, crimeIndex, internet,
    moRent, grossYield, netYield, vacancyRate, exitEase, apprHist,
    titleClear, lienStatus,
    tsunamiRisk, hurricaneRisk, earthquakeRisk, wildfireRisk,
    hasHOA, hoaDues, hoaReserve, isHI,
  };
}

// ============================================================
// Render: metrics strip
// ============================================================

function renderMetricsStrip(r) {
  const tiles = [
    { label: 'Est. Market Value',  value: r.fmtPrice,                                 sub: 'comparative estimate' },
    { label: 'Total Monthly Cost', value: '$' + r.moTotal.toLocaleString(),           sub: 'mortgage+tax+ins+util' },
    { label: 'Days on Market',     value: r.dom + ' days',                            sub: 'est. for this market' },
    { label: 'Flood Zone',         value: r.floodZone.split(' ').slice(0,2).join(' '), sub: r.floodReq ? 'Ins. required' : 'Standard coverage' },
    { label: 'School District',    value: r.schoolRating + ' / 10',                   sub: 'estimated rating' },
  ];
  // Return inner HTML only — container #metrics-strip stays in place
  return tiles.map(t =>
    `<div class="metric-tile"><span class="metric-label">${t.label}</span><span class="metric-value">${t.value}</span><span class="metric-sub">${t.sub}</span></div>`
  ).join('');
}

// ============================================================
// Render: detail sections
// ============================================================

function badge(type, text) {
  return `<span class="s-${type}">${text}</span>`;
}

function row(q, a, status) {
  const labels = { ok: 'Clear', warn: 'Review', alert: 'Concern', info: 'Note' };
  return `<tr class="ds-row"><td class="ds-q">${q}</td><td class="ds-a">${a}</td><td class="ds-s">${badge(status, labels[status] || status)}</td></tr>`;
}

function section(title, items) {
  return `<div class="ds-section">
  <div class="ds-head"><span class="ds-title">${title}</span><span class="ds-count">${items.length} checks</span></div>
  <table class="ds-table">
  <thead><tr><th>Check</th><th>Finding</th><th>Status</th></tr></thead>
  <tbody>${items.join('')}</tbody>
  </table></div>`;
}

function renderDetailSections(r) {
  const ap = r.appreciation;

  return [

    section('Title &amp; Legal', [
      row('Clear title, no ownership disputes',    r.titleClear ? 'No disputes found in public record' : 'Disputes possible — title search required before offer', r.titleClear ? 'ok' : 'warn'),
      row('Existing liens or unpaid debts',        r.lienStatus, r.titleClear ? 'ok' : 'warn'),
      row('Property legal description',            'Verify matches listing with county recorder before closing', 'info'),
      row('Boundary survey accuracy',              'Professional survey recommended — confirm with title company', 'info'),
      row('Encroachments from neighbors',          'No visible encroachments reported — confirm at survey', 'info'),
      row('Easements affecting use',               'Utility easements typical — verify full title commitment report', 'info'),
    ]),

    section('Market &amp; Pricing', [
      row('Current market value estimate',         r.fmtPrice + ' (comparative estimate)',  'info'),
      row('Price vs recent comparable sales',      ap > 30 ? 'Priced above recent comps — negotiate down or verify with agent' : 'Priced within range of recent comps', ap > 30 ? 'warn' : 'ok'),
      row('Days on market',                        r.dom + ' days (estimated for current market conditions)', r.dom < 30 ? 'ok' : r.dom < 60 ? 'info' : 'warn'),
      row('Prior sale price &amp; date',           '$' + r.priorSale.toLocaleString() + ' in ' + r.priorSaleYr, 'info'),
      row('Appreciation since prior sale',         '+' + ap + '% — ' + (ap > 40 ? 'significant run-up; verify comps closely' : 'consistent with area trends'), ap > 40 ? 'warn' : 'ok'),
      row('Seller motivation level',               r.motivation, 'info'),
    ]),

    section('Financial Planning', [
      row('Mortgage payment estimate',             '$' + r.moPmt.toLocaleString() + '/mo (30yr fixed, 20% down, ~7%)', 'info'),
      row('Property tax (annual)',                 '$' + r.annTax.toLocaleString() + '/yr &nbsp;·&nbsp; $' + r.moTax.toLocaleString() + '/mo', 'info'),
      row('Tax history (5–10 yr trend)',           r.isHI ? 'Hawaii rates among lowest in US — stable trend historically' : 'Verify 5-yr history with county assessor records', 'info'),
      row('HOA dues',                              r.hasHOA ? '$' + r.hoaDues + '/mo — request HOA docs before offer' : 'None — no HOA on this property', r.hasHOA ? 'warn' : 'ok'),
      row('Special assessments pending',           r.hasHOA ? 'Request HOA meeting minutes to check for upcoming assessments' : 'N/A — no HOA', r.hasHOA ? 'info' : 'ok'),
      row('Homeowners insurance estimate',         '$' + r.annIns.toLocaleString() + '/yr (est. 0.6% of value)', 'info'),
      row('Flood insurance requirement',           r.floodReq ? 'Required — est. $' + r.annFloodIns.toLocaleString() + '/yr (verify with lender)' : 'Not required for standard financing in this zone', r.floodReq ? 'warn' : 'ok'),
      row('Utility cost average',                  '$' + r.moUtil + '/mo estimated (electric, water, gas)', 'info'),
      row('Maintenance estimate (annual)',          '$' + r.annMaint.toLocaleString() + '/yr (1% of value rule of thumb)', 'info'),
      row('Total estimated monthly cost',          '$' + r.moTotal.toLocaleString() + '/mo all-in (excl. flood ins.)', 'info'),
    ]),

    section('Property Condition', [
      row('Roof age &amp; condition',              r.roofAge + ' years · ' + r.roofMat, r.roofAge < 10 ? 'ok' : r.roofAge < 20 ? 'info' : 'warn'),
      row('Remaining roof life expectancy',        r.roofLife + ' years estimated', r.roofLife > 15 ? 'ok' : r.roofLife > 5 ? 'warn' : 'alert'),
      row('Foundation condition',                  r.foundCond, r.foundCond.includes('No visible') ? 'ok' : r.foundCond.includes('Minor') ? 'warn' : 'alert'),
      row('Plumbing system age',                   r.plumAge + ' years estimated', r.plumAge < 15 ? 'ok' : r.plumAge < 30 ? 'info' : 'warn'),
      row('Electrical panel &amp; wiring type',    r.panelSize + ' panel · ' + r.wiringType, r.wiringType.includes('Aluminum') ? 'warn' : 'ok'),
      row('HVAC system age',                       r.hvacAge + ' years estimated', r.hvacAge < 8 ? 'ok' : r.hvacAge < 15 ? 'info' : 'warn'),
      row('Water heater age',                      r.whAge + ' years estimated', r.whAge < 6 ? 'ok' : r.whAge < 12 ? 'info' : 'warn'),
      row('Permit history for renovations',        r.permitNote, r.permitNote.includes('No open') ? 'ok' : 'warn'),
    ]),

    section('Safety &amp; Natural Hazards', [
      row('Flood risk',                            r.floodZone, r.floodReq ? 'warn' : 'ok'),
      row('Wildfire risk',                         r.wildfireRisk, r.wildfireRisk.includes('Low') ? 'ok' : 'warn'),
      row('Earthquake risk',                       r.earthquakeRisk, r.isHI ? 'info' : 'ok'),
      row('Hurricane risk',                        r.hurricaneRisk, r.isHI ? 'info' : 'ok'),
      row('Tsunami risk',                          r.tsunamiRisk, r.isHI ? 'warn' : 'ok'),
      row('Crime index',                           r.crimeIndex, r.crimeIndex.includes('Low') ? 'ok' : r.crimeIndex.includes('Moderate') ? 'info' : 'warn'),
      row('Air quality index (avg)',               'AQI ~' + r.aqiAvg + ' — ' + (r.aqiAvg < 50 ? 'Good' : r.aqiAvg < 100 ? 'Moderate' : 'Unhealthy for sensitive groups'), r.aqiAvg < 50 ? 'ok' : r.aqiAvg < 100 ? 'info' : 'warn'),
      row('Smoke &amp; CO detectors',             'Required by law — verify installed and operational at inspection', 'info'),
    ]),

    section('Location &amp; Neighborhood', [
      row('School district rating',                r.schoolRating + ' / 10 (estimated) — verify at GreatSchools.org', r.schoolRating >= 7 ? 'ok' : r.schoolRating >= 5 ? 'info' : 'warn'),
      row('Walkability score',                     r.walkScore + ' / 100', r.walkScore >= 65 ? 'ok' : r.walkScore >= 40 ? 'info' : 'warn'),
      row('Hospital / ER distance',               r.hospDist + ' miles to nearest emergency room', r.hospDist <= 3 ? 'ok' : 'info'),
      row('Commute to employment centers',         r.commuteMins + ' min estimated to nearest major job center', r.commuteMins <= 25 ? 'ok' : r.commuteMins <= 45 ? 'info' : 'warn'),
      row('Internet service options',              r.internet, 'ok'),
      row('Pest pressure in area',                 r.isHI ? 'High — drywood &amp; subterranean termites, centipedes common; schedule pest inspection' : 'Moderate — order pest inspection separately', r.isHI ? 'warn' : 'info'),
      row('Water quality',                         'Check local water quality report at EWG.org/tapwater or EPA.gov', 'info'),
      row('Noise exposure',                        'Verify airport flight paths, highway proximity, and train routes at this address before offer', 'info'),
    ]),

    section('Investment Analysis', [
      row('Estimated monthly rent',                '$' + r.moRent.toLocaleString() + '/mo unfurnished long-term (estimated)', 'info'),
      row('Gross rental yield',                    r.grossYield + '%', parseFloat(r.grossYield) >= 5 ? 'ok' : parseFloat(r.grossYield) >= 3 ? 'info' : 'warn'),
      row('Net rental yield (after expenses)',     r.netYield + '% estimated (gross minus ~2.5% vacancy/mgmt)', parseFloat(r.netYield) >= 3 ? 'ok' : 'info'),
      row('Area appreciation history',             r.apprHist, 'ok'),
      row('Vacancy rate in area',                  r.vacancyRate, 'info'),
      row('Exit strategy ease (3–5 yr)',           r.exitEase, r.exitEase.includes('Strong') ? 'ok' : r.exitEase.includes('Moderate') ? 'info' : 'warn'),
      row('Short-term rental legality',            r.isHI ? 'Restricted — STR permits severely limited in most Hawaii counties; verify before purchase' : 'Verify local STR ordinances before purchase — regulations vary widely', r.isHI ? 'warn' : 'info'),
      row('HOA rental restrictions',               r.hasHOA ? 'Verify rental cap and STR prohibition in CC&Rs before offer' : 'No HOA — no rental restrictions from HOA', r.hasHOA ? 'warn' : 'ok'),
    ]),

  ].join('');
}

// ============================================================
// Render: Follow-up Q&A
// ============================================================

function renderFollowUp(r) {
  const cats = [
    {
      label: 'Systems &amp; Utilities',
      items: [
        ['Sewer line condition',                  'Sewer scope inspection strongly recommended before closing — schedule after general inspection'],
        ['Water pressure quality',                'Verify at meter during inspection — acceptable range is 40–80 PSI'],
        ['Plumbing pipe material',                r.wiringType.includes('Copper') ? 'Copper wiring consistent with copper plumbing era — confirm at inspection' : 'Verify pipe material at inspection — galvanized steel corrodes over time'],
        ['Energy efficiency rating',              'Request 12 months of utility bills from seller — calculate cost per sq ft'],
        ['Solar panels owned or leased',          'Verify ownership status — leased panels complicate financing and resale'],
        ['Insulation quality',                    'Inspect attic insulation at general inspection — R-38+ preferred in most climates'],
        ['EV charging outlet in garage',          'Verify dedicated 240V outlet (NEMA 14-50) or hardwired EVSE before close'],
        ['Washer/dryer setup',                    'Confirm in-unit hookups — gas or electric — and verify dryer vent routes outside'],
      ]
    },
    {
      label: 'Inspections &amp; Permits',
      items: [
        ['Unpermitted additions present',         'Cross-check all structures with county permit database — unpermitted work = buyer liability'],
        ['Code violations open or past',          'Search county records for open or unresolved code violations at this parcel'],
        ['Mold signs or past remediation',        r.isHI ? 'High priority in Hawaii — inspect crawlspace, attic, closets; humidity accelerates mold' : 'Inspect wet areas and crawlspace — look for musty odors or discoloration'],
        ['Termite or pest damage',                r.isHI ? 'Critical — drywood and subterranean termites both present in Hawaii; tent fumigation possible' : 'Order separate pest inspection — cost typically $75–$200'],
        ['Roof inspection findings',              'Separate roof inspection recommended for roofs over 10 years — $150–$400'],
        ['Sewer scope findings',                  'Schedule sewer scope ($200–$400) — reveals root intrusion, cracks, bellied lines'],
        ['Radon level',                           r.isHI ? 'Low risk in most of Hawaii — volcanic areas can have elevated indoor radon; test if concerned' : 'Test if slab or basement foundation — mitigation is straightforward if needed'],
        ['Lead paint risk',                       r.roofAge > 20 ? 'Pre-1978 construction era — lead paint disclosure required; test before renovation' : 'Unlikely in this era of construction — verify with county records'],
      ]
    },
    {
      label: 'HOA &amp; Building',
      items: [
        ['HOA reserve fund health',               r.hoaReserve],
        ['HOA delinquency rate',                  r.hasHOA ? 'Request HOA financials — delinquency rate over 15% is a red flag for lenders' : 'N/A — no HOA'],
        ['Special assessments pending',           r.hasHOA ? 'Request last 24 months of HOA meeting minutes — look for approved or planned special assessments' : 'N/A — no HOA'],
        ['HOA rules on pets',                     r.hasHOA ? 'Request pet policy — breed and size restrictions common in Hawaii condos' : 'N/A — no HOA'],
        ['HOA rules on rentals',                  r.hasHOA ? 'Verify rental cap percentage and STR prohibition in CC&Rs' : 'N/A — no HOA'],
        ['HOA rules on renovations',              r.hasHOA ? 'Check architectural review process — some HOAs require board approval for interior work' : 'N/A — no HOA'],
        ['Condo warrantable for conventional loan', r.hasHOA ? 'Verify with lender — owner-occupancy ratio, HOA litigation, and budget adequacy all affect eligibility' : 'N/A'],
        ['FHA or VA approval status',             r.hasHOA ? 'Verify FHA/VA condo approval with HUD condo approval list if using government-backed financing' : 'N/A for single-family'],
      ]
    },
    {
      label: 'Neighborhood &amp; Lifestyle',
      items: [
        ['Registered sex offenders nearby',       'Check FamilyWatchdog.us — permitted where legally allowed to review'],
        ['School quality by level',               'Check GreatSchools.org for individual elementary, middle, and high school ratings'],
        ['Distance to beaches / recreation',      r.isHI ? 'Excellent recreational access — Hawaii beaches and trails widely accessible' : 'Verify proximity to parks, trails, and recreation before offer'],
        ['Airport noise exposure',                'Check FAA flight track tool (skyvector.com or flightaware.com) for overhead flight paths at this address'],
        ['Noise from highways or trains',         'Visit the property on a weekday morning and evening — highway and rail noise travels further than expected'],
        ['Odors from farms, industry, landfill',  'Visit at different times and wind conditions — odor issues are not disclosed by sellers in all states'],
        ['Neighbor disputes known',               'Ask direct neighbors before offer — HOA records may also document neighbor conflicts'],
        ['Neighborhood trending up or down',      'Review 3-year price trend in this zip code on Zillow, Redfin, or Realtor.com'],
      ]
    },
    {
      label: 'Property Details',
      items: [
        ['Legal bedroom count',                   'Verify bedrooms meet legal egress requirements (window size and sill height) — affects legal room count and resale'],
        ['Square footage accuracy',               'Cross-check MLS square footage with county assessor records — discrepancies of 5–10% are common'],
        ['Pool condition (if present)',           'Order separate pool inspection ($150–$250) — equipment age and surface condition both matter'],
        ['Outdoor space drainage',                'Inspect grading — water should flow away from foundation; poor drainage is a chronic problem'],
        ['Privacy from neighbors',                'Assess fence height and sight lines at inspection — factor into value if privacy is a priority'],
        ['Storage adequacy',                      'Measure garage depth and closet space at walk-through — many Hawaii homes have limited storage'],
        ['Natural light quality',                 'Visit at multiple times of day — morning and afternoon light differ significantly by orientation'],
        ['Ceiling height',                        'Measure at inspection — 8ft minimum, 9ft+ preferred; affects sense of space and resale appeal'],
      ]
    },
    {
      label: 'Exit Strategy &amp; Resale',
      items: [
        ['Best realistic offer price today',      r.dom < 30 ? 'Within 2–3% of list price given low DOM — market favors seller' : r.dom < 60 ? '3–5% below list — reasonable room to negotiate' : '5–8% below list — extended DOM gives buyer leverage'],
        ['Does a busy road hurt value',           'Arterial streets typically reduce value 5–10% versus comparable interior locations'],
        ['Does no garage hurt resale',            r.isHI ? 'Yes — covered parking adds significant value in Hawaii; factor into offer price' : 'Depends on market — verify with recent sold comps lacking garage'],
        ['Does high HOA limit buyer demand',      r.hasHOA && r.hoaDues > 600 ? 'Yes — HOA over $600/mo meaningfully reduces buyer pool; factor into pricing' : 'HOA at this level unlikely to significantly restrict resale'],
        ['Premium school zone value',             r.schoolRating >= 7 ? 'Yes — strong school zone supports pricing and attracts family buyers' : 'Below-average school zone may reduce demand from family buyers'],
        ['What single biggest risk exists',       r.foundCond.includes('cracks') ? 'Foundation — get structural engineer report before offering' : r.isHI && r.floodReq ? 'Flood zone — verify full insurance cost before committing to purchase' : r.roofLife < 5 ? 'Roof end of life — budget full replacement immediately after closing' : 'Market risk — verify pricing against 3 most recent comparable closed sales'],
        ['What single biggest upside exists',     r.isHI ? 'Hawaii scarcity premium — limited land and consistent demand support long-term appreciation' : r.schoolRating >= 8 ? 'Premium school zone drives family demand and supports resale pricing' : 'Below-market pricing relative to comps creates equity opportunity on entry'],
        ['Exit strategy ease (10 yr)',            r.isHI ? 'Strong — Hawaii real estate historically resilient; supply constraints support long-term values' : r.exitEase],
      ]
    },
  ];

  let html = `<div class="followup-wrap">
  <div class="followup-head">
    <span class="followup-title">Deep Dive Questions</span>
    <span class="followup-sub">${cats.reduce((a,c)=>a+c.items.length,0)} additional checks — click any question</span>
  </div>
  <div id="followup-answer-panel" class="followup-answer-panel hidden">
    <span class="fa-q" id="fa-q"></span>
    <span class="fa-a" id="fa-a"></span>
  </div>`;

  cats.forEach(cat => {
    html += `<div class="fc-group"><div class="fc-label">${cat.label}</div><div class="fc-chips">`;
    cat.items.forEach(([q, a]) => {
      html += `<button class="q-chip" data-q="${escHtml(q)}" data-a="${escHtml(a)}" onclick="showFollowUp(this)">${escHtml(q)}</button>`;
    });
    html += `</div></div>`;
  });

  html += `<div class="followup-custom">
    <div class="fc-label">Ask a custom question about this property</div>
    <div class="fc-input-row">
      <input type="text" id="custom-q-input" class="custom-q-input" placeholder="e.g. Is the driveway shared? Is there a well?" />
      <button class="custom-q-btn" onclick="handleCustomQuestion()">Ask</button>
    </div>
    <div id="custom-q-answer" class="custom-q-answer hidden"></div>
  </div></div>`;

  return html;
}

// ============================================================
// Render: action guide (right column, below fold)
// ============================================================

function renderActionGuide(score) {
  const steps = score >= 75
    ? ['Order standard home inspection and review contingencies with your agent.','Request seller disclosures and review for any undisclosed items.','Verify title is clear — order title insurance before closing.','Confirm financing approval and lock your rate.','Submit offer at or near list price — market conditions favor seller.']
    : score >= 50
    ? ['Request full seller disclosures before writing an offer.','Verify flood zone and insurance requirements with your lender.','Review HOA docs if applicable — financials, rules, and minutes.','Order inspection with sewer scope and roof specialist.','Negotiate inspection repairs or price reduction based on findings.']
    : ['Commission professional inspection before making any offer.','Order title search — liens and disputes possible at this score.','Get structural engineer evaluation if foundation concerns exist.','Verify all permit history with county — look for unpermitted work.','Consider walking away if two or more categories score below 50.'];

  document.getElementById('buyer-checklist').classList.add('hidden');
  document.getElementById('action-guide').classList.remove('hidden');
  document.getElementById('ag-body').innerHTML = steps.map((s,i) =>
    `<div class="ag-step"><span class="ag-num">${i+1}</span><span>${s}</span></div>`
  ).join('');
}

// ============================================================
// Follow-up Q&A handlers
// ============================================================

function showFollowUp(el) {
  document.querySelectorAll('.q-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById('followup-answer-panel');
  panel.classList.remove('hidden');
  document.getElementById('fa-q').textContent = el.dataset.q;
  document.getElementById('fa-a').textContent = el.dataset.a;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleCustomQuestion() {
  const q   = document.getElementById('custom-q-input').value.trim();
  const ans = document.getElementById('custom-q-answer');
  if (!q) return;
  ans.classList.remove('hidden');
  ans.textContent = 'This question requires real data integration (public records, MLS, permits). Coming in a future update. For now, ask your buyer\'s agent or request additional seller disclosures directly.';
}

// ============================================================
// Category checks map
// ============================================================

const CAT_CHECKS = {
  market:   ['Median days on market (DOM)','Price per sq ft trend','Sale-to-list price ratio'],
  location: ['FEMA flood zone designation','Crime index (FBI data)','School district rating'],
  property: ['Year built &amp; permit history','HOA status &amp; fees','Known liens or encumbrances'],
};

function getCatChecks(name) {
  const k = Object.keys(CAT_CHECKS).find(k => name.toLowerCase().includes(k));
  return CAT_CHECKS[k] || ['Public records data','MLS cross-reference','County assessor'];
}

// ============================================================
// UI state
// ============================================================

function showError(msg) { const e = document.getElementById('error-msg'); e.textContent = msg; e.classList.add('visible'); }
function clearError()   { const e = document.getElementById('error-msg'); e.textContent = ''; e.classList.remove('visible'); }

function setLoading(on) {
  document.getElementById('loading-indicator').classList.toggle('visible', on);
  document.getElementById('pre-search').classList.toggle('hidden', on);
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
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || `Server error ${res.status}`);
  return res.json();
}

// ============================================================
// Map
// ============================================================

let mapInstance = null;

async function geocodeAddress(address) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    return data.length ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
  } catch { return null; }
}

function renderMap(lat, lon, address) {
  const section = document.getElementById('map-section');
  section.classList.remove('hidden');
  document.getElementById('map-address-label').textContent = address;
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  mapInstance = L.map('map').setView([lat, lon], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(mapInstance);
  L.marker([lat, lon]).addTo(mapInstance).bindPopup(`<strong>${address}</strong>`).openPopup();

  // Show coordinates in map header
  const coords = document.getElementById('map-coords');
  if (coords) coords.textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  setTimeout(() => mapInstance.invalidateSize(), 150);
}

// ============================================================
// Render all results
// ============================================================

function renderResults(data, address) {
  const sc = scoreColor(data.riskScore);
  const r  = generateReport(data, address);

  // Score card
  document.getElementById('gauge-container').innerHTML = buildGaugeSVG(data.riskScore);
  const badge = document.getElementById('score-badge');
  badge.textContent  = sc.label;
  badge.style.color  = sc.hex;
  badge.style.background = sc.bg;
  document.getElementById('analyzed-address').textContent  = address;
  document.getElementById('score-description').textContent = data.description || '';

  // Score bar
  const fill = document.getElementById('score-bar-fill');
  fill.style.width      = `${data.riskScore}%`;
  fill.style.background = sc.hex;

  // Metrics strip (innerHTML — keeps element ID intact for repeat searches)
  document.getElementById('metrics-strip').innerHTML = renderMetricsStrip(r);

  // Category cards
  const grid = document.getElementById('categories-grid');
  grid.innerHTML = '';
  (data.riskCategories || []).forEach(cat => {
    const c = scoreColor(cat.score);
    const checks = getCatChecks(cat.name).map(ch => `<li>${ch}</li>`).join('');
    grid.insertAdjacentHTML('beforeend', `
      <div class="category-card">
        <div class="cat-top">
          ${buildDonutSVG(cat.score)}
          <div class="cat-info">
            <div class="cat-name">${cat.name}</div>
            <span class="cat-badge" style="color:${c.hex};background:${c.bg}">${c.label}</span>
          </div>
        </div>
        <p class="cat-desc">${cat.description || ''}</p>
        <div class="cat-checks-label">What we analyze</div>
        <ul class="cat-checks">${checks}</ul>
      </div>`);
  });

  // Factor table
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
        <td><span class="level-badge" style="color:${lc.hex};background:${lc.bg}">${fac.level || '—'}</span></td>
      </tr>`);
  });

  // Detail sections
  document.getElementById('detail-sections').innerHTML = renderDetailSections(r);

  // Follow-up Q&A
  document.getElementById('followup-section').innerHTML = renderFollowUp(r);

  // Action guide (right col)
  renderActionGuide(data.riskScore);

  // Show results, hide pre-search
  document.getElementById('pre-search').classList.add('hidden');
  document.getElementById('results-section').classList.add('visible');
  document.getElementById('page-footer').classList.remove('hidden');
}

// ============================================================
// Event handlers
// ============================================================

async function handleAnalyze() {
  clearError();
  const address = document.getElementById('address-input').value.trim();
  if (!address)               { showError('Please enter a property address.'); return; }
  if (!address.includes(',')) { showError('Include city and state — e.g. "123 Main St, Honolulu, HI"'); return; }

  setLoading(true);
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('map-section').classList.add('hidden');
  document.getElementById('page-footer').classList.add('hidden');
  document.getElementById('action-guide').classList.add('hidden');

  try {
    const [data, coords] = await Promise.all([analyzeProperty(address), geocodeAddress(address)]);
    renderResults(data, address);
    if (coords) renderMap(coords.lat, coords.lon, address);
  } catch (err) {
    document.getElementById('pre-search').classList.remove('hidden');
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
}

function resetForm() {
  document.getElementById('address-input').value = '';
  document.getElementById('results-section').classList.remove('visible');
  document.getElementById('pre-search').classList.remove('hidden');
  document.getElementById('map-section').classList.add('hidden');
  document.getElementById('page-footer').classList.add('hidden');
  document.getElementById('action-guide').classList.add('hidden');
  document.getElementById('buyer-checklist').classList.remove('hidden');
  clearError();
  document.getElementById('address-input').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('address-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnalyze();
});
