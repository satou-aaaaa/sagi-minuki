// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題は入れず、見本のメッセージ（架空）だけ。
// 日本語の文字が無い環境では、字が欠けた絵を作らないように止める（2026-11-06 てこのつりあいで CodeRabbit の指摘）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
const FONT = "'Noto Sans CJK JP','IPAPGothic','IPAGothic'";
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const bubble = (y, t, bad) => `<div style="position:absolute;left:700px;top:${y}px;width:420px;box-sizing:border-box;padding:16px 20px;border-radius:6px 26px 26px 26px;background:#33475e;font-size:28px;line-height:1.4;${bad ? "border:5px solid #ff8a8a" : "border:5px solid transparent"}">${t}</div>`;
  await p.setContent(`<body style="margin:0;font-family:${FONT},sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#14202e;color:#f2f5f8;position:relative;overflow:hidden">
    ${bubble(120, "お荷物をお届けにあがりましたが、不在のため持ち帰りました。", false)}${bubble(290, "配達日の変更は、こちらから。", true)}${bubble(400, "https://（にせのアドレス）", true)}
    <div style="position:relative;font-size:34px;color:#ffb547;letter-spacing:.1em">だれでも同じ 1日5問</div>
    <div style="position:relative;font-size:104px;font-weight:900;margin-top:16px;letter-spacing:.04em;text-shadow:0 0 30px #ffb54755">詐欺<br>みぬき</div>
    <div style="position:relative;font-size:38px;margin-top:18px;line-height:1.5">そのメッセージ、<br>あやしい所が分かる？</div>
  </div></body>`);
  await p.evaluate(() => document.fonts.ready);
  const ok = await p.evaluate((f) => f.split(",").some((x) => document.fonts.check(`32px ${x}`, "詐欺")) && (() => { const c = document.createElement("canvas").getContext("2d"); c.font = "32px " + f; return c.measureText("詐欺みぬき").width > c.measureText("iiiii").width * 2; })(), FONT);
  if (!ok) { console.error("日本語の文字が見つからないので、og.png を作らずに止めた（Noto Sans CJK JP か IPA フォントを入れる）"); process.exit(1); }
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
