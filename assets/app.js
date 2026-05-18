'use strict';

const CDN_BASE = 'https://web-m.webcdn.stream.ne.jp/www09/web-m/produce101.jp/shared/img/profile';
const DEFAULT_IMAGE_TEMPLATE = {
  season1:  `${CDN_BASE}/{image_id}.jpg`,
  season2:  `${CDN_BASE}/{image_id}.jpg`,
  thegirls: `${CDN_BASE}/{image_id}.jpg`,
  shinsekai:`${CDN_BASE}/{image_id}.jpg`,
};

const SEASON_CONFIG = {
  season1:  { color: 's1', tw: 'orange', label: 'SEASON 1',  short: 'S1',    accentClass: 'from-orange-500 to-orange-700', textClass: 'text-s1-700', bgClass: 'bg-s1-50', borderClass: 'border-s1-500' },
  season2:  { color: 's2', tw: 'blue',   label: 'SEASON 2',  short: 'S2',    accentClass: 'from-blue-500 to-blue-700',     textClass: 'text-s2-700', bgClass: 'bg-s2-50', borderClass: 'border-s2-500' },
  thegirls: { color: 's3', tw: 'pink',   label: 'THE GIRLS', short: 'GIRLS', accentClass: 'from-pink-500 to-pink-700',     textClass: 'text-s3-700', bgClass: 'bg-s3-50', borderClass: 'border-s3-500' },
  shinsekai:{ color: 's4', tw: 'purple', label: 'SHINSEKAI', short: 'NEW',   accentClass: 'from-purple-500 to-purple-700', textClass: 'text-s4-700', bgClass: 'bg-s4-50', borderClass: 'border-s4-500' },
};

// 公式サイト個別プロフィールページ URL テンプレート (シーズン毎にパス構造が異なる)
// - SEASON 1:  /profile/?id={image_id}        (クエリベース)
// - SEASON 2:  /profile/{image_id}            (パスベース)
// - THE GIRLS: /profile/detail/?id={image_id} (新サイト共通の detail SPA ルート)
// - SHINSEKAI: /profile/detail/?id={image_id} (同上)
const PROFILE_URL_TEMPLATE = {
  season1:  'https://1st.produce101.jp/profile/?id={image_id}',
  season2:  'https://2nd.produce101.jp/profile/{image_id}',
  thegirls: 'https://3rd.produce101.jp/profile/detail/?id={image_id}',
  shinsekai:'https://produce101.jp/profile/detail/?id={image_id}',
};

function buildProfileUrl(seasonId, imageId) {
  const tpl = PROFILE_URL_TEMPLATE[seasonId];
  if (!tpl || !imageId) return null;
  return tpl.replace('{image_id}', encodeURIComponent(imageId));
}

const SEASON_FILES = {
  season1:  './data/season1.json',
  season2:  './data/season2.json',
  thegirls: './data/thegirls.json',
  shinsekai:'./data/shinsekai.json',
};

const seasonData = {};

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ja-JP') : '—');

// Lightweight debounce: trailing-call only (一般的な検索入力用途に十分)
function debounce(fn, wait = 150) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function buildImageUrl(template, trainee) {
  if (trainee.image_url) return trainee.image_url;
  if (!template || !trainee.image_id) return null;
  return template.replace('{image_id}', trainee.image_id);
}

function rankColorClass(rank, debutCap = 11) {
  if (rank == null) return 'bg-gray-200 text-gray-500';
  if (rank <= debutCap) return 'bg-yellow-400 text-yellow-900';
  if (rank <= 20) return 'bg-gray-300 text-gray-800';
  if (rank <= 50) return 'bg-amber-700 text-amber-50';
  return 'bg-gray-700 text-white';
}

function rankBadge(trainee, debutCap = 11) {
  const rank = trainee.rank;
  const label = rank == null ? '—' : rank;
  return `<span class="font-display text-xs font-black px-2 py-0.5 rounded ${rankColorClass(rank, debutCap)}">${label}</span>`;
}

