#!/usr/bin/env node
// build-pages.mjs — data/*.json から、JS を実行しなくても読める HTML を書き出す。依存なし (Node 20+)。
//
//   node scripts/build-pages.mjs
//
// 書き出すもの (どれも commit する。GitHub Pages は main 直下をそのまま配信するのでビルド工程は無い):
//   - index.html の <!-- build:* --> の間 (head のメタ・JSON-LD、シリーズ一覧、タブの data-title)
//   - season1/ season2/ thegirls/ shinsekai/ の index.html (index.html を型にして、そのシーズンの順位表を入れたもの)
//   - sitemap.xml (トップ + 4 シーズン)
//
// index.html の <!-- build:* --> の外側 (ヒーロー・タブ・フッター・スクリプト) が全ページ共通の型。
// そこを直したらこのスクリプトを流し直す。data/*.json を直したときも同じ。CI (.github/workflows/check-pages.yml)
// が流し直して差分が出たら落ちる (= JSON とページがずれたまま main に入らない)。
//
// ブラウザでは assets/app.js が JSON を読み直し、各パネルの中身 (ここで書いた表) をカード一覧などで描き直す。

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_URL = "https://satory074.github.io/produce101japan-ranking/";
const OG_IMAGE = `${SITE_URL}assets/og.png`;
const BASE_TITLE = "PRODUCE 101 JAPAN 全シリーズ・ランキング一覧";
// satory074.com 側で Person として定義している @id (全アプリ共通)
const AUTHOR = { "@type": "Person", "@id": "https://satory074.com/#person", name: "satory074", url: "https://satory074.com/" };

// タブ・パネルの並び順。label はタブとパネル見出しの表記、accent / text は app.js の SEASON_CONFIG と同じクラス
// (JS が描き直すまでの間、見出しの色が変わらないようにするためだけに使う)
const SEASONS = [
    { id: "season1", label: "SEASON 1", accent: "from-orange-500 to-orange-700", text: "text-s1-700" },
    { id: "season2", label: "SEASON 2", accent: "from-blue-500 to-blue-700", text: "text-s2-700" },
    { id: "thegirls", label: "THE GIRLS", accent: "from-pink-500 to-pink-700", text: "text-s3-700" },
    { id: "shinsekai", label: "SHINSEKAI", nameJa: "新世界 (SHINSEKAI)", accent: "from-purple-500 to-purple-700", text: "text-s4-700" },
];

// app.js の PROFILE_URL_TEMPLATE と同じ (公式プロフィール。シーズンごとに URL の形が違う)
const PROFILE_URL_TEMPLATE = {
    season1: "https://1st.produce101.jp/profile/?id={image_id}",
    season2: "https://2nd.produce101.jp/profile/{image_id}",
    thegirls: "https://3rd.produce101.jp/profile/detail/?id={image_id}",
    shinsekai: "https://produce101.jp/profile/detail/?id={image_id}",
};

// app.js の FIXED_HISTORY_COLS と同じ並び (順位推移表の名前の直後の 7 列)。cell は HTML (エスケープ済み) か null
const FIXED_COLS = [
    { label: "レベル分けテスト (クラス)", cell: (t) => (t.level_test ? esc(t.level_test) : null) },
    { label: "再評価 (クラス)", cell: (t) => (t.re_evaluation ? esc(t.re_evaluation) : null) },
    { label: "レベル分けテスト課題曲", cell: (t) => battle(t.level_test_team) },
    { label: "グループバトル課題曲", cell: (t) => battle(t.group_battle) },
    { label: "ポジションバトル課題曲", cell: (t) => battle(t.position_battle) },
    { label: "コンセプト評価課題曲", cell: (t) => battle(t.concept_battle) },
    { label: "デビュー評価課題曲", cell: (t) => battle(t.debut_evaluation) },
];

// ---------- 小道具 ----------

const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** JSON-LD を <script> に埋める (</script> で切れないよう < を逃がす) */
const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, "\\u003c").replace(/^/gm, "  ");

/** 課題曲セル。app.js と同じく勝ったときだけ WIN を付け、チーム名は出さない */
function battle(b) {
    if (!b || !b.song) return null;
    return b.result === "win" ? `${esc(b.song)} <span class="font-bold text-green-700">WIN</span>` : esc(b.song);
}

