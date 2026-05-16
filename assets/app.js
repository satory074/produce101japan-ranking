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

function rankColorClass(rank) {
  if (rank == null) return 'bg-gray-200 text-gray-500';
  if (rank === 1) return 'rank-1 text-yellow-900';
  if (rank === 2) return 'rank-2 text-gray-800';
  if (rank === 3) return 'rank-3 text-yellow-50';
  if (rank <= 11) return 'bg-yellow-400 text-yellow-900';
  if (rank <= 20) return 'bg-gray-300 text-gray-800';
  if (rank <= 50) return 'bg-amber-700 text-amber-50';
  return 'bg-gray-700 text-white';
}

function rankBadge(trainee) {
  const rank = trainee.rank;
  const label = rank == null ? '—' : rank;
  return `<span class="font-display text-xs font-black px-2 py-0.5 rounded ${rankColorClass(rank)}">${label}</span>`;
}

function historyCell(rank) {
  if (rank == null) {
    return `<td class="text-center px-1.5 py-1 border-b border-gray-100 text-gray-300">—</td>`;
  }
  return `<td class="text-center px-1.5 py-1 border-b border-gray-100"><span class="font-display text-[11px] font-black px-1.5 py-0.5 rounded ${rankColorClass(rank)} inline-block min-w-[26px]">${rank}</span></td>`;
}

function historyHeaderCell(milestone, isActiveSort, dir) {
  const arrow = isActiveSort ? (dir === 'asc' ? '▲' : '▼') : '';
  const activeCls = isActiveSort ? 'text-gray-900 font-black' : 'text-gray-600';
  const ceremonyCls = milestone.ceremony ? 'border-b-2 border-pink-300' : 'border-b border-gray-200';
  return `<th data-mkey="${escapeHtml(milestone.key)}" title="${escapeHtml(milestone.label)}"
    class="cursor-pointer select-none whitespace-nowrap px-2 py-2 text-xs ${activeCls} ${ceremonyCls} bg-gray-50 hover:bg-gray-100 transition-colors">
    <span class="font-display tracking-wide">${escapeHtml(milestone.short || milestone.label)}</span>
    <span class="ml-0.5 text-[9px] text-gray-400">${arrow}</span>
  </th>`;
}

function renderRankingHistoryTable(trainees, milestones, urlTemplate) {
  const latestKey = milestones[milestones.length - 1].key;
  const headerRow = `
    <tr>
      <th class="sticky left-0 z-20 bg-gray-50 text-left px-3 py-2 border-b border-r border-gray-200 min-w-[180px] cursor-pointer hover:bg-gray-100 transition-colors" data-mkey="__name__">
        <span class="text-xs text-gray-700">名前</span>
      </th>
      ${milestones.map(m => historyHeaderCell(m, m.key === latestKey, 'asc')).join('')}
    </tr>`;
  const bodyRows = buildHistoryRows(trainees, milestones, urlTemplate, latestKey, 'asc');
  return `
    <div class="overflow-x-auto -mx-1 sm:mx-0 rounded-lg ring-1 ring-gray-200 bg-white">
      <table class="min-w-full border-separate border-spacing-0 text-xs">
        <thead>${headerRow}</thead>
        <tbody class="history-tbody">${bodyRows}</tbody>
      </table>
    </div>
    <p class="text-[11px] text-gray-500 mt-2">
      ヘッダをクリックで並び替え。
      <span class="inline-block w-2 h-2 bg-pink-300 align-middle mr-1"></span>順位発表式列
    </p>
  `;
}

function buildHistoryRows(trainees, milestones, urlTemplate, sortKey, dir) {
  const sorted = sortTraineesForHistory(trainees, sortKey, dir);
  return sorted.map(t => historyRowHtml(t, milestones, urlTemplate)).join('');
}

function historyRowHtml(trainee, milestones, urlTemplate) {
  const img = buildImageUrl(urlTemplate, trainee);
  const nameJp = escapeHtml(trainee.name_jp || trainee.name_romaji || '?');
  const nameRomaji = escapeHtml(trainee.name_romaji || '');
  const stage = trainee.stage_name ? `<span class="text-[10px] text-gray-400 ml-1 font-display">(${escapeHtml(trainee.stage_name)})</span>` : '';
  const initials = (trainee.name_romaji || trainee.name_jp || '?').slice(0, 1).toUpperCase();
  const imgHtml = img
    ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" referrerpolicy="no-referrer"
            class="w-7 h-7 rounded-full object-cover bg-gray-200"
            onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600',textContent:'${escapeHtml(initials)}'}))" />`
    : `<div class="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">${escapeHtml(initials)}</div>`;
  const cells = milestones.map(m => {
    const r = trainee.rank_history ? trainee.rank_history[m.key] : undefined;
    return historyCell(r === undefined ? null : r);
  }).join('');
  return `
    <tr class="hover:bg-gray-50">
      <td class="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-1.5 border-b border-r border-gray-100 min-w-[180px]">
        <div class="flex items-center gap-2">
          ${imgHtml}
          <div class="min-w-0">
            <div class="text-xs font-bold truncate">${nameJp}${stage}</div>
            <div class="text-[10px] text-gray-500 font-display truncate">${nameRomaji}</div>
          </div>
        </div>
      </td>
      ${cells}
    </tr>
  `;
}