function historyCell(rank, debutCap = 11) {
  if (rank == null) {
    return `<td class="text-center px-1.5 py-1 border-b border-gray-100 text-gray-300">—</td>`;
  }
  return `<td class="text-center px-1.5 py-1 border-b border-gray-100"><span class="font-display text-[11px] font-black px-1.5 py-0.5 rounded ${rankColorClass(rank, debutCap)} inline-block min-w-[26px]">${rank}</span></td>`;
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

function renderRankingHistoryTable(trainees, milestones, urlTemplate, seasonId, debutCap = 11) {
  const latestKey = milestones[milestones.length - 1].key;
  const headerRow = `
    <tr>
      <th class="sticky left-0 z-20 bg-gray-50 text-left px-3 py-2 border-b border-r border-gray-200 min-w-[180px] cursor-pointer hover:bg-gray-100 transition-colors" data-mkey="__name__">
        <span class="text-xs text-gray-700">名前</span>
      </th>
      ${milestones.map(m => historyHeaderCell(m, m.key === latestKey, 'asc')).join('')}
    </tr>`;
  const bodyRows = buildHistoryRows(trainees, milestones, urlTemplate, latestKey, 'asc', seasonId, debutCap);
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

function buildHistoryRows(trainees, milestones, urlTemplate, sortKey, dir, seasonId, debutCap = 11) {
  const sorted = sortTraineesForHistory(trainees, sortKey, dir);
  return sorted.map(t => historyRowHtml(t, milestones, urlTemplate, seasonId, debutCap)).join('');
}

function historyRowHtml(trainee, milestones, urlTemplate, seasonId, debutCap = 11) {
  const img = buildImageUrl(urlTemplate, trainee);
  const cfg = SEASON_CONFIG[seasonId] || {};
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
    return historyCell(r === undefined ? null : r, debutCap);
  }).join('');
  const profileUrl = buildProfileUrl(seasonId, trainee.image_id);
  const nameHtml = profileUrl
    ? `<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer"
          class="hover:underline hover:text-${cfg.tw || 'gray'}-600 transition-colors"
          title="公式プロフィール: ${nameJp} (新しいタブで開く)">${nameJp}</a>`
    : nameJp;
  return `
    <tr class="hover:bg-gray-50">
      <td class="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-1.5 border-b border-r border-gray-100 min-w-[180px]">
        <div class="flex items-center gap-2">
          ${imgHtml}
          <div class="min-w-0">
            <div class="text-xs font-bold truncate">${nameHtml}${stage}</div>
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

function bindHistorySorting(panel, trainees, milestones, urlTemplate, seasonId, debutCap = 11) {
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
      tbody.innerHTML = buildHistoryRows(trainees, milestones, urlTemplate, key, dir, seasonId, debutCap);
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

// =========================================================================
// 順位推移グラフ (subpanel-chart)
// =========================================================================

// Paul Tol "Bright" 6色 (gray 除外) + ダッシュパターンで 12 通り識別
// https://personal.sron.nl/~pault/ — protanopia/deuteranopia でも区別可能
const CHART_COLORS = [
  '#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377',
];

function chartLineStyle(index) {
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const dasharray = index >= CHART_COLORS.length ? '6 4' : null;
  return { color, dasharray };
}

function defaultChartSelection(trainees, panelId) {
  const set = new Set();
  trainees.forEach(t => set.add(t.image_id));
  return set;
}

function renderTraineePicker(trainees, defaultSet, cfg, milestones, panelId) {
  const ceremonyButtons = (milestones || [])
    .filter(m => m.ceremony)
    .map(m => {
      const label = `${escapeHtml(m.short || m.key)} 生存`;
      return `<button class="chart-preset px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 hover:bg-gray-200" data-preset="survivors" data-ceremony="${escapeHtml(m.key)}">${label}</button>`;
    })
    .join('');
  const ceremonyRow = ceremonyButtons
    ? `<div class="flex flex-wrap gap-1 mb-2">${ceremonyButtons}</div>`
    : '';
  const items = trainees.map((t, i) => {
    const checked = defaultSet.has(t.image_id);
    const nameJp = escapeHtml(t.name_jp || t.name_romaji || '?');
    const nameRomaji = escapeHtml(t.name_romaji || '');
    const stage = t.stage_name ? `<span class="text-[10px] text-gray-400 ml-1">${escapeHtml(t.stage_name)}</span>` : '';
    const searchKey = `${nameJp} ${nameRomaji} ${t.stage_name || ''}`.toLowerCase();
    const profileUrl = buildProfileUrl(panelId, t.image_id);
    const profileLinkHtml = profileUrl
      ? `<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer"
            class="profile-link shrink-0 text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-${cfg.tw}-100 hover:text-${cfg.tw}-700 transition-colors leading-none"
            title="公式プロフィール: ${nameJp} (新しいタブで開く)"
            aria-label="${nameJp} の公式プロフィールを開く">↗</a>`
      : '';
    return `
      <li class="chart-picker-item flex items-center gap-1" data-search="${escapeHtml(searchKey)}">
        <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs flex-1 min-w-0">
          <input type="checkbox" class="chart-checkbox accent-${cfg.color}-500"
                 data-iid="${escapeHtml(t.image_id)}" ${checked ? 'checked' : ''} />
          <svg class="color-swatch shrink-0" width="20" height="6" data-iid-swatch="${escapeHtml(t.image_id)}"><line x1="0" y1="3" x2="20" y2="3" stroke="transparent" stroke-width="3" /></svg>
          <span class="truncate flex-1"><span class="font-bold">${nameJp}</span>${stage}</span>
        </label>
        ${profileLinkHtml}
        <button type="button" class="similar-btn shrink-0 text-[10px] px-1.5 py-0.5 rounded text-gray-500 hover:bg-${cfg.tw}-100 hover:text-${cfg.tw}-700 transition-colors"
                data-iid="${escapeHtml(t.image_id)}" data-season="${escapeHtml(panelId)}" title="この練習生と順位推移が似た練習生を表示">類似</button>
      </li>
    `;
  }).join('');

  // モバイル: details で折りたたみ (デフォルト閉) / デスクトップ: 常時展開 (open + lg:pointer-events)
  return `
    <aside class="chart-aside lg:w-64 shrink-0 bg-white border border-gray-200 rounded-lg p-3">
      <details class="chart-picker-details">
        <summary class="lg:hidden cursor-pointer text-xs font-bold text-gray-700 py-1 select-none">
          表示する練習生を選ぶ <span class="text-gray-400 font-normal">(<span class="chart-counter-inline">${trainees.length}</span>/${trainees.length})</span>
        </summary>
        <div class="mb-2 mt-2 lg:mt-0">
          <input type="search" class="chart-filter w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-${cfg.color}-500" placeholder="絞り込み..." aria-label="グラフに表示する練習生を名前で絞り込む" />
        </div>
        <div class="flex flex-wrap gap-1 mb-2">
          <button class="chart-preset px-2 py-1 text-[11px] rounded bg-${cfg.color}-50 text-${cfg.color}-700 hover:bg-${cfg.color}-100 font-bold" data-preset="debut">デビュー組</button>
          <button class="chart-preset px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 hover:bg-gray-200" data-preset="all">全選択</button>
          <button class="chart-preset px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 hover:bg-gray-200" data-preset="none">全解除</button>
        </div>
        ${ceremonyRow}
        <ul class="chart-picker max-h-[480px] overflow-y-auto pr-1 -mr-1">${items}</ul>
        <p class="chart-counter text-[10px] text-gray-500 mt-2">— / ${trainees.length} 名選択中</p>
      </details>
    </aside>
  `;
}

function shouldShowPointLabel(i, milestone, total, selectedCount) {
  if (i === 0 || i === total - 1 || milestone.ceremony) return true;
  return selectedCount <= 5;
}

// エンドポイント名ラベルの縦衝突を回避 (forward + backward pass)
function deconflictLabels(labels, opts = {}) {
  const { minGap = 11, top = 20, bottom = 412 } = opts;
  labels.sort((a, b) => a.idealY - b.idealY);
  labels.forEach(l => { l.finalY = l.idealY; });
  // Forward pass: 直前ラベルから minGap 未満なら下にずらす
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].finalY - labels[i - 1].finalY < minGap) {
      labels[i].finalY = labels[i - 1].finalY + minGap;
    }
  }
  // Backward pass: 最下が描画領域を超えたら上方向に詰め直す
  if (labels.length && labels[labels.length - 1].finalY > bottom) {
    labels[labels.length - 1].finalY = bottom;
    for (let i = labels.length - 2; i >= 0; i--) {
      if (labels[i + 1].finalY - labels[i].finalY < minGap) {
        labels[i].finalY = labels[i + 1].finalY - minGap;
      }
    }
  }
  // Top clamp: 先頭が上端超えなら下に押し戻し → 再 forward
  if (labels.length && labels[0].finalY < top) {
    labels[0].finalY = top;
    for (let i = 1; i < labels.length; i++) {
      if (labels[i].finalY - labels[i - 1].finalY < minGap) {
        labels[i].finalY = labels[i - 1].finalY + minGap;
      }
    }
  }
  return labels;
}

function buildChartSvg(selected, milestones, maxRank, debutCap = 11) {
  // チャート縦幅: 1170 の 80% で 936 (縦長すぎを緩和、ラベルは多少 deconflict で動く)
  const W = 880, H = 936;
  const padL = 48, padR = 96, padT = 20, padB = 48;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const N = milestones.length;
  const selectedCount = selected.length;

  const xAt = (i) => N === 1 ? padL + innerW / 2 : padL + (i / (N - 1)) * innerW;
  const yAt = (rank) => {
    const denom = Math.max(1, maxRank - 1);
    return padT + ((rank - 1) / denom) * innerH;
  };

  // デビュー圏ハイライト帯 (Top {debutCap})
  const debutCapClamped = Math.min(debutCap, maxRank);
  const debutBand = `
    <rect class="chart-top11-band" x="${padL}" y="${yAt(1).toFixed(1)}" width="${innerW}" height="${(yAt(debutCapClamped) - yAt(1)).toFixed(1)}" fill="#fde047" fill-opacity="0.14" />
    <text x="${padL + innerW - 4}" y="${(yAt(debutCapClamped) - 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#a16207" font-weight="bold" font-family="Orbitron,sans-serif">TOP ${debutCap} デビュー圏</text>
  `;

  // Y軸 grid (固定 10 刻み)
  const yTicks = [1];
  for (let r = 10; r < maxRank; r += 10) yTicks.push(r);
  if (yTicks[yTicks.length - 1] !== maxRank) yTicks.push(maxRank);

  const yGrid = yTicks.map(r => `
    <line x1="${padL}" y1="${yAt(r).toFixed(1)}" x2="${padL + innerW}" y2="${yAt(r).toFixed(1)}" stroke="#e5e7eb" stroke-width="1" />
    <text x="${padL - 6}" y="${yAt(r) + 3}" text-anchor="end" font-size="10" fill="#6b7280" font-family="Orbitron,sans-serif">${r}位</text>
  `).join('');

  // X軸 grid + label
  const xGrid = milestones.map((m, i) => {
    const ceremony = m.ceremony;
    const stroke = ceremony ? '#fbcfe8' : '#f3f4f6';
    const sw = ceremony ? 2 : 1;
    return `
      <line x1="${xAt(i).toFixed(1)}" y1="${padT}" x2="${xAt(i).toFixed(1)}" y2="${padT + innerH}" stroke="${stroke}" stroke-width="${sw}" />
      <text x="${xAt(i).toFixed(1)}" y="${H - 22}" text-anchor="middle" font-size="11" fill="${ceremony ? '#be185d' : '#374151'}" font-weight="${ceremony ? 'bold' : 'normal'}" font-family="Orbitron,sans-serif">${escapeHtml(m.short || m.label)}</text>
      ${m.label && m.short && m.label !== m.short ? `<text x="${xAt(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="9" fill="#9ca3af">${escapeHtml((m.label || '').slice(0, 8))}</text>` : ''}
    `;
  }).join('');

  // エンドポイント情報を後の deconflict pass のために収集
  const endpointEntries = [];

  // 各 trainee の線 (エンドポイント名は含まない)
  const lines = selected.map(({ trainee, color, dasharray }) => {
    const id = escapeHtml(trainee.image_id);
    const segments = [];
    let cur = [];
    let lastIdx = -1, lastRank = null;
    milestones.forEach((m, i) => {
      const r = trainee.rank_history?.[m.key];
      if (r == null) {
        if (cur.length) { segments.push(cur); cur = []; }
      } else {
        cur.push(`${xAt(i).toFixed(1)},${yAt(r).toFixed(1)}`);
        lastIdx = i; lastRank = r;
      }
    });
    if (cur.length) segments.push(cur);

    const dashAttr = dasharray ? ` stroke-dasharray="${dasharray}"` : '';
    const polylines = segments.map(seg =>
      `<polyline points="${seg.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${dashAttr} class="chart-line" data-iid="${id}" />`
    ).join('');

    // 点 + ○位 ラベル (密度制御)
    const points = milestones.map((m, i) => {
      const r = trainee.rank_history?.[m.key];
      if (r == null) return '';
      const cx = xAt(i).toFixed(1), cy = yAt(r).toFixed(1);
      const showLabel = shouldShowPointLabel(i, m, N, selectedCount);
      const labelHtml = showLabel
        ? `<text x="${cx}" y="${(yAt(r) - 8).toFixed(1)}" text-anchor="middle" font-size="10" fill="${color}" font-weight="bold" class="chart-label" font-family="Orbitron,sans-serif" stroke="white" stroke-width="3" paint-order="stroke">${r}位</text>`
        : '';
      return `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${color}" stroke="white" stroke-width="1.5" data-iid="${id}" />${labelHtml}`;
    }).join('');

    // エンドポイント情報を蓄積 (描画は後で deconflict 込みで)
    if (lastIdx !== -1) {
      endpointEntries.push({
        iid: trainee.image_id,
        text: (trainee.stage_name || trainee.name_jp || '').slice(0, 8),
        color,
        pointX: xAt(lastIdx),
        pointY: yAt(lastRank),
        idealY: yAt(lastRank) + 3,  // ベースライン微調整
      });
    }

    const titleText = escapeHtml(trainee.name_jp || trainee.name_romaji || trainee.image_id || '');
    return `<g data-iid="${id}" class="chart-trainee-group" style="cursor:pointer;"><title>${titleText}</title>${polylines}${points}</g>`;
  }).join('');

  // エンドポイント名は線終点と完全に同じ y で描画 (重なってもユーザー許諾済み)
  const endpointHtml = endpointEntries.map(e => {
    const labelX = e.pointX + 8;
    return `<text x="${labelX.toFixed(1)}" y="${e.idealY.toFixed(1)}" font-size="10" fill="${e.color}" font-weight="bold" class="chart-endpoint-label" data-iid="${escapeHtml(e.iid)}" font-family="Noto Sans JP,sans-serif" stroke="white" stroke-width="3" paint-order="stroke">${escapeHtml(e.text)}</text>`;
  }).join('');

  // モバイル(< sm=640px)では min-width=720px を保ち、コンテナ側で横スクロールさせる
  // (Y軸ラベル "100位" が 6px に潰れて読めない問題を回避)
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
         class="chart-svg w-full h-auto bg-white border border-gray-200 rounded-lg"
         style="min-width: min(${W}px, max(720px, 100%));"
         role="img" aria-label="練習生 ${selectedCount} 名の順位推移グラフ">
      <g class="chart-band">${debutBand}</g>
      <g class="chart-grid">${yGrid}${xGrid}</g>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#9ca3af" stroke-width="1" />
      <line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="#9ca3af" stroke-width="1" />
      <g class="chart-lines">${lines}</g>
      <g class="chart-endpoints">${endpointHtml}</g>
    </svg>
  `;
}

function getSelectedTrainees(panel, trainees) {
  const selectedIds = [];
  panel.querySelectorAll('.chart-picker .chart-checkbox:checked').forEach(cb => {
    selectedIds.push(cb.dataset.iid);
  });
  const idMap = new Map(trainees.map(t => [t.image_id, t]));
  return selectedIds
    .map((iid, idx) => {
      const t = idMap.get(iid);
      if (!t) return null;
      const { color, dasharray } = chartLineStyle(idx);
      return { trainee: t, color, dasharray };
    })
    .filter(Boolean);
}

function refreshChart(panel, trainees, milestones, maxRank, debutCap = 11) {
  const selected = getSelectedTrainees(panel, trainees);
  // Swatch: reset all to transparent
  panel.querySelectorAll('[data-iid-swatch] line').forEach(line => {
    line.setAttribute('stroke', 'transparent');
    line.removeAttribute('stroke-dasharray');
  });
  // Apply selected colors + dash patterns
  selected.forEach(({ trainee, color, dasharray }) => {
    const sw = panel.querySelector(`[data-iid-swatch="${CSS.escape(trainee.image_id)}"] line`);
    if (sw) {
      sw.setAttribute('stroke', color);
      if (dasharray) sw.setAttribute('stroke-dasharray', dasharray);
    }
  });
  const container = panel.querySelector('.chart-svg-container');
  if (container) container.innerHTML = buildChartSvg(selected, milestones, maxRank, debutCap);
  const counter = panel.querySelector('.chart-counter');
  if (counter) counter.textContent = `${selected.length} / ${trainees.length} 名選択中`;
}

function renderRankingChart(trainees, milestones, panelId, cfg, maxRank, debutCap = 11) {
  const defaultSet = defaultChartSelection(trainees, panelId);
  const initialSelected = trainees
    .filter(t => defaultSet.has(t.image_id))
    .map((t, idx) => {
      const { color, dasharray } = chartLineStyle(idx);
      return { trainee: t, color, dasharray };
    });
  return `
    <div class="flex flex-col lg:flex-row gap-4">
      ${renderTraineePicker(trainees, defaultSet, cfg, milestones, panelId)}
      <div class="flex-1 min-w-0 relative">
        <div class="chart-svg-container overflow-x-auto sm:overflow-visible -mx-2 sm:mx-0 px-2 sm:px-0">${buildChartSvg(initialSelected, milestones, maxRank, debutCap)}</div>
        <div class="chart-tooltip hidden absolute pointer-events-none bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs z-30 max-w-[200px]"></div>
        <p class="text-[11px] text-gray-500 mt-2">
          Y軸=順位 (1位が上)。
          <span class="inline-block w-3 h-2 bg-yellow-200 align-middle mx-1"></span>Top ${debutCap} デビュー圏
          <span class="inline-block w-2 h-2 bg-pink-300 align-middle mx-1"></span>順位発表式列
          ・線にホバーで詳細表示
        </p>
      </div>
    </div>
  `;
}

function bindChartControls(panel, trainees, milestones, maxRank, debutCap = 11) {
  const picker = panel.querySelector('.chart-picker');
  if (!picker) return;

  // ピッカー <details> はデスクトップ (lg=1024px+) で展開、モバイルでは折り畳み開始
  // 101 名のリストがモバイルでファーストビューを埋めないように
  const details = panel.querySelector('.chart-picker-details');
  if (details) {
    details.open = window.matchMedia('(min-width: 1024px)').matches;
  }

  // Initial swatch colors for default-checked trainees
  refreshChart(panel, trainees, milestones, maxRank, debutCap);

  // Checkbox toggle
  picker.addEventListener('change', (e) => {
    if (e.target.matches('.chart-checkbox')) {
      refreshChart(panel, trainees, milestones, maxRank, debutCap);
    }
  });

  // Filter input (debounced — 101 名分の DOM 走査をキーストロークごとに繰り返さない)
  const filter = panel.querySelector('.chart-filter');
  if (filter) {
    filter.addEventListener('input', debounce(() => {
      const q = filter.value.trim().toLowerCase();
      panel.querySelectorAll('.chart-picker-item').forEach(li => {
        const match = !q || (li.dataset.search || '').includes(q);
        li.style.display = match ? '' : 'none';
      });
    }, 150));
  }

  // Preset buttons
  panel.querySelectorAll('.chart-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const cbs = panel.querySelectorAll('.chart-checkbox');
      let nextChecked = new Set();
      if (preset === 'debut') {
        trainees.forEach(t => { if (t.debuted === true) nextChecked.add(t.image_id); });
      } else if (preset === 'all') {
        trainees.forEach(t => nextChecked.add(t.image_id));
      } else if (preset === 'survivors') {
        const key = btn.dataset.ceremony;
        trainees.forEach(t => {
          const r = t.rank_history && t.rank_history[key];
          if (r != null) nextChecked.add(t.image_id);
        });
      } else if (preset === 'none') {
        nextChecked = new Set();
      }
      cbs.forEach(cb => { cb.checked = nextChecked.has(cb.dataset.iid); });
      refreshChart(panel, trainees, milestones, maxRank, debutCap);
    });
  });

  // 「類似」ボタン: 類似軌跡モーダルを開く
  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('.similar-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openSimilarityModal(btn.dataset.season, btn.dataset.iid);
  });

  // Hover emphasis on picker label → highlight line in chart
  picker.addEventListener('mouseover', (e) => {
    const label = e.target.closest('.chart-picker-item');
    if (!label) return;
    const cb = label.querySelector('.chart-checkbox');
    if (!cb) return;
    highlightTraineeLine(panel, cb.dataset.iid);
  });
  picker.addEventListener('mouseout', () => {
    clearLineHighlight(panel);
  });

  // SVG 内のホバー: 線/点/エンドポイントラベルからグループを特定 → 強調 + ツールチップ
  const svgContainer = panel.querySelector('.chart-svg-container');
  const tooltip = panel.querySelector('.chart-tooltip');
  const idMap = new Map(trainees.map(t => [t.image_id, t]));
  if (svgContainer && tooltip) {
    svgContainer.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-iid]');
      if (!el) return;
      const iid = el.dataset.iid;
      highlightTraineeLine(panel, iid);
      showChartTooltip(panel, tooltip, idMap.get(iid), milestones, debutCap);
    });
    svgContainer.addEventListener('mousemove', (e) => {
      if (tooltip.classList.contains('hidden')) return;
      positionChartTooltip(svgContainer, tooltip, e);
    });
    svgContainer.addEventListener('mouseleave', () => {
      clearLineHighlight(panel);
      tooltip.classList.add('hidden');
    });
  }
}

function highlightTraineeLine(panel, iid) {
  panel.querySelectorAll('.chart-svg [data-iid]').forEach(el => {
    const isTarget = el.dataset.iid === iid;
    el.style.opacity = isTarget ? '1' : '0.15';
    if (el.classList.contains('chart-line')) {
      el.setAttribute('stroke-width', isTarget ? '4' : '2');
    }
  });
}

function clearLineHighlight(panel) {
  panel.querySelectorAll('.chart-svg [data-iid]').forEach(el => {
    el.style.opacity = '';
    if (el.classList.contains('chart-line')) el.setAttribute('stroke-width', '2');
  });
}

function showChartTooltip(panel, tooltip, trainee, milestones, debutCap = 11) {
  if (!trainee) return;
  const nameJp = escapeHtml(trainee.name_jp || trainee.name_romaji || '');
  const stage = trainee.stage_name ? ` <span class="text-gray-400">(${escapeHtml(trainee.stage_name)})</span>` : '';
  const rows = milestones.map(m => {
    const r = trainee.rank_history?.[m.key];
    const rankStr = r == null ? '<span class="text-gray-300">—</span>' : `<span class="font-bold ${rankTooltipColor(r, debutCap)}">${r}位</span>`;
    const cer = m.ceremony ? 'text-pink-700 font-bold' : 'text-gray-600';
    return `<div class="flex justify-between gap-3"><span class="${cer}">${escapeHtml(m.short || m.label)}</span>${rankStr}</div>`;
  }).join('');
  tooltip.innerHTML = `<div class="font-bold mb-1">${nameJp}${stage}</div>${rows}`;
  tooltip.classList.remove('hidden');
}

function rankTooltipColor(r, debutCap = 11) {
  if (r === 1) return 'text-yellow-600';
  if (r <= 3) return 'text-amber-700';
  if (r <= debutCap) return 'text-yellow-700';
  return 'text-gray-700';
}

function positionChartTooltip(container, tooltip, e) {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left + 12;
  const y = e.clientY - rect.top + 12;
  // 右端で見切れる場合は左側に寄せる
  const tw = tooltip.offsetWidth || 180;
  const cw = container.clientWidth;
  tooltip.style.left = (x + tw > cw ? cw - tw - 8 : x) + 'px';
  tooltip.style.top = y + 'px';
}

// =========================================================================
// 類似軌跡検索 (similarity)
// =========================================================================

// シーズン内のアンカー milestone (p1 + 順位発表式) を出現順に返す。
// 時系列アライメントの基準点として使う。
function seasonAnchors(season) {
  if (!season || !Array.isArray(season.ranking_milestones)) return [];
  return season.ranking_milestones
    .filter(m => m.key === 'p1' || m.ceremony === true)
    .map(m => m.key);
}

// 基準シーズンの warping: アンカーを [0,1] に等間隔配置し、
// アンカー間の中間 milestone (p-eval) はその区間内のインデックス比で配置する。
// 戻り値: { [milestoneKey]: canonicalX } 辞書。
function buildBaseWarping(season) {
  const anchors = seasonAnchors(season);
  if (anchors.length < 2) return null;
  const positions = {};
  anchors.forEach((k, ai) => { positions[k] = ai / (anchors.length - 1); });
  return fillSegmentsBetweenAnchors(season, anchors, positions);
}

// 候補シーズンの warping: 基準シーズンと共通のアンカーが基準と同じ canonical x に来るように配置。
// 最後の共通アンカーより後ろにある候補側アンカー (例: 基準=SHINSEKAI で候補=S1 の rcF) は、
// 基準軸ピッチ / 候補軸ピッチの比で線形外挿して x > 1 に配置する → 候補シーズン全期間を描画可能にする。
// 距離計算は resampleTrajectory が [0,1] grid を使うため、外挿部分はチャート描画にのみ寄与する。
function buildCandidateWarping(candSeason, baseWarping) {
  if (!candSeason || !Array.isArray(candSeason.ranking_milestones) || !baseWarping) return null;
  const candAnchorKeys = seasonAnchors(candSeason);
  const sharedAnchors = candAnchorKeys.filter(k => baseWarping[k] != null);
  if (sharedAnchors.length < 2) return null;
  const positions = {};
  sharedAnchors.forEach(k => { positions[k] = baseWarping[k]; });

  // 末尾アンカー (最後の共通アンカーより後ろの候補側アンカー) を外挿。
  const lastSharedKey = sharedAnchors[sharedAnchors.length - 1];
  const lastSharedIdx = candAnchorKeys.indexOf(lastSharedKey);
  if (lastSharedIdx >= 0 && lastSharedIdx < candAnchorKeys.length - 1) {
    // 候補シーズン自身の canonical 位置 (もしこのシーズンが基準だったら、の位置)
    const candOwn = {};
    candAnchorKeys.forEach((k, i) => { candOwn[k] = i / (candAnchorKeys.length - 1); });
    const penultKey = sharedAnchors[sharedAnchors.length - 2];
    const baseDelta = baseWarping[lastSharedKey] - baseWarping[penultKey];
    const candDelta = candOwn[lastSharedKey] - candOwn[penultKey];
    const rate = baseDelta / Math.max(1e-6, candDelta);
    for (let i = lastSharedIdx + 1; i < candAnchorKeys.length; i++) {
      const k = candAnchorKeys[i];
      positions[k] = baseWarping[lastSharedKey] + (candOwn[k] - candOwn[lastSharedKey]) * rate;
    }
  }
  const allAnchors = candAnchorKeys.filter(k => positions[k] != null);
  return fillSegmentsBetweenAnchors(candSeason, allAnchors, positions);
}

// `anchorKeys` 間に挟まれる milestone を、区間内のインデックス比で線形補間配置する内部ヘルパー。
// アンカーより前 / 後の milestone は未割当のまま (= 比較対象外)。
function fillSegmentsBetweenAnchors(season, anchorKeys, positions) {
  const milestones = season.ranking_milestones;
  const anchorIdx = anchorKeys.map(k => milestones.findIndex(m => m.key === k));
  if (anchorIdx.some(i => i < 0)) return null;
  for (let ai = 0; ai < anchorKeys.length - 1; ai++) {
    const startIdx = anchorIdx[ai];
    const endIdx = anchorIdx[ai + 1];
    const startX = positions[anchorKeys[ai]];
    const endX = positions[anchorKeys[ai + 1]];
    const segLen = endIdx - startIdx;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const localFrac = (i - startIdx) / segLen;
      positions[milestones[i].key] = startX + (endX - startX) * localFrac;
    }
  }
  return positions;
}

// warping に基づき、各 milestone を warped x × normalized y の点列に変換する。
// warping に含まれない milestone (アンカー外側) はスキップ。
// 最後の observed milestone より後ろで rank_history に key が無い milestone は、
// その練習生の「最終順位」(trainee.rank → 最後の observed rank → total_trainees の順で fallback)
// で水平に padding する (= 脱落後を「最終順位で埋める」)。
// 各点は元の rank (r), milestone (m), 観測種別 (status: 'observed' | 'final_pad') を保持する。
function buildAlignedTrajectory(trainee, season, warping) {
  if (!season || !Array.isArray(season.ranking_milestones) || !warping) return null;
  const denomY = Math.max(1, (season.total_trainees || 101) - 1);
  const hist = trainee.rank_history || {};
  const milestones = season.ranking_milestones;

  // この練習生で最後に観測された milestone の index と順位を特定。
  let lastObservedIdx = -1;
  let lastObservedRank = null;
  milestones.forEach((m, i) => {
    const r = hist[m.key];
    if (r != null) { lastObservedIdx = i; lastObservedRank = r; }
  });
  if (lastObservedIdx < 0) return null;

  // padding 用の順位: 公式の最終順位 → 最後の観測値 → 最下位 の優先順。
  // 完結シーズン早期脱落者は trainee.rank が「最終標準位」(例: rcF 圏外の 21 位枠)、
  // SHINSEKAI Top 50 圏外は rank=null なので最後の observed rank にフォールバック。
  const padRank = trainee.rank != null ? trainee.rank
                : lastObservedRank != null ? lastObservedRank
                : (season.total_trainees || 101);

  const points = [];
  milestones.forEach((m, i) => {
    const x = warping[m.key];
    if (x == null) return;
    const r = hist[m.key];
    if (r != null) {
      points.push({ x, y: (r - 1) / denomY, r, m, status: 'observed' });
    } else if (i > lastObservedIdx) {
      points.push({ x, y: (padRank - 1) / denomY, r: padRank, m, status: 'final_pad' });
    }
    // i <= lastObservedIdx で hist[key] が無い (= 観測前のギャップ): スキップ。
  });
  points.sort((a, b) => a.x - b.x);
  return points.length >= 2 ? points : null;
}

// 共通グリッド (N 点等間隔) に線形補間で再サンプリング。
// 軌跡の最初/最後の外側は extrapolation せず null。
function resampleTrajectory(points, N) {
  const result = new Array(N).fill(null);
  if (!points || points.length < 2) return result;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  let j = 0;
  for (let i = 0; i < N; i++) {
    const t = (N === 1) ? 0 : i / (N - 1);
    if (t < minX || t > maxX) continue;
    while (j < points.length - 2 && points[j + 1].x < t) j++;
    const p0 = points[j], p1 = points[j + 1];
    const span = p1.x - p0.x;
    result[i] = span === 0 ? p0.y : p0.y + (p1.y - p0.y) * (t - p0.x) / span;
  }
  return result;
}

// 2 軌跡の距離 = 位置 MAE と 傾き (隣接点 Δ) MAE をブレンドし、重なり不足ペナルティを加算。
// 位置 MAE は「いつ・どこにいたか」を、傾き MAE は「上昇/下降/同形」を捉える (上昇 vs 下降を明示的に区別)。
// slopeAlpha は傾き成分の比率 (0 = 位置のみ, 1 = 傾きのみ)。デフォルト 0.5 (位置/形状 50:50)。
// overlapPenalty デフォルト 0: 観測点数の差で候補をペナルティしない (寛容、SHINSEKAI など短観測も等価扱い)。
// 最低 minRequired 点の重なりが無ければ null (比較不能)。
function trajectoryDistance(a, b, opts = {}) {
  const { minOverlap = 4, minRequired = 4, overlapPenalty = 0, slopeAlpha = 0.5 } = opts;
  let sumPos = 0, countPos = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] == null || b[i] == null) continue;
    sumPos += Math.abs(a[i] - b[i]);
    countPos++;
  }
  if (countPos < minRequired) return null;
  const posMae = sumPos / countPos;

  let sumSlope = 0, countSlope = 0;
  for (let i = 0; i < a.length - 1; i++) {
    if (a[i] == null || a[i + 1] == null || b[i] == null || b[i + 1] == null) continue;
    sumSlope += Math.abs((a[i + 1] - a[i]) - (b[i + 1] - b[i]));
    countSlope++;
  }
  const slopeMae = countSlope > 0 ? sumSlope / countSlope : 0;

  return (1 - slopeAlpha) * posMae + slopeAlpha * slopeMae
       + Math.max(0, minOverlap - countPos) * overlapPenalty;
}

// 全シーズン (または同一シーズン) の練習生から類似トップ N を返す。
// 各候補シーズンに対して基準シーズンと共通のアンカー (p1 + 順位発表式) を抽出し、
// それを使って候補シーズンの milestone を基準の canonical x に warp してから距離を取る。
// 結果には warp 済み軌跡 (`traj`) を含めるので、後段のチャート描画はそのまま使える。
function similarTrainees(baseSeasonId, baseImageId, opts = {}) {
  const { topN = 10, excludeSameSeason = false } = opts;
  const baseSeason = seasonData[baseSeasonId];
  if (!baseSeason || !baseSeason.trainees) return [];
  const baseWarping = buildBaseWarping(baseSeason);
  if (!baseWarping) return [];
  const baseTrainee = baseSeason.trainees.find(t => t.image_id === baseImageId);
  if (!baseTrainee) return [];
  const baseTraj = buildAlignedTrajectory(baseTrainee, baseSeason, baseWarping);
  if (!baseTraj) return [];

  const results = [];
  Object.entries(seasonData).forEach(([sid, s]) => {
    if (!s || !s.trainees) return;
    if (excludeSameSeason && sid === baseSeasonId) return;
    const candWarping = (sid === baseSeasonId)
      ? baseWarping
      : buildCandidateWarping(s, baseWarping);
    if (!candWarping) return;
    const sharedAnchorCount = seasonAnchors(s).filter(k => baseWarping[k] != null).length;
    const N = Math.max(32, sharedAnchorCount * 8);
    const baseSampled = resampleTrajectory(baseTraj, N);
    s.trainees.forEach(t => {
      if (sid === baseSeasonId && t.image_id === baseImageId) return;
      const traj = buildAlignedTrajectory(t, s, candWarping);
      if (!traj) return;
      const sampled = resampleTrajectory(traj, N);
      const d = trajectoryDistance(baseSampled, sampled);
      if (d == null) return;
      const observedCount = traj.reduce((n, p) => n + (p.status === 'observed' ? 1 : 0), 0);
      results.push({ trainee: t, seasonId: sid, distance: d, traj, observedCount });
    });
  });
  // 距離同値時は observed 点数の多い候補を優先 (= padding 比率の低い、より確かな比較を上に)。
  results.sort((a, b) => (a.distance - b.distance) || (b.observedCount - a.observedCount));
  return results.slice(0, topN);
}

// 共通グリッドに resample した 2 軌跡で最大乖離が出た canonical x を、
// baseWarping で基準シーズンの最近接 milestone に逆引きして返す。
function computeWorstMilestone(baseTraj, otherTraj, baseMilestones, baseWarping) {
  if (!baseTraj || !otherTraj || !baseMilestones || baseMilestones.length < 2 || !baseWarping) return null;
  const N = Math.max(32, baseMilestones.length * 4);
  const baseS = resampleTrajectory(baseTraj, N);
  const otherS = resampleTrajectory(otherTraj, N);
  let worstIdx = -1, worstDiff = 0;
  for (let i = 0; i < N; i++) {
    if (baseS[i] == null || otherS[i] == null) continue;
    const d = Math.abs(baseS[i] - otherS[i]);
    if (d > worstDiff) { worstDiff = d; worstIdx = i; }
  }
  if (worstIdx < 0) return null;
  const xn = worstIdx / (N - 1);
  let closest = null, minDist = Infinity;
  baseMilestones.forEach(m => {
    const mx = baseWarping[m.key];
    if (mx == null) return;
    const dx = Math.abs(mx - xn);
    if (dx < minDist) { minDist = dx; closest = m; }
  });
  if (!closest) return null;
  return { milestone: closest, normalizedDiff: worstDiff };
}

// 類似モーダル用の SVG オーバーレイチャート。基準軌跡 (黒太線) + 選択中の類似軌跡を重ねる。
// baseEntry / entries はいずれも { trainee, seasonId, traj, rank?, color? } を持つ。
// X 軸 tick は baseMilestones を baseWarping で warped x 位置に並べる。
function buildSimilarityChartSvg(baseEntry, entries, baseMilestones, baseWarping) {
  const W = 600, H = 260;
  const padL = 48, padR = 96, padT = 14, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // 描画する全軌跡から Y 範囲を計算し、padding を加えて自動ズーム。
  // これによって全員が Top 30 以内の場合などに上半分だけ詰まる問題を解消する。
  const allPoints = [];
  if (baseEntry.traj) allPoints.push(...baseEntry.traj);
  entries.forEach(e => { if (e.traj) allPoints.push(...e.traj); });
  let yMin = 0, yMax = 1;
  if (allPoints.length > 0) {
    yMin = Math.min(...allPoints.map(p => p.y));
    yMax = Math.max(...allPoints.map(p => p.y));
    const span = Math.max(0.0001, yMax - yMin);
    const padFrac = 0.08;
    yMin = Math.max(0, yMin - span * padFrac);
    yMax = Math.min(1, yMax + span * padFrac);
    // 極端に狭い場合は最低 0.18 を確保 (見やすさ担保)
    if (yMax - yMin < 0.18) {
      const mid = (yMin + yMax) / 2;
      yMin = Math.max(0, mid - 0.09);
      yMax = Math.min(1, mid + 0.09);
      if (yMax - yMin < 0.18) {
        // 上下どちらかが clamp された場合のリカバリ
        if (yMin === 0) yMax = Math.min(1, yMin + 0.18);
        else if (yMax === 1) yMin = Math.max(0, yMax - 0.18);
      }
    }
  }
  const yRange = yMax - yMin;

  // X 軸スケール: 基準シーズンが進行中 (SHINSEKAI) などで候補側の trailing milestone が x>1 に
  // 外挿配置されているケースでは、候補シーズン全期間を表示できるよう xMax まで自動拡張する。
  let xMax = 1;
  if (baseEntry.traj) baseEntry.traj.forEach(p => { if (p.x > xMax) xMax = p.x; });
  entries.forEach(e => { if (e.traj) e.traj.forEach(p => { if (p.x > xMax) xMax = p.x; }); });
  const xAt = (xn) => padL + (xn / xMax) * innerW;
  const yAt = (yn) => padT + ((yn - yMin) / yRange) * innerH;

  // 表示範囲を実順位に逆算 (基準シーズンの total_trainees で換算)
  const baseSeason = seasonData[baseEntry.seasonId];
  const baseTotal = (baseSeason && baseSeason.total_trainees) || 101;
  const denom = Math.max(1, baseTotal - 1);
  const rankAt = (yn) => Math.max(1, Math.min(baseTotal, Math.round(yn * denom) + 1));
  const topRank = rankAt(yMin);
  const bottomRank = rankAt(yMax);

  // Y軸 補助 tick: 表示中の rank 範囲から nice step を選び、3〜7 本程度の補助線を引く。
  // 自動ズームのため固定 10 刻みは使えない (例: 1〜19 では 10 だけになって粗い)。
  const rankSpan = Math.max(1, bottomRank - topRank);
  const stepCandidates = [1, 2, 5, 10, 20, 25, 50];
  let yStep = stepCandidates[stepCandidates.length - 1];
  for (const s of stepCandidates) {
    const n = rankSpan / s;
    if (n >= 3 && n <= 7) { yStep = s; break; }
    if (n < 3) { yStep = s; break; }
  }
  const yTicks = [];
  const firstTick = Math.ceil(topRank / yStep) * yStep;
  for (let r = firstTick; r < bottomRank; r += yStep) {
    if (r > topRank && r < bottomRank) yTicks.push(r);
  }
  const yGrid = yTicks.map(rank => {
    const yn = (rank - 1) / denom;
    const y = yAt(yn);
    return `
      <line x1="${padL.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(padL + innerW).toFixed(1)}" y2="${y.toFixed(1)}"
            stroke="#e5e7eb" stroke-width="0.7" stroke-dasharray="2 3" />
      <text x="${(padL - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end"
            font-size="9" fill="#9ca3af" font-family="Orbitron,sans-serif">${rank}位</text>
    `;
  }).join('');

  // 背景帯: 表示範囲の上 1/3 を青 / 下 1/3 を赤で薄く
  const bandH = innerH / 3;
  const bands = `
    <rect x="${padL}" y="${yAt(yMin).toFixed(1)}" width="${innerW}" height="${bandH.toFixed(1)}" fill="#dbeafe" fill-opacity="0.22" />
    <rect x="${padL}" y="${(yAt(yMax) - bandH).toFixed(1)}" width="${innerW}" height="${bandH.toFixed(1)}" fill="#fee2e2" fill-opacity="0.14" />
  `;

  // Y軸ラベル (上=topRank位、下=bottomRank位、基準シーズンの順位として表示)
  const yEdge = `
    <text x="${(padL - 6).toFixed(1)}" y="${(yAt(yMin) + 9).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280" font-family="Orbitron,sans-serif">↑${topRank}位</text>
    <text x="${(padL - 6).toFixed(1)}" y="${(yAt(yMax) - 2).toFixed(1)}" text-anchor="end" font-size="9" fill="#6b7280" font-family="Orbitron,sans-serif">${bottomRank}位↓</text>
  `;

  // X軸 tick (基準シーズンの milestone, baseWarping で warped x に配置)
  const xTicks = baseMilestones.map(m => {
    const xn = baseWarping ? baseWarping[m.key] : null;
    if (xn == null) return '';
    const x = xAt(xn);
    const cer = !!m.ceremony;
    return `
      <line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${(padT + innerH).toFixed(1)}"
            stroke="${cer ? '#f9a8d4' : '#e5e7eb'}" stroke-width="${cer ? 1 : 0.7}" ${cer ? '' : 'stroke-dasharray="2 3"'} />
      <text x="${x.toFixed(1)}" y="${(H - 10).toFixed(1)}" text-anchor="middle" font-size="9"
            fill="${cer ? '#be185d' : '#9ca3af'}" font-family="Orbitron,sans-serif" font-weight="${cer ? 'bold' : 'normal'}">${escapeHtml(m.short || m.key)}</text>
    `;
  }).join('');

  // 候補シーズン由来の ceremony tick (例: 基準=SHINSEKAI のとき S1/S2/TG の Final、TG の RC3)。
  // 基準にない ceremony を x.toFixed(3) でグループ化し、同 x に複数キー (例: S1 FINAL と TG RC3
  // がどちらも x=1.5) が来た場合はラベルを "/" で結合して 1 本の縦線にまとめる (重なり防止)。
  const baseKeys = new Set(baseMilestones.map(m => m.key));
  const extraByX = new Map();
  entries.forEach(e => {
    if (!e.traj) return;
    e.traj.forEach(p => {
      if (!p.m.ceremony) return;
      if (baseKeys.has(p.m.key)) return;
      const xKey = p.x.toFixed(3);
      if (!extraByX.has(xKey)) extraByX.set(xKey, { x: p.x, labels: new Set() });
      extraByX.get(xKey).labels.add(p.m.short || p.m.key);
    });
  });
  const extraTicks = [...extraByX.values()].map(({ x, labels }) => {
    const px = xAt(x);
    const lbl = [...labels].join('/');
    return `
      <line x1="${px.toFixed(1)}" y1="${padT}" x2="${px.toFixed(1)}" y2="${(padT + innerH).toFixed(1)}"
            stroke="#f9a8d4" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.65" />
      <text x="${px.toFixed(1)}" y="${(H - 10).toFixed(1)}" text-anchor="middle" font-size="9"
            fill="#be185d" font-family="Orbitron,sans-serif" font-weight="600" opacity="0.85">${escapeHtml(lbl)}</text>`;
  }).join('');

  // 基準シーズン終端のデバイダー (進行中シーズン基準で候補が x>1 へ伸びる場合に表示)。
  // 「ここから先は候補シーズンの未来パート」だと一目で分かるようにするための補助線。
  let baseEndDivider = '';
  if (xMax > 1.001) {
    const dx = xAt(1.0);
    baseEndDivider = `
      <line x1="${dx.toFixed(1)}" y1="${padT}" x2="${dx.toFixed(1)}" y2="${(padT + innerH).toFixed(1)}"
            stroke="#6b7280" stroke-width="1" stroke-dasharray="5 4" opacity="0.6" />
      <text x="${(dx + 4).toFixed(1)}" y="${(padT + 10).toFixed(1)}" font-size="8.5" fill="#6b7280"
            font-family="Orbitron,sans-serif">基準終端 →</text>`;
  }

  // 線・ポイント・各点の順位ラベル。
  // observed 区間は実線+塗りつぶし円+順位ラベル、padding 区間 (脱落後) は破線+白抜き円+ラベル省略。
  // 区切り点 (最後の observed) は両セグメントの共通端点として両方に含める。
  const renderLine = (entry, color, strokeWidth, opacity, isBase) => {
    const traj = entry.traj;
    if (!traj || traj.length < 2) return '';
    const iid = escapeHtml(entry.trainee.image_id);

    // 最後の observed point の index (padding 区間の開始点を見つけるため)。
    let lastObsIdx = -1;
    traj.forEach((p, i) => { if (p.status !== 'final_pad') lastObsIdx = i; });
    const obsSegment = lastObsIdx >= 0 ? traj.slice(0, lastObsIdx + 1) : [];
    const padSegment = lastObsIdx >= 0 && lastObsIdx < traj.length - 1
      ? traj.slice(lastObsIdx)  // 接続のため最後の observed を先頭に含める
      : [];

    const toPath = (seg) => seg.length >= 2
      ? seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.x).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(' ')
      : '';
    const obsPath = toPath(obsSegment);
    const padPath = toPath(padSegment);

    // observed の円 + ラベル
    const obsPts = obsSegment.map(p => {
      const cx = xAt(p.x).toFixed(1), cy = yAt(p.y).toFixed(1);
      const labelHtml = `<text x="${cx}" y="${(yAt(p.y) - 7).toFixed(1)}" text-anchor="middle" font-size="9" fill="${color}" font-weight="bold" font-family="Orbitron,sans-serif" stroke="white" stroke-width="2.5" paint-order="stroke" data-iid="${iid}">${p.r}位</text>`;
      return `<circle cx="${cx}" cy="${cy}" r="${isBase ? 3.2 : 2.4}" fill="${color}" data-iid="${iid}" />${labelHtml}`;
    }).join('');
    // padding 点は白抜き円のみ (ラベル非表示)。先頭は obs と重複するのでスキップ。
    const padPts = padSegment.slice(1).filter(p => p.status === 'final_pad').map(p => {
      const cx = xAt(p.x).toFixed(1), cy = yAt(p.y).toFixed(1);
      return `<circle cx="${cx}" cy="${cy}" r="${isBase ? 2.4 : 2.0}" fill="white" stroke="${color}" stroke-width="1" data-iid="${iid}" opacity="0.75" />`;
    }).join('');

    const obsLine = obsPath ? `<path class="sim-line" d="${obsPath}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
            stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" data-iid="${iid}" />` : '';
    const padLine = padPath ? `<path class="sim-line sim-line-pad" d="${padPath}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
            stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 4" opacity="${(opacity * 0.7).toFixed(2)}" data-iid="${iid}" />` : '';
    return `<g data-iid="${iid}" class="sim-line-group">
      ${obsLine}
      ${padLine}
      ${obsPts}
      ${padPts}
    </g>`;
  };

  // 描画順: 類似 → 基準 (基準が最前面)
  const entryLines = entries.map(e => renderLine(e, e.color, 2, 0.85, false)).join('');
  const baseLine = renderLine(baseEntry, '#111827', 3.5, 1.0, true);

  // エンドポイントラベル (右端、deconflict 適用)
  const labelInputs = [];
  if (baseEntry.traj && baseEntry.traj.length) {
    const last = baseEntry.traj[baseEntry.traj.length - 1];
    labelInputs.push({
      idealY: yAt(last.y), iid: baseEntry.trainee.image_id,
      text: baseEntry.trainee.name_jp || baseEntry.trainee.name_romaji || '?',
      color: '#111827', isBase: true,
    });
  }
  entries.forEach(e => {
    if (!e.traj || !e.traj.length) return;
    const last = e.traj[e.traj.length - 1];
    labelInputs.push({
      idealY: yAt(last.y), iid: e.trainee.image_id,
      text: e.trainee.name_jp || e.trainee.name_romaji || '?',
      color: e.color, isBase: false, rank: e.rank,
    });
  });
  const labels = deconflictLabels(labelInputs, { minGap: 12, top: padT + 4, bottom: padT + innerH - 4 });
  const labelsSvg = labels.map(l => {
    const fw = l.isBase ? 'bold' : '600';
    const txt = escapeHtml((l.text || '?').slice(0, 7));
    return `<text x="${(padL + innerW + 5).toFixed(1)}" y="${l.finalY.toFixed(1)}"
              font-size="10" fill="${l.color}" font-weight="${fw}"
              dominant-baseline="middle" data-iid="${escapeHtml(l.iid)}" class="sim-endlabel">${txt}</text>`;
  }).join('');

  return `<svg class="sim-chart-svg block w-full" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg" font-family="Noto Sans JP,sans-serif">
    ${bands}
    ${xTicks}
    ${extraTicks}
    ${baseEndDivider}
    ${yGrid}
    ${yEdge}
    <rect x="${padL}" y="${padT}" width="${innerW}" height="${innerH}" fill="none" stroke="#d1d5db" stroke-width="1" />
    ${entryLines}
    ${baseLine}
    ${labelsSvg}
  </svg>`;
}