const fmtNumber = (n) => n.toLocaleString("ja-JP");
const pageUrl = (season) => (season ? `${SITE_URL}${season.id}/` : SITE_URL);
const seasonTitle = (season, data) => `${season.label} (${data.debut_group}) 順位一覧`;
const sortByRank = (trainees) => [...trainees].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

/** start/end の印の間を差し替える。印がちょうど 1 組でなければ止める (型が壊れたまま書き出さない) */
function replaceRegion(html, name, content) {
    const re = new RegExp(`(<!-- build:${name}\\b[\\s\\S]*?-->)[\\s\\S]*?(<!-- /build:${name} -->)`, "g");
    const count = (html.match(re) ?? []).length;
    if (count !== 1) throw new Error(`index.html の <!-- build:${name} --> が ${count} 組ある (1 組のはず)`);
    return html.replace(re, (_, start, end) => `${start}${content}${end}`);
}

function replaceExactlyOnce(html, re, replacer, what) {
    const count = (html.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []).length;
    if (count !== 1) throw new Error(`index.html の ${what} が ${count} 個ある (1 個のはず)`);
    return html.replace(re, replacer);
}

// ---------- データ ----------

const data = Object.fromEntries(
    SEASONS.map((s) => [s.id, JSON.parse(readFileSync(join(ROOT_DIR, "data", `${s.id}.json`), "utf8"))]),
);

for (const s of SEASONS) {
    const d = data[s.id];
    if (!Array.isArray(d.trainees) || d.trainees.length === 0) throw new Error(`data/${s.id}.json に trainees が無い`);
    if (!d.debut_group) throw new Error(`data/${s.id}.json に debut_group が無い (タイトルに使う)`);
    const ids = d.trainees.map((t) => t.image_id).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error(`data/${s.id}.json の image_id が重複している (行の id="t-…" に使う)`);
}

function description(season) {
    const d = data[season.id];
    const ms = d.ranking_milestones ?? [];
    const span = ms.length > 0 ? `、${ms[0].label}から${ms[ms.length - 1].label}までの順位推移` : "";
    const name = season.nameJa ?? season.label;
    return `PRODUCE 101 JAPAN ${name} (${d.year}年放送・デビュー組 ${d.debut_group}) の練習生 ${d.trainees.length} 名の最終順位${span}の一覧。レベル分けテストのクラスや各評価の課題曲も載せています。`;
}

// ---------- head (title・説明・canonical・JSON-LD・OG・Twitter) ----------

const ROOT_META = {
    title: BASE_TITLE,
    description:
        "PRODUCE 101 JAPAN 全シリーズ (JO1 / INI / ME:I / SHINSEKAI) の練習生ランキング・順位推移を横断的に可視化。初期評価から最終回までの軌跡グラフと、シーズンを跨いだ軌跡類似度検索が利用できます。",
    ogDescription: "JO1 / INI / ME:I / SHINSEKAI の練習生ランキング・順位推移を横断的に可視化。シーズン跨ぎの軌跡類似度検索も。",
    twitterDescription: "JO1 / INI / ME:I / SHINSEKAI の練習生ランキング・順位推移を横断的に可視化。",
    jsonld: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        name: BASE_TITLE,
        alternateName: "PRODUCE 101 JAPAN All Series Ranking",
        url: SITE_URL,
        inLanguage: "ja",
        description:
            "PRODUCE 101 JAPAN 全シリーズ (JO1 / INI / ME:I / SHINSEKAI) の練習生ランキング・順位推移を横断的に可視化。シーズン跨ぎの軌跡類似度検索も提供。",
        author: AUTHOR,
    },
};

function seasonMeta(season) {
    const title = `${seasonTitle(season, data[season.id])} - ${BASE_TITLE}`;
    const desc = description(season);
    return {
        title,
        description: desc,
        ogDescription: desc,
        twitterDescription: desc,
        jsonld: {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${pageUrl(season)}#webpage`,
            name: title,
            url: pageUrl(season),
            description: desc,
            inLanguage: "ja",
            isPartOf: { "@id": `${SITE_URL}#website` },
            author: AUTHOR,
        },
    };
}

