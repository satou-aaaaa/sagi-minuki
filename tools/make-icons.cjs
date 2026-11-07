// アプリのアイコン（icon-192.png・icon-512.png・icon-512-maskable.png）を作る。maskable は絵を中心から0.75倍にして、丸く切られても欠けないようにする（安全な範囲は中心の直径80%）。紺の地に、吹き出しと虫めがね（あやしい所を見つける）。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [s, name, k] of [[192, "icon-192.png", 1], [512, "icon-512.png", 1], [512, "icon-512-maskable.png", 0.75]]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#14202e"/><g transform="translate(50 50) scale(${k}) translate(-50 -50)">
      <path d="M14 22 h52 a8 8 0 0 1 8 8 v26 a8 8 0 0 1 -8 8 h-30 l-12 10 v-10 h-10 a8 8 0 0 1 -8 -8 v-26 a8 8 0 0 1 8 -8z" fill="#33475e" stroke="#b7c4d3" stroke-width="2"/>
      <rect x="18" y="31" width="44" height="5" rx="2.5" fill="#b7c4d3"/><rect x="18" y="41" width="30" height="5" rx="2.5" fill="#ff8a8a"/><rect x="18" y="51" width="38" height="5" rx="2.5" fill="#b7c4d3"/>
      <circle cx="62" cy="58" r="15" fill="#14202e88" stroke="#ffb547" stroke-width="6"/><line x1="73" y1="69" x2="88" y2="84" stroke="#ffb547" stroke-width="8" stroke-linecap="round"/></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", name), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
