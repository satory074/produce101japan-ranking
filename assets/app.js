'use strict';

const CDN_BASE = 'https://web-m.webcdn.stream.ne.jp/www09/web-m/produce101.jp/shared/img/profile';
const DEFAULT_IMAGE_TEMPLATE = {
  season1:  `${CDN_BASE}/{image_id}.jpg`,
  season2:  `${CDN_BASE}/{image_id}.jpg`,
  thegirls: `${CDN_BASE}/{image_id}.jpg`,
  shinsekai:`${CDN_BASE}/{image_id}.jpg`,
};

const SEASON_CONFIG = {
  season1:  { color: 's1', accentClass: 'from-orange-500 to-orange-700', textClass: 'text-s1-700', bgClass: 'bg-s1-50', borderClass: 'border-s1-500' },
  season2:  { color: 's2', accentClass: 'from-blue-500 to-blue-700',     textClass: 'text-s2-700', bgClass: 'bg-s2-50', borderClass: 'border-s2-500' },
  thegirls: { color: 's3', accentClass: 'from-pink-500 to-pink-700',     textClass: 'text-s3-700', bgClass: 'bg-s3-50', borderClass: 'border-s3-500' },
  shinsekai:{ color: 's4', accentClass: 'from-purple-500 to-purple-700', textClass: 'text-s4-700', bgClass: 'bg-s4-50', borderClass: 'border-s4-500' },
};

const SEASON_FILES = {
  season1:  './data/season1.json',
  season2:  './data/season2.json',
  thegirls: './data/thegirls.json',
  shinsekai:'./data/shinsekai.json',
};

const seasonData = {};

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ja-JP') : '—');

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function buildImageUrl(template, trainee) {
  if (trainee.image_url) return trainee.image_url;
  if (!template || !trainee.image_id) return null;
  return template.replace('{image_id}', trainee.image_id);
}

function rankBadge(trainee) {
  const rank = trainee.rank;
  if (rank == null) return '<span class="font-display text-xs font-black px-2 py-0.5 rounded bg-gray-200 text-gray-500">—</span>';
  let cls = 'bg-gray-700 text-white';
  if (rank === 1) cls = 'rank-1 text-yellow-900';
  else if (rank === 2) cls = 'rank-2 text-gray-800';
  else if (rank === 3) cls = 'rank-3 text-yellow-50';
  else if (rank <= 11) cls = 'bg-yellow-400 text-yellow-900';
  else if (rank <= 20) cls = 'bg-gray-300 text-gray-800';
  else if (rank <= 50) cls = 'bg-amber-700 text-amber-50';
  return `<span class="font-display text-xs font-black px-2 py-0.5 rounded ${cls}">${rank}</span>`;
}

function traineeCard(trainee, season, urlTemplate) {
  const img = buildImageUrl(urlTemplate, trainee);
  const debuted = trainee.debuted === true;
  const ringCls = debuted ? 'card-debuted' : 'shadow-sm';
  const nameJp = escapeHtml(trainee.name_jp || trainee.name_romaji || '?');
  const nameRomaji = escapeHtml(trainee.name_romaji || '');
  const initials = (trainee.name_romaji || trainee.name_jp || '?').slice(0, 1).toUpperCase();
  const votes = trainee.votes_final;
  const stageName = trainee.stage_name ? `<div class="text-[10px] text-gray-500 font-display tracking-wider truncate">${escapeHtml(trainee.stage_name)}</div>` : '';

  const imgHtml = img
    ? `<img src="${escapeHtml(img)}" alt="${nameJp}" loading="lazy" referrerpolicy="no-referrer"
            class="absolute inset-0 w-full h-full object-cover"
            onerror="this.style.display='none'; this.parentNode.classList.add('img-fallback');" />`
    : '';

  return `
    <article class="trainee-card group relative bg-white rounded-xl overflow-hidden ${ringCls} hover:shadow-xl transition-all hover:-translate-y-1"
             data-name="${nameJp.toLowerCase()} ${nameRomaji.toLowerCase()}" data-rank="${trainee.rank ?? 999}">
      <div class="relative aspect-[3/4] bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center text-gray-400 font-display text-4xl font-black select-none">
          ${escapeHtml(initials)}
        </div>
        ${imgHtml}
        <div class="absolute top-1.5 left-1.5">${rankBadge(trainee)}</div>
        ${debuted ? '<div class="absolute top-1.5 right-1.5 bg-yellow-400 text-yellow-900 text-[9px] font-display font-black px-1.5 py-0.5 rounded">DEBUT</div>' : ''}
      </div>
      <div class="p-2 sm:p-2.5">
        <div class="font-bold text-xs sm:text-sm truncate" title="${nameJp}">${nameJp}</div>
        <div class="text-[10px] sm:text-xs text-gray-500 truncate font-display">${nameRomaji}</div>
        ${stageName}
        ${typeof votes === 'number'
          ? `<div class="text-[10px] sm:text-xs text-gray-600 mt-1 font-display">${fmt(votes)} <span class="text-gray-400">votes</span></div>`
          : ''}
      </div>
    </article>
  `;
}

