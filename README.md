# 詐欺みぬき

届いたSMS・メール・電話・画面の表示などを読んで、詐欺かどうかを見抜き、あやしい所を見つける、だれでも同じ1日5問のゲーム。フィッシング・ニセ警察・オレオレ・還付金・架空料金請求・サポート詐欺・SNS型投資など14の手口と、その見分け方が、遊ぶうちに身につきます。

- 遊ぶ: <https://satou-aaaaa.github.io/sagi-minuki/>
- メッセージを読み、「あやしい」か「だいじょうぶ」かを選びます。「あやしい」なら、あやしい所（文）を全部押して選び「決定」。
- あやしい所をぴったり全部選べたら○（2点）、詐欺と見抜けたけれど選び方がちがえば△（1点）、見抜けなければ×。答えのあとに、手口の名前・見分け方・相談先・出どころが出ます。
- 今日の5問（詐欺3〜4問・ふつうの連絡1〜2問）はだれでも同じで1日1回。上級（むずかしい問題・見分けるコツなし）、手口を選べる何度でも遊べる練習、手口ごとの見分け方をまとめた見抜き帳、実績があります。時間制限はありません。
- 会社名・人・電話番号・アドレスはすべて架空です。電話番号は●で伏せ、アドレスは例に使える `.example` にしています。
- 迷ったら、ひとりで決めずに相談を。警察相談専用電話 #9110、消費者ホットライン 188。お金を取られたら、すぐに警察（110）へ。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、Google に IP アドレスが届きます（端末に保存した文字が古くなったときの確かめも含みます）。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（メッセージの中身や答えは入りません）。

## 出どころ

手口と見分け方は、次の公的な資料をもとにしています。

- 警察庁「フィッシング対策」 <https://www.npa.go.jp/bureau/cyber/countermeasures/phishing.html>
- 埼玉県「特殊詐欺の手口と対策」 <https://www.pref.saitama.lg.jp/a0311/hurikomesagi/index.html>
- 文京区「主な特殊詐欺の手口」 <https://www.city.bunkyo.lg.jp/b009/p000189.html>
- 国民生活センター「架空請求」 <https://www.kokusen.go.jp/soudan_now/data/kaku-seikyu.html>
- 国民生活センター「インターネットトラブル」 <https://www.kokusen.go.jp/soudan_now/data/internet.html>
- 国民生活センター「見守り情報」 <https://www.kokusen.go.jp/mimamori/index.html>
- 全国銀行協会「犯罪にご注意ください」 <https://www.zenginkyo.or.jp/hanzai/information/>
- 消費者庁「消費者ホットライン188」 <https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/>
- 政府広報オンライン「警察相談専用電話 #9110」 <https://www.gov-online.go.jp/useful/article/201309/3.html>

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
node tools/make-icons.cjs && node tools/make-og.cjs   # アイコンと SNS 用の絵を作り直すとき
```

問題のもとは `data.js`（手口 `TYPES`・あやしい所 `FLAGS`・問題 `TPL`）、1日の選び方は `gen.js`。

感想は [Issue のフォーム](https://github.com/satou-aaaaa/sagi-minuki/issues/new?template=feedback.yml) からどうぞ。
