# PRODUCE 101 JAPAN 全シリーズ・ランキング一覧

PRODUCE 101 JAPAN シリーズ4作品の練習生ランキングをまとめて閲覧できる非公式ファンサイト。

公開URL: https://satory074.github.io/produce101japan-ranking/

## 収録シリーズ

| シーズン | 放送年 | デビュー組 | 公式ランクページ |
|---|---|---|---|
| SEASON 1 | 2019 | JO1 | https://1st.produce101.jp/rank/ |
| SEASON 2 | 2021 | INI | https://2nd.produce101.jp/rank/ |
| THE GIRLS | 2023 | ME:I | https://3rd.produce101.jp/rank/ |
| SHINSEKAI | 2026 | KO1KEYZ | https://produce101.jp/rank/index.php |

## 構成

```
.
├── index.html        # トップ + 全ページの型 (Tailwind CDN)
├── season1/ season2/ thegirls/ shinsekai/
│   └── index.html    # シーズン別ページ (scripts/build-pages.mjs が書き出して commit)
├── sitemap.xml       # 同上
├── assets/app.js     # データ読み込み + タブ切替 + 検索フィルタ
├── scripts/
│   ├── build-pages.mjs   # data/*.json → シーズン別ページ・トップのメタ・サイトマップ
│   └── seo-check.mjs     # 検索・AI クローラー向けの不変条件の検査 (satory074/basecamp からのコピー)
└── data/
    ├── season1.json
    ├── season2.json
    ├── thegirls.json
    └── shinsekai.json
```

GitHub Pages 側のビルド工程はありません。リポジトリの中身をそのまま配信しています。`data/*.json` や `index.html` を直したら `node scripts/build-pages.mjs` を実行し、出力も commit してください (CI が差分を検出します)。

## ローカル動作確認

```
python3 -m http.server -d . 8000
open http://localhost:8000/
```

## データ更新

- 各シーズンの順位データは `data/*.json` に格納。
- SHINSEKAI は 2026-06-06 の決勝で終了（デビュー組 KO1KEYZ、12 人）。
- 練習生画像は各シーズンの公式CDN (Season 1: `web-m.webcdn.stream.ne.jp` / Season 2: `2nd.produce101.jp` / THE GIRLS: `3rd.produce101.jp` / SHINSEKAI: `produce101.jp`) を直リンクしているため、提供元の都合で表示されなくなる場合があります。

## 免責

本サイトはファン制作の非公式リファレンスサイトです。番組・出演者・楽曲等の権利は LAPONE Entertainment / CJ ENM / 吉本興業 等の権利者に帰属します。
