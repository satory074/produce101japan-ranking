# PRODUCE 101 JAPAN 全シリーズ・ランキング一覧

PRODUCE 101 JAPAN シリーズ4作品の練習生ランキングをまとめて閲覧できる非公式ファンサイト。

公開URL: https://satory074.github.io/produce101japan-ranking/

## 収録シリーズ

| シーズン | 放送年 | デビュー組 | 公式ランクページ |
|---|---|---|---|
| SEASON 1 | 2019 | JO1 | https://1st.produce101.jp/rank/ |
| SEASON 2 | 2021 | INI | https://2nd.produce101.jp/rank/ |
| THE GIRLS | 2023 | ME:I | https://3rd.produce101.jp/rank/ |
| SHINSEKAI | 2026 (放送中) | — | https://produce101.jp/rank/index.php |

## 構成

```
.
├── index.html        # 単一ページ (Tailwind CDN)
├── assets/app.js     # データ読み込み + タブ切替 + 検索フィルタ
└── data/
    ├── season1.json
    ├── season2.json
    ├── thegirls.json
    └── shinsekai.json
```

ビルド工程はありません。`index.html` をそのまま GitHub Pages から配信しています。

## ローカル動作確認

```
python3 -m http.server -d . 8000
open http://localhost:8000/
```

## データ更新

- 各シーズンの順位データは `data/*.json` に格納。
- SHINSEKAI は放送中のため毎週の順位発表後に `data/shinsekai.json` を更新する想定。
- 練習生画像は公式CDN (`web-m.webcdn.stream.ne.jp`) を直リンクしているため、提供元の都合で表示されなくなる場合があります。

## 免責

本サイトはファン制作の非公式リファレンスサイトです。番組・出演者・楽曲等の権利は LAPONE Entertainment / CJ ENM / 吉本興業 等の権利者に帰属します。