// 類似結果に表示色 / 順位 / 表示 ON/OFF を付与。traj は similarTrainees で warp 済みのものをそのまま使う。
function decorateSimilarityResults(results, defaultOn = 10) {
  return results.map((r, i) => {
    const { color } = chartLineStyle(i);
    return { ...r, color, rank: i + 1, chartOn: i < defaultOn };
  });
}

function refreshSimilarityChart(root, baseEntry, decorated, baseMilestones, baseWarping) {
  const active = decorated.filter(r => r.chartOn && r.traj && r.traj.length >= 2);
  const container = root.querySelector('.sim-chart-container');
  if (container) {
    container.innerHTML = buildSimilarityChartSvg(baseEntry, active, baseMilestones, baseWarping);
  }
  // List 側の dot 表示を同期
  decorated.forEach(r => {
    const li = root.querySelector(`.sim-result[data-iid="${CSS.escape(r.trainee.image_id)}"]`);
    if (!li) return;
    const dot = li.querySelector('.sim-toggle-dot');
    if (dot) {
      if (r.chartOn) {
        dot.style.background = r.color;
        dot.style.borderColor = r.color;
        dot.setAttribute('aria-pressed', 'true');
        dot.title = 'チャートから外す';
      } else {
        dot.style.background = 'transparent';
        dot.style.borderColor = '#d1d5db';
        dot.setAttribute('aria-pressed', 'false');
        dot.title = 'チャートに重ねる';
      }
    }
    li.dataset.chartOn = r.chartOn ? 'true' : 'false';
  });
  const counter = root.querySelector('.sim-chart-counter');
  if (counter) counter.textContent = `${active.length} / ${decorated.length} 名を重ね描画中`;
}

