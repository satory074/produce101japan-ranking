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
   - 順位推移グラフサブタブ (`subpanel-chart`): `renderRankingChart()` がピュア SVG (折れ線 + 順位ラベル) を生成し、チェックボックスのトグルで `refreshChart()` が再描画。CDN ライブラリ不使用。
     - **デフォルト選択**: 全員。
     - **preset ボタン**: `デビュー組` / `全選択` / `全解除` の固定 3 つ + 各順位発表式時点の `RCn 生存` を `ranking_milestones` から動的生成。`RCn 生存` は `rank_history[key] != null` で判定 (= その回までに脱落していない練習生)。
     - **描画**: Paul Tol Bright 6色 + ダッシュパターンで色覚多様性対応、SVG/picker ホバーで他の線を半透明化 + ツールチップ表示、エンドポイント直接ラベル (右端に名前)、Top 11 デビュー圏を背景帯でハイライト、ラベル密度は選択数によって自動制御 (>5本時は ceremony 列と両端のみ)。
     - **サイズ**: `W=880 / H=936` 固定 (1 順位 ≈ 9.3px の縦比、ユーザー指示で意図的に縦長レイアウト)。安易に縮めると Top 11 ゾーンの線が判別不能になるため注意。
     - **エンドポイントラベル**: `idealY = yAt(lastRank) + 3` の正確な位置 (= 線終点と一致) に描画。重なりは許容済みのトレードオフ。
     - **未使用関数**: `deconflictLabels()` はコード上に残るが現在未使用 (将来 collision avoidance を再導入する際の forward/backward pass 実装)。

## データスキーマの注意点

`data/*.json` は同じトップレベル構造だが、`trainees[]` 要素の形が **シーズンによって微妙に違う**:

- **Season 1 / 2 / THE GIRLS**: `{ rank, name_jp, name_romaji, image_id, votes_final, debuted, eliminated_at }` — 完結済みシーズン。`debuted: true` が Top 11 と一致。
- **SHINSEKAI**: `{ rank, name_jp, name_romaji, stage_name, image_id, debuted, ongoing_rank }` — 放送中。`votes_final` / `eliminated_at` なし、代わりに `stage_name` (カード下部に小さく表示) と `ongoing_rank` (Top 50 内かどうか) を持つ。`rank` は `null` を許容 (Top 50 圏外)。

`app.js` の `traineeCard()` はこれらの差分を意識して書かれているので、フィールドの過不足を想定したコードのまま保つこと。

### 順位推移 (`ranking_milestones` + `rank_history`)

任意フィールド。トップレベルの `ranking_milestones` は順序付き配列で、要素は `{ key, label, short, official, ceremony?, episode? }`。各 trainee の `rank_history` は `{ <milestone.key>: number | null }` の辞書 (キー省略 = データなしでダッシュ表示)。
- 存在すれば「順位推移表」サブタブが自動表示される。無いシーズンは履歴タブ非表示 (後方互換)。
- 描画順 = 配列順。新 milestone は配列末尾に push する規約 (過去ファイルを汚さない)。
- key 命名: 中間評価=`p<n>` (例 `p1` 初期評価, `p2` グループバトル, …)、順位発表式=`rc<n>` (Final は `rcF`)。
- 表のデフォルトソート列は `ranking_milestones` の最後の要素 = 最新 milestone。
- 既存の `trainee.rank` (最新順位) は最新 milestone の値と一致させる規約 (既存コードが `trainee.rank` を多用するため冗長性を許容)。
- `rank_history[key]` が `null` または未定義 ⇔ その milestone 時点で脱落済み。`buildChartSvg()` の折れ線生成や preset `RCn 生存` の判定はこのイディオム (`r != null`) を共通で使う。

**出典: 公式サイトの「ランクグラフ」API** (シリーズごとに URL とポイント数が違う):
- SEASON 1 (9 points): `https://1st.produce101.jp/profile/data.php?id={image_id}` → `p1 / p2 / p3 / rc1 / p4 / rc2 / p5 / p6 / rcF`
- SEASON 2 (8 points): `https://2nd.produce101.jp/profile/data2021.php?id={image_id}` → `p1 / p2 / rc1 / p3 / p4 / rc2 / p5 / rcF`
- THE GIRLS (7 points): `https://3rd.produce101.jp/profile/data/?id={image_id}` → `p1 / p2 / rc1 / p3 / rc2 / rc3 / rcF`
- SHINSEKAI (4 points): `https://produce101.jp/profile/data/?id={image_id}` → `p1 / p2 / rc1 / rc2`

API はプレーンテキストで「1行目に image_id、2行目以降に各ポイントの順位 (圏外は `NULL`)」を返す。各シーズンの `tools/` のスクリプトは作っていないが、`/tmp/fetch_apply_all.py` 系で curl 並列取得 → JSON マージで再現可能。

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
4. 公式サイトの API (`https://produce101.jp/profile/data/?id={image_id}`) を再取得すれば、データポイント数が増えて自動的に最新化される (現状 4 点、最終回後は SEASON 2 と同程度の 8 点になる想定)

最終回後は `ongoing: false` に変更し、`debuted: true` を Top 11 にセット、`votes_final` を最終票数で埋める想定。

## 既知のリスク

- **画像ホットリンク**: 公式CDNの画像URLを直接参照しているため、提供元のCDN構成変更で大量に画像が切れる可能性がある。その場合は対応シーズンの `image_url_template` を新パスに更新する。
- **THE GIRLS は 99名**: 名前付きで番組に登場した実数。`total_trainees: 99` で正しく、`101` に直さないこと。3名は番組開始前に辞退 (`eliminated_at: "left"`)、2名は匿名のため除外。
- **公式 API レスポンス形式依存**: ランクグラフ取り込みは `data.php` / `data2021.php` / `data/?id=…` がプレーンテキストで「1行目=image_id、以降=順位 (圏外は `NULL`)」を返す前提。提供元がフォーマットを変えると `rank_history` 更新スクリプトが壊れる。
- **チャート色のサイクリング**: 折れ線色は `CHART_COLORS` 6 色 × dash パターン 2 = 12 通りでサイクル。デフォルトが全員選択になったため、13 名以上で色 + ダッシュが重複する。これは仕様上のトレードオフ (絞り込み前提)。
