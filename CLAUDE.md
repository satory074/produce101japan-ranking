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
gh api /repos/satory074/produce101japan-ranking/pages/builds/latest --jq '{status,commit}'  # 期待 commit が反映されたか確認
```

テスト・lint・型チェックなし (静的HTML/JS)。

**実装タスク完了時の wrap-up**: テストや lint が存在しないため、wrap-up は (1) ブラウザでの目視確認 → (2) 必要に応じて CLAUDE.md 更新 → (3) git commit の流れのみ。test runner を探す時間は不要。

## 編集ポイント早見表

| やりたいこと | 編集対象 | 該当箇所 |
|---|---|---|
| 画像が大量に切れた | `data/<season>.json` | トップレベル `image_url_template` を新 CDN パスに更新 |
| 順位発表回を追加 | `data/<season>.json` | `ranking_milestones` 末尾に新エントリ追加 + 各 trainee の `rank_history` に値追記 + `trainees[].rank` を最新値に同期 |
| 類似度の重みを調整 | `assets/app.js` | `trajectoryDistance` のデフォルト引数 (`slopeAlpha` / `overlapPenalty` / `minOverlap` / `minRequired`) |
| 折れ線チャートの色を増やす | `assets/app.js` | `CHART_COLORS` 配列 (現状 6 色 × dash 2 = 12 通り) |
| 新シーズンタブを追加 | 3 ファイル | `data/<new>.json` 新設 + `index.html` の `.season-panel` 追加 + Tailwind config の `s5` カラー定義 + `app.js` の `init()` 内 fetch リスト |
| 練習生 1 名だけ修正 | `data/<season>.json` | `trainees[]` 該当要素の必要フィールドだけ更新 (シーズンによりスキーマ差あり、§データスキーマ参照) |
| SHINSEKAI 毎週更新 | `data/shinsekai.json` | §SHINSEKAI 更新運用 参照 |
| デビュー人数を 11 以外に (例: SHINSEKAI=12) | `data/<season>.json` | トップレベル `debut_count` を追加 (省略時 11)。`app.js` 全体に `debutCap` として propagate される |
| 公式プロフィールリンクの URL を変更 | `assets/app.js` | `PROFILE_URL_TEMPLATE` (シーズン別テンプレ、`{image_id}` を差し替え) |
| `app.js` 更新後にブラウザキャッシュを無効化 | `index.html` | 末尾の `<script src="./assets/app.js?v=...">` の `v=` を新値に更新 |
| OG 画像 (`assets/og.png` 1200×630) を再生成 | `assets/og.png` | 軽微な書き換えなら直接 PNG を差し替え。レイアウト変更時は `uv run --no-project --with Pillow python3 …` で再描画する (生成スクリプト本体は commit c8a95cd の中身を参照)。`index.html` の `og:image` URL は固定なので画像差し替えだけで OK |
| favicon を変更 | `assets/favicon.svg` | グラデーション + テキストのインライン SVG。PNG フォールバックは置いていない (モダンブラウザのみ対象) |

## アーキテクチャ

3層構造で、各層が緩く分離されている:

1. **データ層 (`data/*.json`)**: シーズン1本につき1ファイル。`season1.json` / `season2.json` / `thegirls.json` / `shinsekai.json`。トップレベルに `image_url_template` を持ち、これが各シーズンで異なる公式CDNを指す (Season 1 は `web-m.webcdn.stream.ne.jp`、Season 2 は `2nd.produce101.jp`、THE GIRLS は `3rd.produce101.jp`、SHINSEKAI は `produce101.jp` 配下、ランダムトークン入りパスを含む)。**画像URLが切れた場合はこの template を更新するだけで全員分が直る。**

2. **ビュー層 (`index.html`)**: Tailwind CDN + Google Fonts (Noto Sans JP / Orbitron) のみで完結。タブのDOM (`.season-panel`) とヘッダのジャンプボタン (`[data-jump]`) だけ静的に配置し、中身は JS が描画する。Tailwind config は inline `<script>` で `s1`〜`s4` のシーズン別カラーを拡張定義 (SEASON 1=orange / SEASON 2=blue / THE GIRLS=pink / SHINSEKAI=purple)。末尾の `<script src="./assets/app.js?v=...">` の `?v=` はキャッシュバスタ — GitHub Pages の CDN とブラウザキャッシュが古い `app.js` を返すケースがあるため、`app.js` を変更した際はこの値も更新する (date ベース or 短いタグ)。
   - **アクセシビリティ不変条件** (これらが壊れていれば必ず直す): メインタブは `role="tab"` + `aria-controls` + `aria-selected` を持ち、`activateTab()` が状態を同期 (パネル側も `role="tabpanel"` + `aria-hidden`)。`#tab-list` には ArrowLeft/Right/Home/End キーナビが束ねられる。類似度モーダル (`.similar-modal-panel`) は `role="dialog" aria-modal="true" aria-labelledby="similar-modal-title"`、`openSimilarityModal()` が呼び出し元要素を保存し閉じる際に focus を戻す。`bindSimilarityModalEvents()` で Tab/Shift+Tab を panel 内ループに制約 (focus trap)、open 直後に `.modal-close` へ rAF + setTimeout で二重スケジュールし focus 移動。検索系 input には `aria-label` を必ず付ける。
   - **SEO/共有メタ**: `<head>` に Open Graph 9 種 + Twitter Card 4 種 + favicon SVG。`og:image` は `assets/og.png` (1200×630)。タイトル/説明はファンサイトの独自機能 (シーズン横断の軌跡比較) を明示する文言にしてあるため、改修時は機能訴求を残す。

3. **コントローラ層 (`assets/app.js`)**:
   - `init()` → 4本のJSONを `Promise.all` で並列fetch → `buildPanel()` で各タブのDOM生成。
   - 画像URLは `buildImageUrl(template, trainee)` が `image_url_template` 優先、未定義なら `DEFAULT_IMAGE_TEMPLATE[panelId]` にフォールバック。
   - 画像読み込み失敗時は `<img onerror>` で `display:none` にし、親 div が描画する1文字イニシャルが代替表示される (Tailwindユーティリティのみで実装、CSSファイルなし)。
   - 検索・絞り込みは各カードの `data-name` / `data-rank` 属性を見て `style.display` を切り替えるだけのDOM操作。カードにはさらに `data-iid` / `data-season` も付与されており、`buildPanel()` 内の grid 委譲クリックハンドラがこれを読んで `openSimilarityModal()` を起動する (= 練習生一覧サブタブのカードクリックで類似度モーダルが開く)。`closest('a')` ガードで名前リンク (公式プロフィール) のクリックは除外。
   - 順位推移表サブタブは `buildPanel()` 内で `data.ranking_milestones` の有無を見て条件描画。`renderRankingHistoryTable()` がテーブルHTMLを生成し、`bindSubtabs()` / `bindHistorySorting()` でサブタブ切替・列ソートを束ねる。サブタブ切替は `.subpanel.hidden` トグルだけで状態管理なし。
   - 順位推移グラフサブタブ (`subpanel-chart`): `renderRankingChart()` がピュア SVG (折れ線 + 順位ラベル) を生成し、チェックボックスのトグルで `refreshChart()` が再描画。CDN ライブラリ不使用。
     - **デフォルト選択**: 全員。
     - **preset ボタン**: `デビュー組` / `全選択` / `全解除` の固定 3 つ + 各順位発表式時点の `RCn 生存` を `ranking_milestones` から動的生成。`RCn 生存` は `rank_history[key] != null` で判定 (= その回までに脱落していない練習生)。
     - **描画**: Paul Tol Bright 6色 + ダッシュパターンで色覚多様性対応、SVG/picker ホバーで他の線を半透明化 + ツールチップ表示、エンドポイント直接ラベル (右端に名前)、Top 11 デビュー圏を背景帯でハイライト、ラベル密度は選択数によって自動制御 (>5本時は ceremony 列と両端のみ)。
     - **サイズ**: `W=880 / H=936` 固定 (1 順位 ≈ 9.3px の縦比、ユーザー指示で意図的に縦長レイアウト)。安易に縮めると Top 11 ゾーンの線が判別不能になるため注意。
     - **モバイル対応**: SVG 自身に `style="min-width: min(880px, max(720px, 100%))"` を設定し、`<` 720px のときは外側の `.chart-svg-container` (`overflow-x-auto sm:overflow-visible`) で横スクロール。トレードオフとして携帯でも Y 軸ラベルが潰れない代わりに片手スクロールが必要。練習生 picker は `<details class="chart-picker-details">` で包み、`bindChartControls()` が `matchMedia('(min-width: 1024px)')` を見て `details.open` を切り替え (デスクトップ展開 / モバイル折り畳み)。
     - **エンドポイントラベル**: `idealY = yAt(lastRank) + 3` の正確な位置 (= 線終点と一致) に描画。重なりは許容済みのトレードオフ。
     - **deconflictLabels()**: メインチャートからは外したが、類似度オーバーレイチャートのエンドポイントラベル衝突回避で再活用中 (forward/backward pass 実装)。
     - **類似軌跡検索**: 各ピッカー行の「類似」ボタン または 練習生一覧カードのクリックでモーダル起動。実装詳細は §類似軌跡検索 参照。
   - **公式プロフィールリンク**: `PROFILE_URL_TEMPLATE` でシーズン別に URL テンプレを保持し、3 ビュー (カード / 順位推移表 / グラフ picker) から `buildProfileUrl(seasonId, imageId)` 経由で新タブリンクを生成。**シーズン毎に URL 構造が違う** (S1: `/profile/?id=…` / S2: `/profile/{image_id}` パスベース / THE GIRLS・SHINSEKAI: `/profile/detail/?id=…` SPA ルート)。新シーズン追加時は必ず公式サイトトップから個別ページに飛んで実際の URL を確認すること。

## 類似軌跡検索

エントリポイントは 2 つ: (a) 順位推移グラフの各ピッカー行「類似」ボタン、(b) 練習生一覧サブタブの各カードクリック (`<a>` 除く)。どちらも `openSimilarityModal(seasonId, imageId)` を呼んでモーダル表示。**Landmark-based piecewise-linear warping** で異シーズン間の時系列をアライメントしてから距離計算する。

### Warping (時間軸アライメント)

- `seasonAnchors(season)`: `p1` + `ceremony: true` の milestone を抽出 (= 全シーズン共通の semantic landmark)。
- `buildBaseWarping(baseSeason)`: アンカーを `[0, 1]` に等間隔配置し、間の p-eval は区間内のインデックス比で warped x を割り振る。
- `buildCandidateWarping(candSeason, baseWarping)`: 基準と共通するアンカーを **基準と同じ canonical x** に配置。最後の共通アンカーより後ろの候補側アンカー (例: 基準=SHINSEKAI のときの S1/S2/TG `rcF` や TG `rc3`) は、共通範囲の最後 2 アンカーから求めた「基準軸ピッチ ÷ 候補軸ピッチ」比で **x > 1 へ線形外挿** (例: S1 `rcF` → 1.5, TG `rcF` → 2.0)。これにより候補シーズンの全期間がチャートに描画可能になる。

### 距離計算

- `buildAlignedTrajectory(trainee, season, warping)`: warped x × `(rank-1)/(total-1)` の点列を返す。各点は `status: 'observed' | 'final_pad'` を持つ:
  - `rank_history[key] == null` (= 脱落確定) の milestone は **最終順位** (`trainee.rank` → 最後の observed rank → `total_trainees` の優先順) で水平 padding され、`final_pad` 印が付く。
  - `rank_history` に key 自体が無い (進行中シーズンの未放送回など) milestone はスキップ。
- `resampleTrajectory()`: `N = max(32, 共通アンカー数 * 8)` 点に線形補間。
- `trajectoryDistance()`: **位置 MAE (重み 0.5) + 傾き MAE (`|Δa[i] - Δb[i]|` 平均, 重み 0.5)** を返す。デフォルト引数 `slopeAlpha=0.5`, `overlapPenalty=0`, `minOverlap=4`, `minRequired=4`。位置と形状を等価ブレンドする方針で、上昇/下降パターンの違いが明確に距離へ反映される。観測点数の少ない候補 (SHINSEKAI など 4 点組・早期脱落者) はペナルティ無しで等価扱い。距離計算は常に [0,1] グリッドで行うので、x>1 への外挿区間はチャート描画にのみ寄与する。
- `similarTrainees()` の距離同値タイブレークは observed 点数の多い候補を優先 (= padding 比率の低い、より確かな比較を上に)。

### モーダル UI

- 「全シーズン / このシーズン以外」トグル付き。結果行のアクションは常に「`{シーズン短縮名}` を開く」ボタンで、同・別シーズン問わず `renderSimilarityModal` を新基準で再描画 (= モーダル内で基準切替)。
- **表示 ON/OFF トグル**: 結果リスト各行に ● ドット (`sim-toggle-dot`)、デフォルトで Top 5 が `chartOn=true`。クリックで描画 ON/OFF を切替、`refreshSimilarityChart()` が SVG だけ差し替える (`root._simState = { baseEntry, decorated, baseMilestones, baseWarping }` で状態保持)。
- **双方向 hover**: チャート線 hover ⇒ 対応するリスト行に ring、リスト行 hover ⇒ 該当線を強調 (`highlightSimLine` / `clearSimLineHighlight`)。ツールチップは `computeWorstMilestone()` が共通グリッド上の最大乖離 x を `baseWarping` で最近接 milestone に逆引きし `最大乖離: ② で 1位 vs 2位` のように両者の実順位を出す。

### オーバーレイチャート (`buildSimilarityChartSvg`)

- モーダル上部に基準軌跡 (黒太線 stroke=3.5) + 類似 Top N を `CHART_COLORS` で重ね描画。座標系は canonical 横軸 `[0, xMax]`、サイズ W=600 / H=260。
- `xAt(xn) = padL + (xn / xMax) * innerW` でスケール — 通常 xMax=1 だが、基準が SHINSEKAI など短いシーズンで候補が x>1 へ外挿される場合は xMax を自動拡張。基準終端 (x=1.0) を示すグレー破線縦線 + 「基準終端 →」ラベルが xMax>1 のとき出る。
- X軸 tick: (a) 基準シーズンの milestone を `baseWarping` 経由の warped x 位置に実線ピンクで配置 (例: Season 1 では RC1 が x=0.333, RC2 が x=0.667) + (b) **候補シーズン側の ceremony milestone のうち基準にないもの** をピンク破線 (`stroke-dasharray="3 3"` opacity 0.65) で描画。同じ x に複数キーが来た場合 (例: 基準=SHINSEKAI で S1 FINAL と TG RC3 が両方 x=1.5) はラベルを `/` で結合 (`FINAL/RC3`) して 1 本にまとめる。p-eval は ticks に含めない (混雑回避)。Top 11 帯は省略 (シーズン総数差で誤読リスクのため)。padding 区間 (`status='final_pad'`) は破線セグメント + 白抜き円 + 順位ラベル省略で観測値と視覚的に区別。
- **Y軸自動ズーム**: 描画する全軌跡から `yMin`/`yMax` を取り、上下 8% padding + 最低 0.18 の縦範囲を確保した上で、`yAt(yn) = padT + ((yn - yMin) / yRange) * innerH` でマッピング。軸ラベルは基準シーズンの `total_trainees` で実順位に逆変換し `↑10位` / `48位↓` のように表示。中間 tick は表示順位スパンから nice step (`[1,2,5,10,20,25,50]` のうち分割数 3〜7 を満たす最小値) を選び、dashed gridline + ラベルで描画 (例: 1〜19 → 5/10/15, 1〜50 → 10/20/30/40)。
- **エンドポイントラベル**: 右端に名前直書き (`deconflictLabels` を再利用 — メインチャートでは現在未使用だがここで活用)。基準は太字、類似は `#順位` プレフィックス付き。

## データスキーマの注意点

`data/*.json` は同じトップレベル構造だが、`trainees[]` 要素の形が **シーズンによって微妙に違う**:

- **Season 1 / 2 / THE GIRLS**: `{ rank, name_jp, name_romaji, image_id, votes_final, debuted, eliminated_at }` — 完結済みシーズン。`debuted: true` が Top 11 と一致。`image_id` は公式 CDN のファイル名 (拡張子無し) なので、新規追加時は curl で 200 を返すか必ず検証 (タイポは画像 404 と rank-graph API 空応答の両方を招く)。
- **SHINSEKAI**: `{ rank, name_jp, name_romaji, stage_name, image_id, debuted, ongoing_rank }` — 放送中。`votes_final` / `eliminated_at` なし、代わりに `stage_name` (カード下部に小さく表示) と `ongoing_rank` (Top 50 内かどうか) を持つ。`rank` は `null` を許容 (Top 50 圏外)。

`app.js` の `traineeCard()` はこれらの差分を意識して書かれているので、フィールドの過不足を想定したコードのまま保つこと。

### 評価アトリビュート (任意フィールド)

`trainees[]` 要素には optional で以下 4 種を追加可能 (キー欠落 = ダッシュ表示・無視):
- `level_test`: `"A" | "B" | "C" | "D" | "F"` — レベル分けテスト初期評価
- `re_evaluation`: 同上 — 再評価結果
- `position_battle`: `{ song, team, result }` — `result` は `"win" | "lose" | null`。`team` はシリーズで意味が違う: S1 は `"1"|"2"` (グループA/B)、S2 は基本 `null` (9 曲単独チーム、9 曲のシングル勝者だけ `result:"win"`)、THE GIRLS / SHINSEKAI は `"Vocal"|"Dance"|"Rap"`
- `concept_battle`: `{ song, team, result }` — S1 は勝敗あり (`result:"win"|"lose"`)、S2 は全員 `result:null` (脱落なし)、THE GIRLS / SHINSEKAI も基本 `result:null`

`app.js` 側は `LEVEL_BADGE_CLASS` / `formatLevelLine` / `formatPositionLine` / `formatConceptLine` / `battleHistoryCell` / `levelHistoryCell` で描画。練習生カード下部に「`Lv: [A] → [A]` / `ポジ: 曲名 [WIN]` / `コンセ: 曲名 [WIN]`」の 3 行で、順位推移表は名前列の直後に `Lv / 再 / ポジ / コンセ` の 4 固定列。ソートキーは `__level__` / `__reeval__` / `__posb__` / `__conb__` (`FIXED_HISTORY_COLS` 参照)。

- **クラスバッジ色** (番組準拠): A=ピンク / B=オレンジ / C=黄 / D=緑 / F=灰 (PRODUCE X 101 系統)。`LEVEL_BADGE_CLASS` を編集すれば調整可。確認ソース: Amazon の公式系グッズ「Aクラス ピンク Tシャツ」「Bクラス オレンジ Tシャツ」。
- **勝敗バッジ**: `WIN` (緑) のみを `battleResultBadge()` で生成。`result: "lose"` や `null` はバッジ非表示 (LOSE バッジは敗北を強調しすぎるためユーザー指示で削除済み)。
- **コンセプトの team は非表示**: `fixedHistoryRowCells()` 内で `battleHistoryCell(cb, {showTeam:false})` を渡しており、たとえ将来 `concept_battle.team` に値が入っても表示されない (= 「コンセプトは曲名のみで表示」の不変条件)。
- **`debut_evaluation`**: `{ song, team, result }` — デビュー評価 (FINAL) 課題曲。Top 20-21 圏内のみ。`result` は通常 `null` (全員ファイナリスト)。team も使わないが、スキーマ統一のため battle 系と同じ object 形式。
- **`concept_battle.song` は曲名、`team` はチーム名** を厳守 (例: THE GIRLS は `&ME` 曲を `NALALA` チームが担当 = `{"song": "&ME", "team": "NALALA"}`)。team 名を song に入れないこと。データ取り込み時は cakcp.com の歌詞 URL 等が `<曲名>（<チーム名>）` の形式で publish しているため照合可能。

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

API はプレーンテキストで「1行目に image_id、2行目以降に各ポイントの順位 (圏外は `NULL`)」を返す。専用スクリプトは未整備だが、以下の手順で取り込み可能 (アドホック実行):
1. `data/<season>.json` の `trainees[].image_id` を抽出。
2. 各 image_id について上記 API URL を `curl -s` で取得 (`xargs -P` 等で並列化可)。**Season 1 の `1st.produce101.jp/profile/data.php` は `Referer: https://1st.produce101.jp/profile/?id=<image_id>` と `User-Agent: Mozilla/5.0` 系のヘッダが無いと 200 で空ボディを返す**ので注意 (Season 2 / THE GIRLS / SHINSEKAI はヘッダなしでも応答する)。
3. レスポンスの 2 行目以降を `ranking_milestones` の `key` 配列とジップ。`NULL` は JSON `null` に置換。
4. 各 trainee の `rank_history` 辞書を組み立て、既存 `data/<season>.json` にマージ → 上書き保存。

## デビュー組の判定

`debuted: true` のカードは黄色枠 + DEBUT バッジ + 順位バッジが黄色 (Top `debutCap` まで一律 `bg-yellow-400 text-yellow-900`) になる。「デビュー組のみ」絞り込みは `data-rank <= debutCap` で判定するため、SHINSEKAI のように `debuted` が全員 false の放送中シーズンでも Top `debutCap` の暫定枠は表示される。

`debutCap` は `buildPanel()` で `data.debut_count ?? 11` を解決し、`traineeCard` / `rankColorClass` / `buildChartSvg` (TOP {N} デビュー圏帯 + legend) / 順位推移表 / 「デビュー組のみ」絞り込みすべてに propagate される。シリーズごとに違う場合 (SEASON 1〜THE GIRLS=11, SHINSEKAI=12) は `data/<season>.json` トップレベルに `debut_count` を明示すること。

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

最終回後は `ongoing: false` に変更し、`debuted: true` を Top `debut_count` (現状 12) にセット、`votes_final` を最終票数で埋める想定。

## 既知のリスク

- **画像ホットリンク**: 公式CDNの画像URLを直接参照しているため、提供元のCDN構成変更で大量に画像が切れる可能性がある。その場合は対応シーズンの `image_url_template` を新パスに更新する。
- **THE GIRLS は 99名**: 名前付きで番組に登場した実数。`total_trainees: 99` で正しく、`101` に直さないこと。3名は番組開始前に辞退 (`eliminated_at: "left"`)、2名は匿名のため除外。
- **公式 API レスポンス形式依存**: ランクグラフ取り込みは `data.php` / `data2021.php` / `data/?id=…` がプレーンテキストで「1行目=image_id、以降=順位 (圏外は `NULL`)」を返す前提。提供元がフォーマットを変えると `rank_history` 更新スクリプトが壊れる。
- **チャート色のサイクリング**: 折れ線色は `CHART_COLORS` 6 色 × dash パターン 2 = 12 通りでサイクル。デフォルトが全員選択になったため、13 名以上で色 + ダッシュが重複する。これは仕様上のトレードオフ (絞り込み前提)。
- **公式プロフィールページの URL 構造変更**: `PROFILE_URL_TEMPLATE` の 4 シーズン分の URL は公式サイト改修で個別に壊れる可能性がある (実例: `3rd.produce101.jp` と `produce101.jp` は `/profile/?id=…` を 403 で拒否し、`/profile/detail/?id=…` のみ受ける)。**検証は必ず Chrome 等のブラウザで実機 navigate すること** — 新サイト (3rd / produce101.jp) は curl / Python の HTTP クライアントには一律 403 を返す SPA で、サーバーサイドレンダリングしないため、HTTP ステータスだけでは有効性を判定できない。実機検証では SPA レンダリング完了まで数秒待ち、`document.body.innerText` に練習生名が含まれているかで確認する。