function buildPanel(panelId, data) {
  const cfg = SEASON_CONFIG[panelId];
  const panel = document.getElementById(panelId);
  if (!panel) return;

  if (!data || !data.trainees) {
    panel.innerHTML = `<div class="text-center py-20 text-gray-400">データ読み込み失敗</div>`;
    return;
  }

  const trainees = [...data.trainees].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const urlTemplate = data.image_url_template || DEFAULT_IMAGE_TEMPLATE[panelId];
  const debutCount = trainees.filter(t => t.debuted).length;

  const onAirBadge = data.ongoing
    ? `<span class="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full"><span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse-slow"></span>放送中</span>`
    : '';
  const updateInfo = data.last_updated_episode ? `<span class="text-xs text-gray-500">${escapeHtml(data.last_updated_episode)} 時点</span>` : '';

  panel.innerHTML = `
    <section class="mb-6">
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <h2 class="font-display text-2xl sm:text-3xl font-black bg-gradient-to-r ${cfg.accentClass} bg-clip-text text-transparent">${escapeHtml(data.season || panelId)}</h2>
        ${onAirBadge}
        ${updateInfo}
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
        <div><span class="text-gray-400">放送:</span> ${escapeHtml(data.air_dates || '—')}</div>
        ${data.debut_group ? `<div><span class="text-gray-400">デビュー組:</span> <span class="font-bold ${cfg.textClass}">${escapeHtml(data.debut_group)}</span> (${debutCount}名)</div>` : ''}
        <div><span class="text-gray-400">練習生数:</span> ${data.total_trainees ?? trainees.length}名</div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 items-center">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <input type="search" placeholder="名前で検索..." class="search-input w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${cfg.color}-500" />
          <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" class="filter-debuted accent-yellow-500" />
          <span>デビュー組のみ</span>
        </label>
      </div>
    </section>

    <div class="trainee-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
      ${trainees.map(t => traineeCard(t, panelId, urlTemplate)).join('')}
    </div>
    <p class="empty-msg hidden text-center py-12 text-gray-400 text-sm">該当する練習生が見つかりません</p>
  `;

  const grid = panel.querySelector('.trainee-grid');
  const emptyMsg = panel.querySelector('.empty-msg');
  const searchInput = panel.querySelector('.search-input');
  const debutFilter = panel.querySelector('.filter-debuted');

  const applyFilter = () => {
    const q = searchInput.value.trim().toLowerCase();
    const debutOnly = debutFilter.checked;
    let shown = 0;
    grid.querySelectorAll('.trainee-card').forEach(card => {
      const name = card.dataset.name || '';
      const rank = Number(card.dataset.rank);
      const matchName = !q || name.includes(q);
      const matchDebut = !debutOnly || (rank <= 11);
      const show = matchName && matchDebut;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    emptyMsg.classList.toggle('hidden', shown > 0);
  };
  searchInput.addEventListener('input', applyFilter);
  debutFilter.addEventListener('change', applyFilter);
}

function activateTab(target) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === target;
    btn.classList.toggle('text-gray-500', !isActive);
    btn.classList.toggle('border-transparent', !isActive);
    if (isActive) {
      const cfg = SEASON_CONFIG[target];
      btn.classList.add(`text-${cfg.color}-700`, `border-${cfg.color}-500`);
    } else {
      Object.values(SEASON_CONFIG).forEach(c => {
        btn.classList.remove(`text-${c.color}-700`, `border-${c.color}-500`);
      });
    }
  });
  document.querySelectorAll('.season-panel').forEach(p => p.classList.toggle('hidden', p.id !== target));
  history.replaceState(null, '', `#${target}`);
}

async function loadSeason(key) {
  try {
    const res = await fetch(SEASON_FILES[key], { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    seasonData[key] = await res.json();
  } catch (err) {
    console.error(`Failed to load ${key}:`, err);
    seasonData[key] = null;
  }
  buildPanel(key, seasonData[key]);
}

async function init() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.jump);
      document.querySelector('main').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const initial = (location.hash || '#season1').slice(1);
  activateTab(SEASON_FILES[initial] ? initial : 'season1');

  await Promise.all(Object.keys(SEASON_FILES).map(loadSeason));

  const latest = Object.values(seasonData)
    .filter(d => d && d.last_updated)
    .map(d => d.last_updated)
    .sort()
    .pop();
  if (latest) document.getElementById('last-updated').textContent = latest;
}

document.addEventListener('DOMContentLoaded', init);
