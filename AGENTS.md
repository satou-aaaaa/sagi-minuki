# AGENTS.md

詐欺みぬき：届いたSMS・メール・電話・画面の表示が詐欺かどうかを見抜き、あやしい所を見つける1日5問のゲーム。`index.html` と `data.js`（手口・あやしい所・問題のもと）・`gen.js`（問題の作り方と1日の選び方）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 問題のデータ（架空の名前・番号・アドレス・出どころ・字数）・5問の組み方（3年分）・選ぶ/あやしい所/決定・続きから・上級・見抜き帳・実績・スマホ幅・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 手口と見分け方は公的な資料（`data.js` の `SRC`：警察庁・国民生活センター・消費者庁・全国銀行協会・自治体）にあることだけを書く。手口やあやしい所を足すときは、資料で確かめてから `FLAGS`・`TYPES`・`TPL` に足し、出どころ（`src`）を付ける。相談先は警察相談専用電話 #9110・消費者ホットライン 188・警察 110（確かめた出どころは `SRC.P`・`SRC.H`）。法律相談・個別の判断にしない。
- 会社・人・電話番号・アドレスはすべて架空。実在の会社名・銀行名・ロゴ・本物の画面のまねを使わない。電話番号は●で伏せ、アドレスは `.example` だけ（QA が見る）。実在の役所（国税庁・警察など）は「名乗る人」として出し、その役所がしないこと（資料にあること）を学ぶ形にする。
- 1つの問題（`TPL`）は、あやしい所のある文（`[文, 種類]`）と、ふつうの文（`[文, null]`）でできる。詐欺の問題には、ふつうの文を1つ以上入れる（全部選べば正解、にしない。QA が見る）。ふつうの連絡（`t: "safe"`）には、安心できる理由 `why` を書く。1行は36字ほどまで、見出し `FLAGS.name` は18字以内、見分け方 `tip` は70字以内。
- ○はあやしい所をぴったり全部選べたとき（2点）、△は詐欺と見抜けたが選び方がちがうとき（1点）、×は見抜けなかったとき。時間制限は付けない。
- 今日の5問（詐欺3〜4・ふつうの連絡1〜2、手口を重ねない、前の2日に出た問題は出さない）・上級（むずかしい問題・見分けるコツなし・今日の5問と前の日の上級に出た問題は出さない）は日本時間の日付から作る種（`seedOf`）で決まり、だれでも同じ。`Math.random()` は練習の種だけ（QA が数を見る）。`data.js`・`gen.js` を変えると過去の日の問題も変わるので、変えた PR に一言書く。
- 今日の5問・上級は1日1回で、途中で閉じても選んだ所のまま続きから。保存してあった途中経過は、段階と文の番号を確かめてから使う（`valid`）。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、練習で今日・上級の途中を消さない。答えを入れる前に、保存した進み具合が画面と同じ問題か確かめる。記録は保存の前に読み直す。保存に失敗したあとは、途中経過を時刻でなく進み具合で選び、見抜き帳の数は多いほうを残す（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文にメッセージの中身・手口（答え）を出さない（🟩○・🟨△・🟥×）。
- 文字は少なめ・一画面一問。お笑いの言葉は入れない（本物っぽく。QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。チケットや回数の制限は入れない（練習は何度でも。2026-11-06 satouさん「好きなだけ遊んでほしい」）。
- 実績（`achList`）は腕前と集めることに報い、まだのものは進み具合を出す。○・全問○・上級は今日の5問と上級の記録だけで数え、練習は見抜き帳の数にだけ入る。新しく取った実績は次の結果の画面で知らせる（`s.ach`）。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」、フォーム名は「感想フォーム」）を開くだけ。項目は shared-workflows の `template/.github/ISSUE_TEMPLATE/feedback.yml` と同じにし、名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の5問・上級を初めて終えて全問○のときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。
- 押せる所は高さ44px以上（QA が見る）。あやしい所は色だけでなく枠の太さと「⚠ 見出し」の字で、選んだ所は「← あやしい」の字と左の帯で分ける（色だけで分けない）。機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何年分も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- 引き継ぎコード `transfer.js`・`qa/transfer-check.mjs`、見やすさの設定（`<!-- a11y:begin -->`〜`<!-- a11y:end -->`）・`qa/a11y.mjs` は shared-workflows template の写し（ここでは直さず、ひな形を直して写し直す。版は `引き継ぎの版:` と `a11y:begin` の行）。問題文には `data-a11y-say`、知らせは `role="status"`／`aria-live`。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の問題を入れない。日本語の文字が無いと止まる）。
- 公開リポジトリなので、個人情報・鍵を入れない。記録の名前（`KEY = "sagi-minuki-v1"`・`data-keys=`）は鍵ではないが gitleaks がまちがえるので、その行に `gitleaks:allow` のコメントを付ける（QA が見る）。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