function highlightSimLine(root, iid) {
  const baseIid = root._simState?.baseEntry?.trainee?.image_id;
  root.querySelectorAll('.sim-chart-svg [data-iid]').forEach(el => {
    const isTarget = el.dataset.iid === iid;
    const isBase = el.dataset.iid === baseIid;
    // 基準線は hover 対象でなくても常に表示し続ける (比較元として見え続けたい)
    el.style.opacity = (isTarget || isBase) ? '1' : '0.15';
    if (el.classList.contains('sim-line')) {
      el.setAttribute('stroke-width', isTarget ? '4.5' : (isBase ? '3.5' : '2'));
    }
  });
  root.querySelectorAll('.sim-result').forEach(li => {
    li.classList.toggle('ring-2', li.dataset.iid === iid);
    li.classList.toggle('ring-gray-400', li.dataset.iid === iid);
  });
}

function clearSimLineHighlight(root) {
  const baseIid = root._simState?.baseEntry?.trainee?.image_id;
  root.querySelectorAll('.sim-chart-svg [data-iid]').forEach(el => {
    el.style.opacity = '';
    if (el.classList.contains('sim-line')) {
      // 基準線の元の太さ (3.5) を保つ
      el.setAttribute('stroke-width', el.dataset.iid === baseIid ? '3.5' : '2');
    }
  });
  root.querySelectorAll('.sim-result').forEach(li => {
    li.classList.remove('ring-2', 'ring-gray-400');
  });
}

