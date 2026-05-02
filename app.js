const API_URL = 'https://ddpro-production.up.railway.app';

// Score → color tier
function scoreColor(score) {
  if (score >= 75) return { bar: 'bg-green-500', badge: 'bg-green-900 text-green-300', label: 'Low Risk', text: 'text-green-400' };
  if (score >= 50) return { bar: 'bg-yellow-500', badge: 'bg-yellow-900 text-yellow-300', label: 'Medium Risk', text: 'text-yellow-400' };
  return { bar: 'bg-red-500', badge: 'bg-red-900 text-red-300', label: 'High Risk', text: 'text-red-400' };
}

// Factor level → color
function levelColor(level) {
  switch ((level || '').toLowerCase()) {
    case 'excellent': return { bar: 'bg-green-500', badge: 'bg-green-900 text-green-300' };
    case 'good':      return { bar: 'bg-blue-500',  badge: 'bg-blue-900 text-blue-300' };
    case 'average':   return { bar: 'bg-yellow-500', badge: 'bg-yellow-900 text-yellow-300' };
    case 'poor':      return { bar: 'bg-red-500',   badge: 'bg-red-900 text-red-300' };
    default:          return { bar: 'bg-gray-500',  badge: 'bg-gray-700 text-gray-300' };
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() {
  const el = document.getElementById('error-msg');
  el.textContent = '';
  el.classList.add('hidden');
}

function setLoading(on) {
  document.getElementById('loading-section').classList.toggle('hidden', !on);
  document.getElementById('analyze-btn').disabled = on;
  document.getElementById('analyze-btn').textContent = on ? 'Analyzing...' : 'Analyze Property';
}

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

function renderResults(data, address) {
  // Overall score
  const sc = scoreColor(data.riskScore);
  document.getElementById('score-number').textContent = data.riskScore;
  document.getElementById('score-number').className = `text-6xl font-bold ${sc.text}`;
  document.getElementById('score-badge').textContent = sc.label;
  document.getElementById('score-badge').className = `px-3 py-1 rounded-full text-sm font-semibold ${sc.badge}`;
  document.getElementById('score-bar').className = `h-3 rounded-full transition-all duration-700 ${sc.bar}`;
  document.getElementById('score-bar').style.width = `${data.riskScore}%`;
  document.getElementById('score-description').textContent = data.summary || '';
  document.getElementById('analyzed-address').textContent = address;

  // Categories
  const catList = document.getElementById('categories-list');
  catList.innerHTML = '';
  (data.riskCategories || []).forEach(cat => {
    const c = scoreColor(cat.score);
    catList.insertAdjacentHTML('beforeend', `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium">${cat.name}</span>
          <div class="flex items-center gap-3">
            <span class="text-sm ${c.text} font-semibold">${cat.score}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}">${c.label}</span>
          </div>
        </div>
        <div class="w-full bg-gray-800 rounded-full h-2 mb-1">
          <div class="h-2 rounded-full ${c.bar}" style="width:${cat.score}%"></div>
        </div>
        <p class="text-gray-400 text-sm">${cat.description || ''}</p>
      </div>
    `);
  });

  // Factors
  const facList = document.getElementById('factors-list');
  facList.innerHTML = '';
  (data.riskFactors || []).forEach(fac => {
    const lc = levelColor(fac.level);
    // Normalize factor score to 0–100 if needed
    const pct = fac.score != null ? Math.min(100, Math.max(0, fac.score)) : 50;
    facList.insertAdjacentHTML('beforeend', `
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">${fac.name}</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium ${lc.badge}">${fac.level || ''}</span>
        </div>
        <div class="w-full bg-gray-800 rounded-full h-1.5">
          <div class="h-1.5 rounded-full ${lc.bar}" style="width:${pct}%"></div>
        </div>
      </div>
    `);
  });

  // Show results
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('results-section').classList.add('results-fade-in');
}

async function handleAnalyze() {
  clearError();
  const address = document.getElementById('address-input').value.trim();

  if (!address) {
    showError('Please enter a property address.');
    return;
  }
  if (!address.includes(',')) {
    showError('Please include city and state — e.g. "123 Main St, Honolulu, HI".');
    return;
  }

  setLoading(true);
  document.getElementById('results-section').classList.add('hidden');

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
  document.getElementById('results-section').classList.add('hidden');
  clearError();
  document.getElementById('address-input').focus();
}

// Allow Enter key to submit
document.getElementById('address-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnalyze();
});