function metaBlock(meta, url) {
    return `
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />

  <!-- JSON-LD -->
  <script type="application/ld+json">
${jsonLd(meta.jsonld)}
  </script>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.ogDescription)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="PRODUCE 101 JAPAN All Series Ranking" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.twitterDescription)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  `;
}

// ---------- トップ: シリーズ一覧 (JS が動いたら app.js が消して、いつもの画面にする) ----------

function summaryBlock() {
    const cards = SEASONS.map((s) => {
        const d = data[s.id];
        const debut = sortByRank(d.trainees.filter((t) => t.debuted === true));
        const members = debut.map((t) => `${t.rank}位 ${esc(t.name_jp || t.name_romaji)}`).join("、");
        return `
        <article class="rounded-xl bg-white ring-1 ring-gray-200 p-4">
          <h3 class="font-bold"><a class="${s.text} hover:underline" href="./${s.id}/">${esc(seasonTitle(s, d))}</a></h3>
          <p class="text-sm text-gray-600 mt-1">${d.year}年放送 / 練習生 ${d.trainees.length} 名 / デビュー組 ${esc(d.debut_group)} (${debut.length} 名)</p>
          <p class="text-sm text-gray-700 mt-2">デビューメンバー (最終順位): ${members}</p>
        </article>`;
    }).join("");
    return `
    <section id="series-summary" data-static-summary class="mb-8" aria-labelledby="series-summary-title">
      <h2 id="series-summary-title" class="text-xl font-black mb-4">シリーズ一覧</h2>
      <div class="grid gap-4 sm:grid-cols-2">${cards}
      </div>
    </section>
    `;
}

// ---------- シーズンページ: パネルの中身 (見出し + 全練習生の順位表) ----------

function panelBlock(season) {
    const d = data[season.id];
    const trainees = sortByRank(d.trainees);
    const milestones = d.ranking_milestones ?? [];
    const debutCount = trainees.filter((t) => t.debuted).length;
    const hasStage = trainees.some((t) => t.stage_name);
    const hasVotes = trainees.some((t) => typeof t.votes_final === "number");
    const cell = (v) => `<td>${v ?? '<span class="text-gray-300">—</span>'}</td>`;

    const head = [
        "順位",
        "名前",
        "ローマ字",
        ...(hasStage ? ["芸名"] : []),
        "デビュー",
        ...(hasVotes ? ["最終得票数"] : []),
        ...FIXED_COLS.map((c) => c.label),
        ...milestones.map((m) => m.label),
    ];

    const rows = trainees.map((t) => {
        const profile = t.image_id ? PROFILE_URL_TEMPLATE[season.id]?.replace("{image_id}", encodeURIComponent(t.image_id)) : null;
        const name = esc(t.name_jp || t.name_romaji || "?");
        const nameHtml = profile
            ? `<a class="font-bold hover:underline" href="${esc(profile)}" target="_blank" rel="noopener noreferrer" title="公式プロフィール: ${name} (新しいタブで開く)">${name}</a>`
            : `<span class="font-bold">${name}</span>`;
        const cells = [
            cell(t.rank ?? null),
            `<th scope="row" class="text-left whitespace-nowrap">${nameHtml}</th>`,
            cell(t.name_romaji ? esc(t.name_romaji) : null),
            ...(hasStage ? [cell(t.stage_name ? esc(t.stage_name) : null)] : []),
            cell(t.debuted ? '<span class="font-bold">デビュー</span>' : null),
            ...(hasVotes ? [cell(typeof t.votes_final === "number" ? fmtNumber(t.votes_final) : null)] : []),
            ...FIXED_COLS.map((c) => cell(c.cell(t))),
            ...milestones.map((m) => cell(t.rank_history?.[m.key] ?? null)),
        ];
        const id = t.image_id ? ` id="t-${esc(t.image_id)}"` : "";
        return `<tr${id}>${cells.join("")}</tr>`;
    });

    const onAir = d.ongoing
        ? `<span class="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">放送中</span>`
        : "";
    const updateInfo = d.last_updated_episode ? `<span class="text-xs text-gray-500">${esc(d.last_updated_episode)} 時点</span>` : "";

    return `
      <section class="mb-4" data-static-panel>
        <div class="flex flex-wrap items-center gap-3 mb-2">
          <h2 class="font-display text-2xl sm:text-3xl font-black bg-gradient-to-r ${season.accent} bg-clip-text text-transparent">${esc(d.season || season.label)}</h2>
          ${onAir}
          ${updateInfo}
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          <div><span class="text-gray-400">放送:</span> ${esc(d.air_dates || "—")}</div>
          <div><span class="text-gray-400">デビュー組:</span> <span class="font-bold ${season.text}">${esc(d.debut_group)}</span> (${debutCount}名)</div>
          <div><span class="text-gray-400">練習生数:</span> ${d.total_trainees ?? trainees.length}名</div>
        </div>
      </section>
      <div class="overflow-x-auto rounded-lg ring-1 ring-gray-200 bg-white">
        <table class="min-w-full text-xs [&_td]:px-2 [&_td]:py-1 [&_td]:border-b [&_td]:border-gray-100 [&_td]:whitespace-nowrap [&_th]:px-2 [&_th]:py-1 [&_th]:border-b [&_th]:border-gray-100 [&_thead_th]:bg-gray-50 [&_thead_th]:text-gray-600 [&_thead_th]:whitespace-nowrap">
          <caption class="text-left text-sm text-gray-600 px-2 py-2">${esc(season.nameJa ?? season.label)} の練習生 ${trainees.length} 名の最終順位と、各評価・順位発表式での順位 (— は記録なし・脱落後)</caption>
          <thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>
${rows.join("\n")}
          </tbody>
        </table>
      </div>
      `;
}