function showSimTooltip(root, tooltip, entry, baseEntry, baseMilestones, baseWarping) {
  if (!entry || !baseEntry) return;
  const name = escapeHtml(entry.trainee.name_jp || entry.trainee.name_romaji || '?');
  const sCfg = SEASON_CONFIG[entry.seasonId];
  const seasonChip = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-${sCfg.tw}-100 text-${sCfg.tw}-700 font-bold">${escapeHtml(sCfg.short)}</span>`;
  const simPct = Math.max(0, (1 - Math.min(1, entry.distance)) * 100).toFixed(1);

  const worst = computeWorstMilestone(baseEntry.traj, entry.traj, baseMilestones, baseWarping);
  let worstLine = '';
  if (worst) {
    const mShort = escapeHtml(worst.milestone.short || worst.milestone.key);
    const baseR = baseEntry.trainee.rank_history?.[worst.milestone.key];
    const otherR = entry.trainee.rank_history?.[worst.milestone.key];
    const ranks = (baseR != null && otherR != null)
      ? `<span class="font-bold">${baseR}位</span> vs <span class="font-bold">${otherR}位</span>`
      : `差 ${(worst.normalizedDiff * 100).toFixed(0)}%`;
    worstLine = `<div class="text-[10px] text-gray-600 mt-1">最大乖離: <span class="font-bold text-pink-700">${mShort}</span> で ${ranks}</div>`;
  }

  tooltip.innerHTML = `
    <div class="flex items-center gap-1.5 mb-0.5">${seasonChip}<span class="font-bold text-sm">${name}</span></div>
    <div class="text-[11px] text-gray-700">類似度 <span class="font-bold">${simPct}%</span> <span class="text-gray-400 ml-1">d=${entry.distance.toFixed(3)}</span></div>
    ${worstLine}
  `;
  tooltip.classList.remove('hidden');
}

