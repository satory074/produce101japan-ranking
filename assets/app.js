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
  if (panelId === 'shinsekai') {
    trainees.forEach(t => {
      if (typeof t.rank === 'number' && t.rank <= 11) set.add(t.image_id);
    });
  } else {
    trainees.forEach(t => {
      if (t.debuted === true) set.add(t.image_id);
    });
  }
  return set;
}

function renderTraineePicker(trainees, defaultSet, cfg) {
  const items = trainees.map((t, i) => {
    const checked = defaultSet.has(t.image_id);
    const nameJp = escapeHtml(t.name_jp || t.name_romaji || '?');
    const nameRomaji = escapeHtml(t.name_romaji || '');
    const stage = t.stage_name ? `<span class="text-[10px] text-gray-400 ml-1">${escapeHtml(t.stage_name)}</span>` : '';
    const searchKey = `${nameJp} ${nameRomaji} ${t.stage_name || ''}`.toLowerCase();
    return `
      <li class="chart-picker-item" data-search="${escapeHtml(searchKey)}">
        <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs">
          <input type="checkbox" class="chart-checkbox accent-${cfg.color}-500"
                 data-iid="${escapeHtml(t.image_id)}" ${checked ? 'checked' : ''} />
          <svg class="color-swatch shrink-0" width="20" height="6" data-iid-swatch="${escapeHtml(t.image_id)}"><line x1="0" y1="3" x2="20" y2="3" stroke="transparent" stroke-width="3" /></svg>
          <span class="truncate flex-1"><span class="font-bold">${nameJp}</span>${stage}</span>
        </label>
      </li>
    `;
  }).join('');

  return `
    <aside class="chart-aside lg:w-64 shrink-0 bg-white border border-gray-200 rounded-lg p-3">
      <div class="mb-2">
        <input type="search" class="chart-filter w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-${cfg.color}-500" placeholder="絞り込み..." />
      </div>
      <div class="flex flex-wrap gap-1 mb-2">
        <button class="chart-preset px-2 py-1 text-[11px] rounded bg-${cfg.color}-50 text-${cfg.color}-700 hover:bg-${cfg.color}-100 font-bold" data-preset="debut">デビュー組</button>
        <button class="chart-preset px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 hover:bg-gray-200" data-preset="top11">Top11</button>
        <button class="chart-preset px-2 py-1 text-[11px] rounded bg-gray-100 text-gray-700 hover:bg-gray-200" data-preset="none">全解除</button>
      </div>
      <ul class="chart-picker max-h-[480px] overflow-y-auto pr-1 -mr-1">${items}</ul>
      <p class="chart-counter text-[10px] text-gray-500 mt-2">— / ${trainees.length} 名選択中</p>
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

function buildChartSvg(selected, milestones, maxRank) {
  // チャート縦幅: 1 順位あたり ~11px を確保 → Top 11 zone でも 11 ラベルが
  // 自然に重ならない高さ。1100 + padT + padB で約 1170px の縦長レイアウト
  const W = 880, H = 1170;
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

  // Top 11 デビュー圏ハイライト帯
  const top11Cap = Math.min(11, maxRank);
  const top11Band = `
    <rect class="chart-top11-band" x="${padL}" y="${yAt(1).toFixed(1)}" width="${innerW}" height="${(yAt(top11Cap) - yAt(1)).toFixed(1)}" fill="#fde047" fill-opacity="0.14" />
    <text x="${padL + innerW - 4}" y="${(yAt(top11Cap) - 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#a16207" font-weight="bold" font-family="Orbitron,sans-serif">TOP 11 デビュー圏</text>
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

    return `<g data-iid="${id}" class="chart-trainee-group" style="cursor:pointer;">${polylines}${points}</g>`;
  }).join('');

  // エンドポイント名を deconflict して別グループで描画
  deconflictLabels(endpointEntries, { top: padT + 6, bottom: padT + innerH - 4 });
  const endpointHtml = endpointEntries.map(e => {
    const moved = Math.abs(e.finalY - e.idealY) > 3;
    const labelX = e.pointX + 8;
    const leader = moved
      ? `<line x1="${e.pointX.toFixed(1)}" y1="${e.pointY.toFixed(1)}" x2="${(labelX - 2).toFixed(1)}" y2="${e.finalY.toFixed(1)}" stroke="${e.color}" stroke-width="1" stroke-dasharray="1 2" opacity="0.55" class="chart-endpoint-leader" data-iid="${escapeHtml(e.iid)}" />`
      : '';
    const text = `<text x="${labelX.toFixed(1)}" y="${e.finalY.toFixed(1)}" font-size="10" fill="${e.color}" font-weight="bold" class="chart-endpoint-label" data-iid="${escapeHtml(e.iid)}" font-family="Noto Sans JP,sans-serif" stroke="white" stroke-width="3" paint-order="stroke">${escapeHtml(e.text)}</text>`;
    return leader + text;
  }).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
         class="chart-svg w-full h-auto bg-white border border-gray-200 rounded-lg">
      <g class="chart-band">${top11Band}</g>
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