function sortTraineesForHistory(trainees, sortKey, dir) {
  const mult = dir === 'desc' ? -1 : 1;
  const arr = [...trainees];
  if (sortKey === '__name__') {
    arr.sort((a, b) => mult * (a.name_romaji || '').localeCompare(b.name_romaji || '', 'ja'));
    return arr;
  }
  arr.sort((a, b) => {
    const av = a.rank_history ? a.rank_history[sortKey] : undefined;
    const bv = b.rank_history ? b.rank_history[sortKey] : undefined;
    const an = (av === undefined || av === null) ? Infinity : av;
    const bn = (bv === undefined || bv === null) ? Infinity : bv;
    if (an === bn) return (a.rank ?? 999) - (b.rank ?? 999);
    return mult * (an - bn);
  });
  return arr;
}

function bindSubtabs(panel) {
  const buttons = panel.querySelectorAll('.subtab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.subtab;
      buttons.forEach(b => {
        const active = b.dataset.subtab === target;
        b.setAttribute('aria-selected', active ? 'true' : 'false');
        b.classList.toggle('bg-white', active);
        b.classList.toggle('shadow', active);
        b.classList.toggle('text-gray-900', active);
        b.classList.toggle('text-gray-500', !active);
      });
      panel.querySelectorAll('.subpanel').forEach(sp => {
        sp.classList.toggle('hidden', sp.dataset.subpanel !== target);
      });
    });
  });
}

function bindHistorySorting(panel, trainees, milestones, urlTemplate) {
  const tbody = panel.querySelector('.history-tbody');
  if (!tbody) return;
  const latestKey = milestones[milestones.length - 1].key;
  panel._historySort = { key: latestKey, dir: 'asc' };
  panel.querySelectorAll('.subpanel-history thead th[data-mkey]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.mkey;
      const cur = panel._historySort;
      const dir = (cur.key === key && cur.dir === 'asc') ? 'desc' : 'asc';
      panel._historySort = { key, dir };
      tbody.innerHTML = buildHistoryRows(trainees, milestones, urlTemplate, key, dir);
      panel.querySelectorAll('.subpanel-history thead th[data-mkey]').forEach(h => {
        const isActive = h.dataset.mkey === key;
        const arrow = isActive ? (dir === 'asc' ? '▲' : '▼') : '';
        const arrowEl = h.querySelector('span:last-child');
        if (arrowEl) arrowEl.textContent = arrow;
        h.classList.toggle('text-gray-900', isActive);
        h.classList.toggle('font-black', isActive);
        h.classList.toggle('text-gray-600', !isActive);
      });
    });
  });
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

  const milestones = Array.isArray(data.ranking_milestones) ? data.ranking_milestones : [];
  const showHistoryTab = milestones.length > 0;

  const subtabBarHtml = showHistoryTab ? `
    <nav class="subtab-bar inline-flex bg-gray-100 rounded-lg p-1 mb-4 text-sm" role="tablist">
      <button class="subtab-btn px-4 py-1.5 rounded-md bg-white shadow text-gray-900 font-bold transition-colors" data-subtab="grid" role="tab" aria-selected="true">練習生一覧</button>
      <button class="subtab-btn px-4 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors" data-subtab="history" role="tab" aria-selected="false">順位推移表</button>
    </nav>
  ` : '';

  panel.innerHTML = `
    <section class="mb-4">
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
    </section>

    ${subtabBarHtml}

    <div class="subpanel subpanel-grid" data-subpanel="grid">
      <div class="mb-4 flex flex-wrap gap-2 items-center">
        <div class="relative flex-1 min-w-[200px] max-w-md">
          <input type="search" placeholder="名前で検索..." class="search-input w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${cfg.color}-500" />
          <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" class="filter-debuted accent-yellow-500" />
          <span>デビュー組のみ</span>
        </label>
      </div>

      <div class="trainee-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
        ${trainees.map(t => traineeCard(t, panelId, urlTemplate)).join('')}
      </div>
      <p class="empty-msg hidden text-center py-12 text-gray-400 text-sm">該当する練習生が見つかりません</p>
    </div>

    ${showHistoryTab ? `<div class="subpanel subpanel-history hidden" data-subpanel="history">
      ${renderRankingHistoryTable(trainees, milestones, urlTemplate)}
    </div>` : ''}
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

  if (showHistoryTab) {
    bindSubtabs(panel);
    bindHistorySorting(panel, trainees, milestones, urlTemplate);
  }
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