function positionSimTooltip(container, tooltip, e) {
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left + 12;
  const y = e.clientY - rect.top + 12;
  const tw = tooltip.offsetWidth || 200;
  const cw = container.clientWidth;
  tooltip.style.left = (x + tw > cw ? Math.max(0, cw - tw - 8) : x) + 'px';
  tooltip.style.top = y + 'px';
}

function openSimilarityModal(seasonId, imageId) {
  let root = document.getElementById('similar-modal-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'similar-modal-root';
    document.body.appendChild(root);
  }
  // モーダルを閉じた後の焦点復帰先を保存 (デフォルト = 現在の active 要素)
  root._returnFocus = document.activeElement;
  const filter = root.dataset.filter === 'other' ? 'other' : 'all';
  renderSimilarityModal(root, seasonId, imageId, filter);
}

function closeSimilarityModal() {
  const root = document.getElementById('similar-modal-root');
  if (root) {
    const ret = root._returnFocus;
    root.innerHTML = '';
    delete root.dataset.filter;
    root._returnFocus = null;
    // 焦点を元の要素に戻す (a11y: モーダル閉鎖時の WAI-ARIA 規約)
    if (ret && typeof ret.focus === 'function' && document.contains(ret)) {
      ret.focus();
    }
  }
}

function renderSimilarityModal(root, seasonId, imageId, filter) {
  const season = seasonData[seasonId];
  if (!season || !season.trainees) return;
  const baseTrainee = season.trainees.find(t => t.image_id === imageId);
  if (!baseTrainee) return;

  const cfg = SEASON_CONFIG[seasonId];
  const baseMilestones = Array.isArray(season.ranking_milestones) ? season.ranking_milestones : [];
  const baseWarping = buildBaseWarping(season);
  const results = similarTrainees(seasonId, imageId, { topN: 10, excludeSameSeason: filter === 'other' });
  const decorated = decorateSimilarityResults(results, 10);
  const baseTraj = baseWarping ? buildAlignedTrajectory(baseTrainee, season, baseWarping) : null;
  const baseEntry = { trainee: baseTrainee, seasonId, traj: baseTraj };

  const baseTpl = season.image_url_template || DEFAULT_IMAGE_TEMPLATE[seasonId];
  const baseImg = buildImageUrl(baseTpl, baseTrainee);
  const baseName = escapeHtml(baseTrainee.name_jp || baseTrainee.name_romaji || '?');
  const baseStage = baseTrainee.stage_name ? ` <span class="text-[10px] opacity-80">(${escapeHtml(baseTrainee.stage_name)})</span>` : '';

  // 基準練習生の行 (リスト先頭): チャート ⇄ リストの双方向 hover を基準にも効かせるため。
  // 表示は固定 (トグル不可) で、アクションボタンは出さない。
  const baseInitials = (baseTrainee.name_romaji || baseTrainee.name_jp || '?').slice(0, 1).toUpperCase();
  const baseRomaji = escapeHtml(baseTrainee.name_romaji || '');
  const baseRankBadge = baseTrainee.rank != null
    ? `<span class="font-display text-[10px] font-black px-1.5 py-0.5 rounded ${rankColorClass(baseTrainee.rank)}">${baseTrainee.rank}</span>`
    : '';
  const baseImgHtml = baseImg
    ? `<img src="${escapeHtml(baseImg)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full object-cover bg-gray-200 shrink-0"
            onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0',textContent:'${escapeHtml(baseInitials)}'}))" />`
    : `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">${escapeHtml(baseInitials)}</div>`;
  const baseRow = baseTraj && baseTraj.length >= 2 ? `
    <li class="sim-result flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-gray-900 bg-white"
        data-iid="${escapeHtml(baseTrainee.image_id)}" data-chart-on="true">
      <span class="shrink-0 w-3.5 h-3.5 rounded-full" style="background:#111827;border:2px solid #111827;" title="基準軌跡 (常時表示)"></span>
      <div class="text-xs text-gray-400 font-display w-6 text-right shrink-0">基準</div>
      <div class="relative shrink-0">
        ${baseImgHtml}
        ${baseRankBadge ? `<div class="absolute -bottom-1 -right-1">${baseRankBadge}</div>` : ''}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-bold truncate">${baseName}${baseStage}</div>
        <div class="text-[10px] text-gray-500 font-display truncate">${baseRomaji}</div>
        <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-${cfg.tw}-100 text-${cfg.tw}-700 font-bold">${escapeHtml(cfg.short)}</span>
          <span class="text-[10px] text-gray-600">類似度 <span class="font-bold text-gray-900">100.0%</span></span>
          <span class="text-[10px] text-gray-400">d=0.000</span>
        </div>
      </div>
      <span class="shrink-0 text-[10px] px-2 py-0.5 rounded bg-gray-900 text-white font-bold">基準</span>
    </li>
  ` : '';

  const resultRows = decorated.map((r) => {
    const rcfg = SEASON_CONFIG[r.seasonId];
    const rseason = seasonData[r.seasonId];
    const rtpl = rseason.image_url_template || DEFAULT_IMAGE_TEMPLATE[r.seasonId];
    const rimg = buildImageUrl(rtpl, r.trainee);
    const rname = escapeHtml(r.trainee.name_jp || r.trainee.name_romaji || '?');
    const rromaji = escapeHtml(r.trainee.name_romaji || '');
    const rstage = r.trainee.stage_name ? ` <span class="text-[10px] text-gray-400">(${escapeHtml(r.trainee.stage_name)})</span>` : '';
    const rinitials = (r.trainee.name_romaji || r.trainee.name_jp || '?').slice(0, 1).toUpperCase();
    const similarityPct = Math.max(0, (1 - Math.min(1, r.distance)) * 100);
    const imgHtml = rimg
      ? `<img src="${escapeHtml(rimg)}" alt="" loading="lazy" referrerpolicy="no-referrer" class="w-10 h-10 rounded-full object-cover bg-gray-200 shrink-0"
              onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0',textContent:'${escapeHtml(rinitials)}'}))" />`
      : `<div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">${escapeHtml(rinitials)}</div>`;
    const rankBadgeHtml = r.trainee.rank != null
      ? `<span class="font-display text-[10px] font-black px-1.5 py-0.5 rounded ${rankColorClass(r.trainee.rank)}">${r.trainee.rank}</span>`
      : '';
    const action = `<button class="modal-goto shrink-0 text-xs px-2.5 py-1 rounded bg-${rcfg.tw}-500 text-white hover:bg-${rcfg.tw}-700 font-bold transition-colors" data-season="${escapeHtml(r.seasonId)}" data-iid="${escapeHtml(r.trainee.image_id)}">${escapeHtml(rcfg.short)} を開く</button>`;
    const dotStyle = r.chartOn
      ? `background:${r.color};border-color:${r.color};`
      : `background:transparent;border-color:#d1d5db;`;
    const hasTraj = r.traj && r.traj.length >= 2;
    const toggleDot = hasTraj
      ? `<button type="button" class="sim-toggle-dot shrink-0 w-3.5 h-3.5 rounded-full border-2 transition-all hover:scale-110"
                 style="${dotStyle}" aria-pressed="${r.chartOn ? 'true' : 'false'}"
                 title="${r.chartOn ? 'チャートから外す' : 'チャートに重ねる'}"></button>`
      : `<span class="shrink-0 w-3.5 h-3.5" title="軌跡データなし"></span>`;
    return `
      <li class="sim-result flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
          data-iid="${escapeHtml(r.trainee.image_id)}" data-chart-on="${r.chartOn ? 'true' : 'false'}">
        ${toggleDot}
        <div class="text-xs text-gray-400 font-display w-6 text-right shrink-0">#${r.rank}</div>
        <div class="relative shrink-0">
          ${imgHtml}
          ${rankBadgeHtml ? `<div class="absolute -bottom-1 -right-1">${rankBadgeHtml}</div>` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold truncate">${rname}${rstage}</div>
          <div class="text-[10px] text-gray-500 font-display truncate">${rromaji}</div>
          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-${rcfg.tw}-100 text-${rcfg.tw}-700 font-bold">${escapeHtml(rcfg.short)}</span>
            <span class="text-[10px] text-gray-600">類似度 <span class="font-bold text-gray-900">${similarityPct.toFixed(1)}%</span></span>
            <span class="text-[10px] text-gray-400">d=${r.distance.toFixed(3)}</span>
          </div>
        </div>
        ${action}
      </li>
    `;
  }).join('');

  const emptyMsg = decorated.length === 0
    ? `<p class="text-center py-8 text-gray-400 text-sm">類似する練習生が見つかりませんでした</p>`
    : '';

  // チャートセクション: 基準軌跡が無いと描画不可
  const initialActive = decorated.filter(r => r.chartOn && r.traj && r.traj.length >= 2);
  const chartHtml = (baseTraj && baseMilestones.length >= 2) ? `
    <div class="px-4 py-3 border-b border-gray-100 bg-white relative">
      <div class="flex items-center justify-between mb-1">
        <div class="text-[11px] text-gray-500">
          <span class="inline-block w-3 h-[3px] align-middle mr-1 rounded" style="background:#111827"></span><span class="font-bold text-gray-700">${baseName}</span> と Top ${initialActive.length} の軌跡を重ね描画
        </div>
        <div class="sim-chart-counter text-[10px] text-gray-400 font-display">${initialActive.length} / ${decorated.length} 名を重ね描画中</div>
      </div>
      <div class="sim-chart-container relative">${buildSimilarityChartSvg(baseEntry, initialActive, baseMilestones, baseWarping)}</div>
      <div class="sim-chart-tooltip hidden absolute pointer-events-none bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs z-30 max-w-[240px]"></div>
      <p class="text-[10px] text-gray-400 mt-1">
        Y軸=順位 (表示中の軌跡の範囲に自動ズーム、基準シーズン ${escapeHtml(cfg.short)} の総数で換算)。X軸 tick は基準シーズンの milestone。
        <span class="inline-block w-2 h-2 bg-pink-300 align-middle mx-1"></span>順位発表式
      </p>
    </div>
  ` : '';

  root.innerHTML = `
    <div class="similar-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="similar-modal-panel relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="similar-modal-title">
        <div class="bg-gradient-to-r ${cfg.accentClass} text-white px-4 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            ${baseImg ? `<img src="${escapeHtml(baseImg)}" alt="" referrerpolicy="no-referrer" class="w-12 h-12 rounded-full object-cover bg-white/20 shrink-0" />` : ''}
            <div class="min-w-0">
              <div class="text-[10px] uppercase tracking-widest opacity-80">${escapeHtml(cfg.label)} ・ 類似軌跡</div>
              <h2 id="similar-modal-title" class="text-base font-bold truncate">${baseName}${baseStage}</h2>
            </div>
          </div>
          <button class="modal-close shrink-0 ml-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl leading-none" aria-label="類似軌跡モーダルを閉じる">×</button>
        </div>
        <div class="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <span class="text-xs text-gray-500">対象:</span>
          <label class="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" name="similar-filter" value="all" ${filter !== 'other' ? 'checked' : ''} class="modal-filter accent-gray-700" />
            <span>全シーズン</span>
          </label>
          <label class="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" name="similar-filter" value="other" ${filter === 'other' ? 'checked' : ''} class="modal-filter accent-gray-700" />
            <span>このシーズン以外</span>
          </label>
          <span class="text-[10px] text-gray-400 ml-auto">位置の近さで比較 (距離 d=0 が完全一致)</span>
        </div>
        ${chartHtml}
        <div class="overflow-y-auto flex-1 p-3 bg-gray-50">
          <ul class="space-y-1.5">${baseRow}${resultRows}</ul>
          ${emptyMsg}
        </div>
      </div>
    </div>
  `;

  // 描画状態を root に保持して、イベントハンドラから参照できるようにする
  root._simState = { baseEntry, decorated, baseMilestones, baseWarping };

  bindSimilarityModalEvents(root, seasonId, imageId);
}