function refreshChart(panel, trainees, milestones, maxRank) {
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
  if (container) container.innerHTML = buildChartSvg(selected, milestones, maxRank);
  const counter = panel.querySelector('.chart-counter');
  if (counter) counter.textContent = `${selected.length} / ${trainees.length} 名選択中`;
}

function renderRankingChart(trainees, milestones, panelId, cfg, maxRank) {
  const defaultSet = defaultChartSelection(trainees, panelId);
  const initialSelected = trainees
    .filter(t => defaultSet.has(t.image_id))
    .map((t, idx) => {
      const { color, dasharray } = chartLineStyle(idx);
      return { trainee: t, color, dasharray };
    });
  return `
    <div class="flex flex-col lg:flex-row gap-4">
      ${renderTraineePicker(trainees, defaultSet, cfg)}
      <div class="flex-1 min-w-0 relative">
        <div class="chart-svg-container">${buildChartSvg(initialSelected, milestones, maxRank)}</div>
        <div class="chart-tooltip hidden absolute pointer-events-none bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs z-30 max-w-[200px]"></div>
        <p class="text-[11px] text-gray-500 mt-2">
          Y軸=順位 (1位が上)。
          <span class="inline-block w-3 h-2 bg-yellow-200 align-middle mx-1"></span>Top 11 デビュー圏
          <span class="inline-block w-2 h-2 bg-pink-300 align-middle mx-1"></span>順位発表式列
          ・線にホバーで詳細表示
        </p>
      </div>
    </div>
  `;
}

function bindChartControls(panel, trainees, milestones, maxRank) {
  const picker = panel.querySelector('.chart-picker');
  if (!picker) return;

  // Initial swatch colors for default-checked trainees
  refreshChart(panel, trainees, milestones, maxRank);

  // Checkbox toggle
  picker.addEventListener('change', (e) => {
    if (e.target.matches('.chart-checkbox')) {
      refreshChart(panel, trainees, milestones, maxRank);
    }
  });

  // Filter input
  const filter = panel.querySelector('.chart-filter');
  if (filter) {
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      panel.querySelectorAll('.chart-picker-item').forEach(li => {
        const match = !q || (li.dataset.search || '').includes(q);
        li.style.display = match ? '' : 'none';
      });
    });
  }

  // Preset buttons
  panel.querySelectorAll('.chart-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const cbs = panel.querySelectorAll('.chart-checkbox');
      let nextChecked = new Set();
      if (preset === 'debut') {
        trainees.forEach(t => { if (t.debuted === true) nextChecked.add(t.image_id); });
      } else if (preset === 'top11') {
        trainees.forEach(t => { if (typeof t.rank === 'number' && t.rank <= 11) nextChecked.add(t.image_id); });
      } else if (preset === 'none') {
        nextChecked = new Set();
      }
      cbs.forEach(cb => { cb.checked = nextChecked.has(cb.dataset.iid); });
      refreshChart(panel, trainees, milestones, maxRank);
    });
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
      showChartTooltip(panel, tooltip, idMap.get(iid), milestones);
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

function showChartTooltip(panel, tooltip, trainee, milestones) {
  if (!trainee) return;
  const nameJp = escapeHtml(trainee.name_jp || trainee.name_romaji || '');
  const stage = trainee.stage_name ? ` <span class="text-gray-400">(${escapeHtml(trainee.stage_name)})</span>` : '';
  const rows = milestones.map(m => {
    const r = trainee.rank_history?.[m.key];
    const rankStr = r == null ? '<span class="text-gray-300">—</span>' : `<span class="font-bold ${rankTooltipColor(r)}">${r}位</span>`;
    const cer = m.ceremony ? 'text-pink-700 font-bold' : 'text-gray-600';
    return `<div class="flex justify-between gap-3"><span class="${cer}">${escapeHtml(m.short || m.label)}</span>${rankStr}</div>`;
  }).join('');
  tooltip.innerHTML = `<div class="font-bold mb-1">${nameJp}${stage}</div>${rows}`;
  tooltip.classList.remove('hidden');
}

function rankTooltipColor(r) {
  if (r === 1) return 'text-yellow-600';
  if (r <= 3) return 'text-amber-700';
  if (r <= 11) return 'text-yellow-700';
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
// 練習生カード (subpanel-grid)
// =========================================================================

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

    ${showHistoryTab ? `<div class="subpanel subpanel-chart hidden" data-subpanel="chart">
      ${renderRankingChart(trainees, milestones, panelId, cfg, maxRank)}
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
    bindChartControls(panel, trainees, milestones, maxRank);
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
