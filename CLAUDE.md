# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

非公式の PRODUCE 101 JAPAN 全シリーズ (JO1 / INI / ME:I / SHINSEKAI) ランキング横断閲覧サイト。GitHub Pages から `main` ブランチ直下を配信。**ビルド工程なし**。

## Dev / deploy commands

```bash
# ローカル起動 (静的ファイル配信のみ)
python3 -m http.server -d . 8000        # → http://localhost:8000/

# GitHub Pages へのデプロイ
git push origin main                     # main 直下が即 https://satory074.github.io/produce101japan-ranking/
gh api /repos/satory074/produce101japan-ranking/pages   # ビルド状態確認 (status: building / built)
```

テスト・lint・型チェックなし (静的HTML/JS)。

## アーキテクチャ

3層構造で、各層が緩く分離されている:

1. **データ層 (`data/*.json`)**: シーズン1本につき1ファイル。`season1.json` / `season2.json` / `thegirls.json` / `shinsekai.json`。トップレベルに `image_url_template` を持ち、これが各シーズンで異なる公式CDNを指す (Season 1 は `web-m.webcdn.stream.ne.jp`、Season 2 は `2nd.produce101.jp`、THE GIRLS は `3rd.produce101.jp`、SHINSEKAI は `produce101.jp` 配下、ランダムトークン入りパスを含む)。**画像URLが切れた場合はこの template を更新するだけで全員分が直る。**

2. **ビュー層 (`index.html`)**: Tailwind CDN + Google Fonts (Noto Sans JP / Orbitron) のみで完結。タブのDOM (`.season-panel`) とヘッダのジャンプボタン (`[data-jump]`) だけ静的に配置し、中身は JS が描画する。Tailwind config は inline `<script>` で `s1`〜`s4` のシーズン別カラーを拡張定義 (SEASON 1=orange / SEASON 2=blue / THE GIRLS=pink / SHINSEKAI=purple)。

3. **コントローラ層 (`assets/app.js`)**:
   - `init()` → 4本のJSONを `Promise.all` で並列fetch → `buildPanel()` で各タブのDOM生成。
   - 画像URLは `buildImageUrl(template, trainee)` が `image_url_template` 優先、未定義なら `DEFAULT_IMAGE_TEMPLATE[panelId]` にフォールバック。
   - 画像読み込み失敗時は `<img onerror>` で `display:none` にし、親 div が描画する1文字イニシャルが代替表示される (Tailwindユーティリティのみで実装、CSSファイルなし)。
   - 検索・絞り込みは各カードの `data-name` / `data-rank` 属性を見て `style.display` を切り替えるだけのDOM操作。
   - 順位推移表サブタブは `buildPanel()` 内で `data.ranking_milestones` の有無を見て条件描画。`renderRankingHistoryTable()` がテーブルHTMLを生成し、`bindSubtabs()` / `bindHistorySorting()` でサブタブ切替・列ソートを束ねる。サブタブ切替は `.subpanel.hidden` トグルだけで状態管理なし。

## データスキーマの注意点

`data/*.json` は同じトップレベル構造だが、`trainees[]` 要素の形が **シーズンによって微妙に違う**:

- **Season 1 / 2 / THE GIRLS**: `{ rank, name_jp, name_romaji, image_id, votes_final, debuted, eliminated_at }` — 完結済みシーズン。`debuted: true` が Top 11 と一致。
- **SHINSEKAI**: `{ rank, name_jp, name_romaji, stage_name, image_id, debuted, ongoing_rank }` — 放送中。`votes_final` / `eliminated_at` なし、代わりに `stage_name` (カード下部に小さく表示) と `ongoing_rank` (Top 50 内かどうか) を持つ。`rank` は `null` を許容 (Top 50 圏外)。

`app.js` の `traineeCard()` はこれらの差分を意識して書かれているので、フィールドの過不足を想定したコードのまま保つこと。

### 順位推移 (`ranking_milestones` + `rank_history`)

任意フィールド。トップレベルの `ranking_milestones` は順序付き配列で、要素は `{ key, label, short, official, ceremony?, episode? }`。各 trainee の `rank_history` は `{ <milestone.key>: number | null }` の辞書 (キー省略 = データなしでダッシュ表示)。
- 存在すれば「順位推移表」サブタブが自動表示される。無いシーズンは履歴タブ非表示 (後方互換)。
- 描画順 = 配列順。新 milestone は配列末尾に push する規約 (過去ファイルを汚さない)。
- key 命名: 週目=`w<n>` (例 `w2`)、順位発表式=`rc<n>` (Final は `rcF`)。
- 表のデフォルトソート列は `ranking_milestones` の最後の要素 = 最新 milestone。
- 既存の `trainee.rank` (最新順位) は最新 milestone の値と一致させる規約 (既存コードが `trainee.rank` を多用するため冗長性を許容)。

## デビュー組の判定

`debuted: true` のカードは黄色枠 + DEBUT バッジ + 順位バッジが金色 (rank=1)・銀色 (2)・銅色 (3)・通常黄 (4-11) になる。「デビュー組のみ」絞り込みは `data-rank <= 11` で判定しているため、SHINSEKAI のように `debuted` が全員 false の放送中シーズンでも Top 11 の暫定枠は表示される。

## SHINSEKAI 更新運用

放送中のため毎週更新が必要。`data/shinsekai.json` のみ書き換えれば良い:
- `last_updated_episode` を更新 (例: `"Episode 9 (2026-05-15)"`)
- `trainees[].rank` を最新の順位発表式の結果で並び替え
- 圏外になった練習生は `rank: null` / `ongoing_rank: false` に

新しい順位発表回が放送された場合 (順位推移表に列を増やす):
1. `ranking_milestones` 末尾に新エントリ追加 (例: `{ "key": "rc3", "label": "第3回順位発表式", "short": "RC3", "official": true, "ceremony": true, "episode": 11 }`)
2. 該当 trainees の `rank_history` に `"rc3": <rank>` を追記。圏外なら省略 (ダッシュ表示)
3. `trainees[].rank` を最新値に同期

最終回後は `ongoing: false` に変更し、`debuted: true` を Top 11 にセット、`votes_final` を最終票数で埋める想定。

## 既知のリスク

- **画像ホットリンク**: 公式CDNの画像URLを直接参照しているため、提供元のCDN構成変更で大量に画像が切れる可能性がある。その場合は対応シーズンの `image_url_template` を新パスに更新する。
- **THE GIRLS は 99名**: 名前付きで番組に登場した実数。`total_trainees: 99` で正しく、`101` に直さないこと。3名は番組開始前に辞退 (`eliminated_at: "left"`)、2名は匿名のため除外。