function bindSimilarityModalEvents(root, seasonId, imageId) {
  root.querySelector('.modal-close')?.addEventListener('click', closeSimilarityModal);
  root.querySelector('.similar-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSimilarityModal();
  });
  root.querySelectorAll('.modal-filter').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        root.dataset.filter = radio.value;
        renderSimilarityModal(root, seasonId, imageId, radio.value);
      }
    });
  });
  root.querySelectorAll('.modal-goto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetSeason = btn.dataset.season;
      const targetIid = btn.dataset.iid;
      activateTab(targetSeason);
      const targetPanel = document.getElementById(targetSeason);
      const chartTab = targetPanel?.querySelector('.subtab-btn[data-subtab="chart"]');
      chartTab?.click();
      // 同じ root の中身を新しい基準で描き直す (再帰呼び出しと同等)
      renderSimilarityModal(root, targetSeason, targetIid, root.dataset.filter === 'other' ? 'other' : 'all');
    });
  });

  // 行内の ● トグル: チャートに表示/非表示
  root.querySelectorAll('.sim-toggle-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = dot.closest('.sim-result');
      if (!li || !root._simState) return;
      const iid = li.dataset.iid;
      const entry = root._simState.decorated.find(r => r.trainee.image_id === iid);
      if (!entry || !entry.traj || entry.traj.length < 2) return;
      entry.chartOn = !entry.chartOn;
      refreshSimilarityChart(root, root._simState.baseEntry, root._simState.decorated, root._simState.baseMilestones, root._simState.baseWarping);
    });
  });

  // リスト行 hover ⇄ チャート線
  const resultList = root.querySelector('ul');
  if (resultList) {
    resultList.addEventListener('mouseover', (e) => {
      const li = e.target.closest('.sim-result');
      if (!li) return;
      const iid = li.dataset.iid;
      if (li.dataset.chartOn === 'true') highlightSimLine(root, iid);
    });
    resultList.addEventListener('mouseleave', () => clearSimLineHighlight(root));
  }

  // チャート内 hover: 線/点/ラベル → 強調 + ツールチップ
  const chartContainer = root.querySelector('.sim-chart-container');
  const tooltip = root.querySelector('.sim-chart-tooltip');
  if (chartContainer && tooltip && root._simState) {
    const state = root._simState;
    const idMap = new Map(state.decorated.map(r => [r.trainee.image_id, r]));
    const baseIid = state.baseEntry.trainee.image_id;
    chartContainer.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-iid]');
      if (!el) return;
      const iid = el.dataset.iid;
      highlightSimLine(root, iid);
      if (iid === baseIid) {
        tooltip.innerHTML = `<div class="font-bold text-sm">${escapeHtml(state.baseEntry.trainee.name_jp || state.baseEntry.trainee.name_romaji || '?')}</div><div class="text-[11px] text-gray-500 mt-0.5">基準軌跡</div>`;
        tooltip.classList.remove('hidden');
      } else {
        const entry = idMap.get(iid);
        if (entry) showSimTooltip(root, tooltip, entry, state.baseEntry, state.baseMilestones, state.baseWarping);
      }
    });
    chartContainer.addEventListener('mousemove', (e) => {
      if (tooltip.classList.contains('hidden')) return;
      positionSimTooltip(chartContainer, tooltip, e);
    });
    chartContainer.addEventListener('mouseleave', () => {
      clearSimLineHighlight(root);
      tooltip.classList.add('hidden');
    });
  }

  if (!root._escBound) {
    const onKey = (e) => {
      if (e.key === 'Escape' && document.getElementById('similar-modal-root')?.firstChild) {
        closeSimilarityModal();
      }
    };
    document.addEventListener('keydown', onKey);
    root._escBound = true;
  }

  // Focus trap: Tab/Shift+Tab がモーダル内をループするように制約
  const panel = root.querySelector('.similar-modal-panel');
  if (panel) {
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
    // open 時に閉じるボタンへ焦点を移す (WAI-ARIA Dialog Pattern)
    // synthetic click 経路でも確実に焦点が乗るよう rAF + microtask の二段がけ
    const focusClose = () => {
      const btn = root.querySelector('.modal-close');
      if (btn && document.contains(btn)) btn.focus();
    };
    requestAnimationFrame(focusClose);
    setTimeout(focusClose, 50);
  }
}