// ---------- ページを組み立てる ----------

const template = readFileSync(join(ROOT_DIR, "index.html"), "utf8");

/** season = null ならトップ。型 (index.html) から 1 ページ分の HTML を作る */
function renderPage(season) {
    const selected = season ? season.id : SEASONS[0].id;
    let html = template;

    html = replaceRegion(html, "meta", metaBlock(season ? seasonMeta(season) : ROOT_META, pageUrl(season)));
    html = replaceRegion(html, "summary", season ? "" : summaryBlock());
    for (const s of SEASONS) {
        html = replaceRegion(html, `panel:${s.id}`, season?.id === s.id ? panelBlock(s) : "");
        // 表示中のパネルだけ hidden を外す (JS の activateTab と同じ状態にしておく)
        html = replaceExactlyOnce(
            html,
            new RegExp(`<div id="${s.id}" class="season-panel( hidden)?"`),
            `<div id="${s.id}" class="season-panel${s.id === selected ? "" : " hidden"}"`,
            `パネル #${s.id}`,
        );
        // タブ: JS がタブ切替で document.title に入れる文字列 = そのシーズンページの <title>
        html = replaceExactlyOnce(
            html,
            new RegExp(`(<a href="\\./${s.id}/" id="tab-btn-${s.id}" data-tab="${s.id}") data-title="[^"]*"`),
            `$1 data-title="${esc(seasonMeta(s).title)}"`,
            `タブ #tab-btn-${s.id}`,
        );
        html = replaceExactlyOnce(
            html,
            new RegExp(`aria-selected="(?:true|false)" aria-controls="${s.id}" tabindex="(?:-1|0)"`),
            `aria-selected="${s.id === selected}" aria-controls="${s.id}" tabindex="${s.id === selected ? 0 : -1}"`,
            `タブ ${s.id} の aria-selected`,
        );
    }

    // data / assets / 他シーズンへの相対パスの起点。app.js が <body data-base> を読む
    html = replaceExactlyOnce(
        html,
        / data-base="[^"]*"( data-season="[^"]*")?>/,
        season ? ` data-base="../" data-season="${season.id}">` : ` data-base="./">`,
        "<body data-base>",
    );
    if (season) html = html.replace(/(\s(?:href|src))="\.\//g, '$1="../');
    return html;
}

const written = [];
function write(rel, content) {
    const p = join(ROOT_DIR, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
    written.push(rel);
}

write("index.html", renderPage(null));
for (const s of SEASONS) write(`${s.id}/index.html`, renderPage(s));

write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[null, ...SEASONS].map((s) => `  <url><loc>${pageUrl(s)}</loc></url>`).join("\n")}
</urlset>
`,
);

console.log(`build-pages: ${written.join(", ")}`);