// =========================================================================
// 練習生カード (subpanel-grid)
// =========================================================================

function traineeCard(trainee, season, urlTemplate, debutCap = 11) {
  const img = buildImageUrl(urlTemplate, trainee);
  const cfg = SEASON_CONFIG[season] || {};
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

  const profileUrl = buildProfileUrl(season, trainee.image_id);
  const nameHtml = profileUrl
    ? `<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer"
          class="hover:underline hover:text-${cfg.tw || 'gray'}-600 transition-colors"
          title="公式プロフィール: ${nameJp} (新しいタブで開く)">${nameJp}</a>`
    : nameJp;

  return `
    <article class="trainee-card group relative bg-white rounded-xl overflow-hidden cursor-pointer ${ringCls} hover:shadow-xl transition-all hover:-translate-y-1"
             data-name="${nameJp.toLowerCase()} ${nameRomaji.toLowerCase()}" data-rank="${trainee.rank ?? 999}"
             data-iid="${escapeHtml(trainee.image_id || '')}" data-season="${escapeHtml(season)}"
             title="クリックで類似軌跡を表示">
      <div class="relative aspect-[3/4] bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center text-gray-400 font-display text-4xl font-black select-none">
          ${escapeHtml(initials)}
        </div>
        ${imgHtml}
        <div class="absolute top-1.5 left-1.5">${rankBadge(trainee, debutCap)}</div>
        ${debuted ? '<div class="absolute top-1.5 right-1.5 bg-yellow-400 text-yellow-900 text-[9px] font-display font-black px-1.5 py-0.5 rounded">DEBUT</div>' : ''}
      </div>
      <div class="p-2 sm:p-2.5">
        <div class="font-bold text-xs sm:text-sm truncate" title="${nameJp}">${nameHtml}</div>
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
  const debutCap = data.debut_count ?? 11;

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
      <button class="subtab-btn px-4 py-1.5 rounded-md text-gray-500 hover:text-gray-700 transition-colors" data-subtab="chart" role="tab" aria-selected="false">順位推移グラフ</button>
    </nav>
  ` : '';

  const maxRank = data.total_trainees || trainees.length || 101;

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
          <input type="search" placeholder="名前で検索..." aria-label="練習生名で検索 (日本語またはローマ字)" class="search-input w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${cfg.color}-500" />
          <svg class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
        </div>
        <label class="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" class="filter-debuted accent-yellow-500" />
          <span>デビュー組のみ</span>
        </label>
      </div>

      <div class="trainee-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
        ${trainees.map(t => traineeCard(t, panelId, urlTemplate, debutCap)).join('')}
      </div>
      <p class="empty-msg hidden text-center py-12 text-gray-400 text-sm">該当する練習生が見つかりません</p>
    </div>

    ${showHistoryTab ? `<div class="subpanel subpanel-history hidden" data-subpanel="history">
      ${renderRankingHistoryTable(trainees, milestones, urlTemplate, panelId, debutCap)}
    </div>` : ''}

    ${showHistoryTab ? `<div class="subpanel subpanel-chart hidden" data-subpanel="chart">
      ${renderRankingChart(trainees, milestones, panelId, cfg, maxRank, debutCap)}
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
      const matchDebut = !debutOnly || (rank <= debutCap);
      const show = matchName && matchDebut;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    emptyMsg.classList.toggle('hidden', shown > 0);
  };
  searchInput.addEventListener('input', debounce(applyFilter, 150));
  debutFilter.addEventListener('change', applyFilter);

  grid.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const card = e.target.closest('.trainee-card');
    if (!card) return;
    const iid = card.dataset.iid;
    const season = card.dataset.season;
    if (!iid || !season) return;
    openSimilarityModal(season, iid);
  });

  if (showHistoryTab) {
    bindSubtabs(panel);
    bindHistorySorting(panel, trainees, milestones, urlTemplate, panelId, debutCap);
    bindChartControls(panel, trainees, milestones, maxRank, debutCap);
  }
}

function activateTab(target) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === target;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.tabIndex = isActive ? 0 : -1;
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
  document.querySelectorAll('.season-panel').forEach(p => {
    const isActive = p.id === target;
    p.classList.toggle('hidden', !isActive);
    p.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
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
  const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
  // Tablist の矢印キーナビ (WAI-ARIA Authoring Practices 準拠)
  document.getElementById('tab-list')?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const idx = tabBtns.findIndex(b => b === document.activeElement);
    let next = idx;
    if (e.key === 'ArrowLeft')  next = (idx <= 0 ? tabBtns.length - 1 : idx - 1);
    if (e.key === 'ArrowRight') next = (idx + 1) % tabBtns.length;
    if (e.key === 'Home')       next = 0;
    if (e.key === 'End')        next = tabBtns.length - 1;
    const t = tabBtns[next];
    if (t) { t.focus(); activateTab(t.dataset.tab); }
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

  // 各 season JSON の更新情報を fallback 含めて拾う:
  //   - 完結シーズン: `air_dates` 末尾の日付 (例 "2019-09-26 〜 2019-12-11")
  //   - 放送中シーズン (SHINSEKAI): `last_updated_episode` (例 "Episode 9 (2026-05-15)")
  //   - 将来 `last_updated` が追加されたらそれを最優先で採用
  const updates = Object.entries(seasonData)
    .filter(([, d]) => d)
    .map(([key, d]) => {
      if (d.last_updated) return { key, text: d.last_updated, ts: d.last_updated };
      if (d.last_updated_episode) return { key, text: `${d.season || key}: ${d.last_updated_episode}`, ts: d.last_updated_episode };
      if (d.air_dates) {
        const m = d.air_dates.match(/(\d{4}-\d{2}-\d{2})\s*(?:〜|~|-)?\s*(\d{4}-\d{2}-\d{2})?$/);
        if (m) return { key, text: `${d.season || key}: ${m[2] || m[1]} 放送終了`, ts: m[2] || m[1] };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const latest = updates[0];
  if (latest) document.getElementById('last-updated').textContent = latest.text;
}

document.addEventListener('DOMContentLoaded', init);
