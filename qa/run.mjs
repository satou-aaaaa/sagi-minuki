// 詐欺みぬきの検査。問題のデータ（架空の名前・番号・アドレス・出どころ・字数・ふつうの文）・5問の組み方（3年分）・選ぶ/あやしい所/決定・続きから・上級・練習・見抜き帳・実績・記録・スマホ幅・PWA・引き継ぎ・見やすさ。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));
const D = G.D;
const read = (f) => readFileSync(path.join(root, f), "utf8");
const len = (s) => [...s].length;
const nextDay = (k) => new Date(Date.parse(k) + 864e5).toISOString().slice(0, 10);
const prevDay = (k) => new Date(Date.parse(k) - 864e5).toISOString().slice(0, 10);

// 1. 問題のデータ（ブラウザを使わない）
{
  const ids = D.TPL.map((t) => t.id);
  check("問題のもとは60種以上で、id が重ならない", D.TPL.length >= 60 && new Set(ids).size === ids.length, `${D.TPL.length}種`);
  const typeBad = D.TPL.filter((t) => !D.TYPES[t.t] || !D.CH[t.ch] || ![1, 2, 3].includes(t.lv)).map((t) => t.id);
  check("どの問題も、手口・届き方・難しさ（1〜3）が決まっている", typeBad.length === 0, typeBad.join(","));
  const flagBad = D.TPL.flatMap((t) => t.L.filter(([, f]) => f && !D.FLAGS[f]).map(([, f]) => `${t.id}:${f}`));
  check("あやしい所の種類は、どれも FLAGS にある", flagBad.length === 0, flagBad.join(","));
  const scamBad = D.TPL.filter((t) => t.t !== "safe" && (!t.L.some(([, f]) => f) || !t.L.some(([, f]) => !f))).map((t) => t.id);
  check("詐欺の問題には、あやしい所と、ふつうの文の両方がある（全部選べば正解、にしない）", scamBad.length === 0, scamBad.join(","));
  const safeBad = D.TPL.filter((t) => t.t === "safe" && (t.L.some(([, f]) => f) || !t.why || len(t.why) > 80)).map((t) => t.id);
  check("ふつうの連絡には、あやしい所が無く、安心できる理由（80字以内）がある", safeBad.length === 0, safeBad.join(","));
  const lineBad = D.TPL.flatMap((t) => t.L.filter(([s]) => len(s) > 40).map(([s]) => `${t.id}:${len(s)}`));
  check("1行は40字以内（一画面に収まる）", lineBad.length === 0, lineBad.join(","));
  const fBad = Object.entries(D.FLAGS).filter(([, f]) => !f.name || len(f.name) > 18 || !f.tip || len(f.tip) > 70 || !f.src.length || !f.src.every((k) => D.SRC[k])).map(([k]) => k);
  check("あやしい所の見出しは18字以内・見分け方は70字以内・出どころがある", fBad.length === 0, fBad.join(","));
  const tBad = Object.entries(D.TYPES).filter(([k, t]) => !t.name || !t.desc || (k !== "safe" && (!t.src || !t.src.length || !t.src.every((s) => D.SRC[s])))).map(([k]) => k);
  check("手口には名前・説明・出どころがある", tBad.length === 0, tBad.join(","));
  const unused = Object.keys(D.TYPES).filter((k) => !D.TPL.some((t) => t.t === k));
  const unusedF = Object.keys(D.FLAGS).filter((k) => !D.TPL.some((t) => t.L.some(([, f]) => f === k)));
  check("どの手口・あやしい所も、問題に1回以上出る", unused.length === 0 && unusedF.length === 0, unused.concat(unusedF).join(","));
  const srcBad = Object.entries(D.SRC).filter(([, s]) => !/^https:\/\/(www\.)?([a-z0-9-]+\.)*(go\.jp|lg\.jp|kokusen\.go\.jp|zenginkyo\.or\.jp|gov-online\.go\.jp)\//.test(s.url)).map(([k]) => k);
  check("出どころは公的な資料（go.jp・lg.jp・全国銀行協会）だけ", srcBad.length === 0, srcBad.join(","));
  check("相談先 #9110・188 の出どころがある", D.SRC.P && D.SRC.H && /9110/.test(read("index.html")) && /188/.test(read("index.html")));
  // slot を全部の種で埋めて、架空の名前・番号・アドレスだけか確かめる
  const left = [], dom = [], tel = [];
  for (const t of D.TPL) for (let s = 0; s < 40; s++) {
    const p = G.make(t.id, G.seedOf(`qa:${t.id}:${s}`)), txt = [p.from, p.sub, ...p.L.map((x) => x[0])].join("\n");
    if (/[{}]/.test(txt)) left.push(t.id);
    for (const m of txt.matchAll(/(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/|\b)/gi)) if (!/\.example$/i.test(m[1])) dom.push(`${t.id}:${m[1]}`);
    for (const m of txt.matchAll(/[@＠]([a-z0-9.-]+)/gi)) if (!/\.example$/i.test(m[1])) dom.push(`${t.id}:${m[1]}`);
    if (/\d{2,4}[-‐ー]\d{2,4}[-‐ー]\d{3,4}|\b0\d{9,10}\b/.test(txt)) tel.push(t.id);
  }
  check("どの種で作っても、埋めていない {名前} が残らない", left.length === 0, [...new Set(left)].join(","));
  check("アドレス・URL はどれも .example（実在のサイトに見えない）", dom.length === 0, [...new Set(dom)].slice(0, 5).join(","));
  check("電話番号は●で伏せる（本物の番号を出さない）", tel.length === 0, [...new Set(tel)].join(","));
  const real = /三菱|みずほ|三井住友|りそな|ゆうちょ|楽天|PayPay|Amazon|アマゾン|ヤマト|佐川|日本郵便|NTT|ドコモ|\bau\b|ソフトバンク|Apple|Google|Microsoft|LINEヤフー|メルカリ/;
  const realHit = D.TPL.filter((t) => real.test(JSON.stringify(t))).map((t) => t.id).concat(Object.values(D.SLOT).flat(2).filter((x) => typeof x === "string" && real.test(x)));
  check("実在の会社名・銀行名を使わない（SLOT・問題の文）", realHit.length === 0, realHit.join(","));
  const same = D.TPL.filter((t) => JSON.stringify(G.make(t.id, 123)) !== JSON.stringify(G.make(t.id, 123))).map((t) => t.id);
  check("同じ種からは、いつも同じ問題ができる", same.length === 0, same.join(","));
}

// 2. 5問の組み方（3年分）
{
  const bad = [], hbad = [], rep = [], hov = [];
  const use = {};
  let k = G.EPOCH;
  for (let n = 0; n < 365 * 3; n++, k = nextDay(k)) {
    const d = G.dailyList(k), h = G.hardList(k);
    const chk = (L, lvs) => {
      const ps = L.map((it) => G.make(it.id, it.s)), sc = ps.filter((p) => p.scam), sf = ps.filter((p) => !p.scam);
      return L.length === 5 && new Set(L.map((x) => x.id)).size === 5 && sc.length >= 3 && sc.length <= 4 && sf.length >= 1 && sf.length <= 2 && new Set(sc.map((p) => p.t)).size === sc.length && ps.every((p) => lvs.includes(p.lv));
    };
    if (!chk(d, [1, 2])) bad.push(k);
    if (!chk(h, [2, 3])) hbad.push(k);
    if (n >= 2) { const both = (x) => G.dailyList(x).concat(G.hardList(x)).map((y) => y.id), p1 = both(prevDay(k)), p2 = both(prevDay(prevDay(k))); if (d.some((x) => p1.includes(x.id) || p2.includes(x.id))) rep.push(k); }
    const ph = n >= 1 ? G.hardList(prevDay(k)).map((x) => x.id) : [];
    if (h.some((x) => d.some((y) => y.id === x.id) || ph.includes(x.id))) hov.push(k);
    d.concat(h).forEach((x) => { use[x.id] = (use[x.id] || 0) + 1; });
  }
  check("今日の5問（3年分）：5問・詐欺3〜4とふつうの連絡1〜2・手口を重ねない・難しさ1〜2", bad.length === 0, bad.slice(0, 5).join(","));
  check("上級（3年分）：5問・詐欺3〜4とふつうの連絡1〜2・手口を重ねない・難しさ2〜3", hbad.length === 0, hbad.slice(0, 5).join(","));
  check("今日の5問に、前の2日の今日の5問・上級に出た問題は出ない（3年分。2026-11-07 CodeRabbit）", rep.length === 0, rep.slice(0, 5).join(","));
  check("上級は、今日の5問と前の日の上級に出た問題を出さない（3年分）", hov.length === 0, hov.slice(0, 5).join(","));
  const never = D.TPL.filter((t) => !use[t.id]).map((t) => t.id);
  check("3年のうちに、どの問題も1回以上出る（かたよらない）", never.length === 0, never.join(","));
  // EPOCH から順に決めても、ある日から先に決めても同じ（開いた日によって問題が変わらない）
  const fresh = (() => { const req = createRequire(import.meta.url), p = path.join(root, "gen.js"); delete req.cache[req.resolve(p)]; return req(p); })();
  const far = "2027-05-20";
  check("先の日を先に決めても、順に決めたときと同じ5問", JSON.stringify(fresh.dailyList(far)) === JSON.stringify(G.dailyList(far)) && JSON.stringify(fresh.hardList(far)) === JSON.stringify(G.hardList(far)));
  const pl = ["all", ...Object.keys(D.TYPES)].filter((t) => { for (let s = 0; s < 200; s++) { const L = G.practiceList(s * 7 + 1, t); if (L.length !== 5 || new Set(L.map((x) => x.id)).size !== 5 || L.some((x) => !G.byId.has(x.id))) return true; if (t !== "all" && t !== "safe" && !L.some((x) => G.byId.get(x.id).t === t)) return true; } return false; });
  check("練習：どの手口を選んでも、その手口がまざった5問ができる（200回ずつ）", pl.length === 0, pl.join(","));
}

const html = read("index.html");
const htmlOwn = html.replace(/<!-- a11y:begin[\s\S]*?<!-- a11y:end -->/, ""); // 共通部品（見やすさの設定）を除いたゲームの中身
check("Math.random は練習の種だけ（今日の5問・上級は日付の種）", (htmlOwn.match(/Math\.random/g) || []).length === 1 && /G\.practiceList\(Math\.floor\(Math\.random\(\)/.test(htmlOwn) && !/Math\.random\(/.test(read("gen.js").replace(/^\s*\/\/.*$/gm, "")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html + read("data.js")));
check("チケット・回数の制限を入れない（練習は何度でも）", !/チケット|スタミナ|残り回数|回まで遊べ/.test(htmlOwn));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(read("README.md").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ // ひな形を写したリポジトリで、前のゲームの名前や URL が残らない（2026-11-05 CodeRabbit）
  const docs = ["README.md", "AGENTS.md", "manifest.webmanifest", "sw.js", "index.html", ".github/workflows/automerge.yml", ".github/workflows/qa.yml"].map((f) => { try { return [f, read(f)]; } catch (e) { return [f, ""]; } });
  const left = docs.filter(([, t]) => /てこ|teko|おもり|支点|でんき回路|denki|あみだ|amida|しりとり|ことばならべ|github\.io\/(?!sagi-minuki\/)[a-z0-9-]+\//.test(t)).map(([f]) => f);
  check("README・AGENTS.md・manifest・sw.js・画面・CI はこのゲームの名前と URL だけ（写し元のゲームが残らない）", left.length === 0 && /^# 詐欺みぬき/.test(docs[0][1]) && /satou-aaaaa\.github\.io\/sagi-minuki\//.test(docs[0][1]), left.join(",")); }
{ // 記録の名前（localStorage のキー）は gitleaks が鍵とまちがえる。その行には gitleaks:allow を付ける（2026-11-06）
  const own = [["index.html", htmlOwn], ["qa/run.mjs", read("qa/run.mjs")]];
  const miss = own.flatMap(([f, t]) => t.split("\n").map((l, i) => [f, i + 1, l]).filter(([, , l]) => /(?:\bKEY = |data-keys=)"[a-z0-9-]+-v\d+"/.test(l) && !/gitleaks:allow/.test(l)).map(([f, n]) => `${f}:${n}`));
  check("記録の名前を書いた行には gitleaks:allow がある（Secret scan が鍵とまちがえない）", miss.length === 0, miss.join(",")); }
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/sagi-minuki/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = read(".github/ISSUE_TEMPLATE/feedback.yml");
  check("感想フォームは名前・メールを聞かない・フォーム名は「感想フォーム」", /^name: 感想フォーム$/m.test(fy) && /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \[?"?感想/.test(fy)); }
{ const sw = read("sw.js"), mf = JSON.parse(read("manifest.webmanifest"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];
  const local = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => "./" + m[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（data.js・gen.js・transfer.js も）、外へ何も送らない", need.concat(local).every((f) => shell.includes(f)) && local.includes("./data.js") && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：入れるときは HTTP の保存でなくサーバーから取り直す（古い版を保存しない。drift-check）", /addAll\(SHELL\.map\(\(u\) => new Request\(u, \{ cache: "reload" \}\)\)\)/.test(sw));
  check("PWA：保存の名前はこのゲームのもの", /CACHE = "sagi-minuki-v\d+"/.test(sw));
  check("PWA：manifest にアイコンと名前がある・maskable は別の画像", mf.name === "詐欺みぬき" && mf.icons.length >= 2 && mf.start_url === "./" && mf.icons.some((i) => i.purpose === "maskable" && i.src === "icon-512-maskable.png")); }
{ const src = html + read("gen.js");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(r|R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }
check("CSP の connect-src は 'self' だけ（外へ通信しない）", /connect-src 'self'[;"]/.test(html));

let browser = null; // 起動に失敗しても report.md を書けるように、起動は下の try の中で
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [], outside = [];
const FIXED = new Date(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) + "T03:00:00Z");
async function newPage(w = 390, h = 844, keep = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } }), page = await ctx.newPage(); // 2つ目のタブを開けるように、ページごとに context を作る
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  page.on("request", (r) => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u) && !/fonts\.(googleapis|gstatic)\.com/.test(u)) outside.push(u); });
  await page.clock.setFixedTime(FIXED); // 時計を今日の昼（日本時間）に止める
  await page.goto(url);
  if (!keep) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  return page;
}
const closeHow = (page) => page.evaluate(() => { const d = document.getElementById("howto"); if (d.open) d.querySelector("#howto-ok").click(); });
const curS = (page) => page.evaluate(() => { const c = window.__sg.cur(); return c && { i: c.i, step: c.step, sel: c.sel.slice(), scam: c.p.scam, flags: window.__sg.flagSet(c.p), n: c.p.L.length, t: c.p.t, id: c.it.id }; });
// 1問を画面のボタンで答える。how: "perfect"（ぴったり）・"half"（詐欺と見抜くが選び方ちがい）・"miss"（逆を選ぶ）
async function answer(page, how) {
  const c = await curS(page);
  if (how === "miss") { await page.click(c.scam ? "#say-ok" : "#say-ng"); if (!c.scam) return c; }
  else if (!c.scam) { await page.click("#say-ok"); return c; }
  else {
    await page.click("#say-ng");
    const pick = how === "perfect" ? c.flags : [c.flags[0], ...[...Array(c.n).keys()].filter((j) => !c.flags.includes(j)).slice(0, 1)];
    for (const j of pick) await page.click(`#card .ln[data-j="${j}"]`);
    await page.click("#decide");
  }
  return c;
}
const KEY = "sagi-minuki-v1"; // gitleaks:allow 記録の名前（鍵ではない）
try {
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await newPage();
  check("はじめて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await closeHow(page);
  // ブラウザと Node で同じ5問（どの端末でも同じ問題）
  const sameDays = await page.evaluate(() => { const g = window.__sg, out = {}; let k = g.todayKey(); for (let i = 0; i < 30; i++) { out[k] = [g.dailyList(k), g.hardList(k)]; k = new Date(Date.parse(k) + 864e5).toISOString().slice(0, 10); } return out; });
  check("ブラウザでも Node でも、同じ日は同じ5問・上級（30日分）", Object.entries(sameDays).every(([k, v]) => JSON.stringify(v) === JSON.stringify([G.dailyList(k), G.hardList(k)])));
  // 今日の5問をぴったり全部で解く
  await page.click("#go-d");
  check("今日の5問：1問目は「あやしい／だいじょうぶ」を選ぶ画面・見分けるコツがある", (await page.locator("#say-ng").count()) === 1 && (await page.locator("#coach").count()) === 1);
  const first = await curS(page);
  if (first.scam) {
    await page.click("#say-ng");
    check("詐欺で「あやしい」を押すと、文を押して選ぶ画面になり、まだ何も選ばないと決定できない", (await curS(page)).step === "f" && (await page.locator("#decide[disabled]").count()) === 1);
    await page.click(`#card .ln[data-j="${first.flags[0]}"]`);
    check("文を押すと選んだ印（aria-pressed）が付き、数が出る", (await page.getAttribute(`#card .ln[data-j="${first.flags[0]}"]`, "aria-pressed")) === "true" && (await page.textContent("#nsel")).includes("1つ"));
    await page.reload();
    const cont = (await page.textContent("#go-d")).includes("続きから（1問目）");
    await page.click("#go-d");
    const rs = await curS(page);
    check("途中で閉じても、ホームに「続きから」が出て、選んだ所のまま続きから", cont && rs.step === "f" && rs.sel.length === 1 && rs.sel[0] === first.flags[0]);
    await page.click(`#card .ln[data-j="${first.flags[0]}"]`);
    check("もう一度押すと選んだ印が消える", (await curS(page)).sel.length === 0);
    await page.click("#back-v");
    check("「選び直す」で最初の画面に戻る", (await curS(page)).step === "v");
  }
  for (let i = 0; i < 5; i++) {
    const c = await answer(page, "perfect");
    const v = await page.textContent("#after");
    if (i === 0) check("答えると、○の見出し・手口の説明・出どころが出て、見分けるコツは隠れる", v.includes("○") && v.includes("出どころ") && (await page.locator("#coach").isHidden()));
    if (c.scam && i < 5) check(`詐欺の問題では、あやしい所に「⚠ 見出し」の印が出る（${c.id}）`, (await page.locator("#card .ln.flag").count()) === c.flags.length && /⚠/.test((await page.getAttribute("#card .ln.flag", "data-flag")) || ""));
    await page.click("#next");
  }
  const res = await page.textContent("#app");
  check("全部○で終えると、結果に「全問、見抜いた」と10点の共有の文・Ko-fi の1行・相談先が出る", res.includes("全問、見抜いた") && res.includes("10/10点") && (await page.locator(".kofi").count()) === 1 && res.includes("#9110") && res.includes("188"));
  const share = await page.textContent(".share");
  const ans = (await page.evaluate(() => window.__sg.dailyList(window.__sg.todayKey()).map((it) => window.__sg.probOf(it)))).flatMap((p) => [p.from, ...p.L.map((x) => x[0])].filter((a) => len(a) >= 4));
  check("共有の文に答え（差出人・文・手口）を出さない（🟩🟨🟥と点だけ）", /(?:🟩){5}/u.test(share) && !ans.some((a) => share.includes(a)) && !Object.values(D.TYPES).some((t) => share.includes(t.name)));
  check("今日の記録が付き、実績を知らせる", await page.evaluate(() => { const g = window.__sg, s = g.load(); return !!s.days[g.todayKey()] && !s.runs.d && s.total === 5; }) && (await page.locator(".newach").count()) === 1);
  await page.click("#back");
  check("ホームに今日の結果と上級のボタンが出る", (await page.textContent("#go-d")).includes("今日の結果") && (await page.locator("#go-h").count()) === 1);
  await page.click("#go-d");
  check("今日の結果をもう一度見ても、Ko-fi の1行は出ない（初めて終えたときだけ）", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  // 上級：コツなし・まちがいもまぜる
  await page.click("#go-h");
  check("上級：見分けるコツが無い", (await page.locator("#coach").count()) === 0 && (await page.textContent("header")).includes("上級"));
  const marks = []; let half = false;
  for (let i = 0; i < 5; i++) { const sc = (await curS(page)).scam, how = i === 0 ? "miss" : !half && sc ? ((half = true), "half") : "perfect"; const c = await answer(page, how); marks.push(c.scam); const v = await page.textContent("#after"); if (i === 0) check("逆を選ぶと×の見出しが出る", v.includes("×")); if (how === "half") check("詐欺と見抜いて選び方がちがうと△", v.includes("△")); await page.click("#next"); }
  check("点は ○2点・△1点・×0点（×1・△1・○3で 7点／10点。2026-11-07 CodeRabbit）", half && (await page.textContent(".big")).includes("7点／10点"), await page.textContent(".big"));
  check("上級の記録は今日の5問と別に付き、Ko-fi の1行は出ない（全問○でない）", await page.evaluate(() => { const g = window.__sg, s = g.load(); return !!s.hdays[g.todayKey()] && !!s.days[g.todayKey()]; }) && (await page.locator(".kofi").count()) === 0 && /🟥/.test(await page.textContent(".share")));
  await page.click("#back");
  // 練習：何度でも・記録を増やさない
  await page.click("#go-p");
  check("練習：手口を選ぶボタンが全部の手口＋ふつうの連絡＋ぜんぶ", (await page.locator("[data-t]").count()) === Object.keys(D.TYPES).length + 1);
  await page.click('[data-t="phish"]');
  const before = await page.evaluate(() => { const s = window.__sg.load(); return [Object.keys(s.days).length, Object.keys(s.hdays).length]; });
  let phish = 0;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 5; i++) { const c = await answer(page, "perfect"); if (c.t === "phish") phish++; await page.click("#next"); }
    check(`練習の${r + 1}回目：結果に共有・Ko-fi は出ず、「もう5問」ですぐ次へ`, (await page.locator("#share").count()) === 0 && (await page.locator(".kofi").count()) === 0 && (await page.textContent("#go-p")).includes("もう5問"));
    await page.click("#go-p");
  }
  check("練習は何度でも遊べ、選んだ手口が出る・今日と上級の記録を増やさない", phish >= 4 && (await page.evaluate(() => window.__sg.mode())) === "p" && JSON.stringify(await page.evaluate(() => { const s = window.__sg.load(); return [Object.keys(s.days).length, Object.keys(s.hdays).length]; })) === JSON.stringify(before));
  check("練習で見抜いた数は見抜き帳に入る", await page.evaluate(() => (window.__sg.load().cnt.phish || 0) >= 2));
  await page.click("#back");
  await page.click("#go-dex");
  check("見抜き帳：全部の手口の説明と、出どころが出る", (await page.locator(".dexs > div").count()) === Object.keys(D.TYPES).length - 1 && (await page.locator(".srcs a").count()) === Object.keys(D.SRC).length);
  await page.click("#back");
  await page.click("#go-ach");
  check("実績：取ったものとまだのもの（進み具合）が出る", (await page.locator(".achs .got").count()) >= 2 && (await page.locator(".achs i").count()) >= 1);
  await page.close();

  { const ph = await newPage(); await closeHow(ph); await ph.evaluate(() => window.__sg.start("h"));
    check("今日の5問を終える前は、上級を始めない（別のタブの古い画面からも。2026-11-07 CodeRabbit）", (await ph.evaluate(() => !window.__sg.load().runs.h)) && (await ph.locator("#go-d").count()) === 1);
    check("届いたメッセージ（差出人と本文）も読み上げの対象", (await ph.evaluate(() => { window.__sg.start("d"); return !!document.querySelector(".msg[data-a11y-say]"); })));
    await ph.close(); }
  { const pk = await newPage(); await pk.click("#howto-ok");
    check("「わかった」を押した直後に読み直しても、遊び方が出ない（保存は押したときすぐ）", await pk.evaluate(() => window.__sg.load().tut === true)); await pk.reload();
    check("「わかった」のあと開き直しても、遊び方が出ない", (await pk.locator("#howto[open]").count()) === 0); await pk.close(); }
  { let back = 0; for (let i = 0; i < 10; i++) { const pq = await newPage(); await pq.waitForFunction(() => document.getElementById("howto").open); await pq.keyboard.press("Escape"); await pq.reload(); if (await pq.evaluate(() => document.getElementById("howto").open)) back++; await pq.close(); }
    check("遊び方を Esc で閉じてすぐ読み直しても、遊び方が出ない（10回。cancel でも残す。shared-workflows #196）", back === 0, `${back}/10`); }
  { const pe = await newPage(); await pe.waitForFunction(() => document.getElementById("howto").open); await pe.keyboard.press("Escape"); await pe.waitForTimeout(100);
    const closed = (await pe.locator("#howto[open]").count()) === 0; await pe.reload();
    check("遊び方を Esc で閉じたあと、開き直しても遊び方が出ない（2026-11-07 shared-workflows #186）", closed && (await pe.locator("#howto[open]").count()) === 0 && (await pe.evaluate(() => window.__sg.load().tut === true)));
    await pe.close(); }
  // 練習中に今日の途中を消さない
  { const pp = await newPage(); await closeHow(pp); await pp.click("#go-d"); await answer(pp, "perfect"); await pp.click("#next"); await pp.click("#back");
    await pp.click("#go-p"); await pp.click('[data-t="all"]'); await answer(pp, "perfect"); await pp.click("#back");
    check("練習しても、今日の5問の途中（1問目まで）は消えない", (await pp.textContent("#go-d")).includes("2問目"));
    // 別のタブで先に進んだら、古いタブでは答えを入れない
    await pp.click("#go-d");
    const other = await pp.context().newPage(); await other.clock.setFixedTime(FIXED); await other.goto(url); await other.click("#go-d"); await answer(other, "miss"); await other.close();
    await answer(pp, "perfect");
    check("別のタブで先に答えた問題を、古いタブで二重に入れない", await pp.evaluate(() => window.__sg.load().runs.d.res.length) === 2 && (await pp.evaluate(() => window.__sg.cur().i)) === 2);
    await pp.close(); }
  // 保存してあった途中経過を確かめる
  { const pv = await newPage(); await closeHow(pv);
    const r = await pv.evaluate(() => { const g = window.__sg, it = g.dailyList(g.todayKey()).find((x) => g.probOf(x).scam), sf = g.dailyList(g.todayKey()).find((x) => !g.probOf(x).scam), p = g.probOf(it), q = g.probOf(sf);
      return [g.valid(p, { step: "f", sel: [0] }), !g.valid(p, { step: "f", sel: [99] }), !g.valid(p, { step: "f", sel: [0, 0] }), !g.valid(p, { step: "v", sel: [1] }), !g.valid(q, { step: "f", sel: [] }), !g.valid(p, { step: "x", sel: [] }), !g.valid(p, null)]; });
    check("保存してあった途中経過は、段階と文の番号を確かめてから使う（valid）", r.every(Boolean), JSON.stringify(r));
    await pv.evaluate((K) => { const g = window.__sg, k = g.todayKey(); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, cnt: {}, seen: {}, perf: {}, total: 0, kofi: {}, ach: {}, runs: { d: { mode: "d", date: k, list: g.dailyList(k), res: [], cur: { i: 0, step: "f", sel: [77] }, id: "z" } } })); }, KEY);
    await pv.reload(); await pv.click("#go-d");
    check("こわれた途中経過は使わず、最初の画面から始める", (await curS(pv)).step === "v");
    await pv.evaluate((K) => { const g = window.__sg, k = g.todayKey(), L = g.dailyList(k); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, cnt: {}, seen: {}, perf: {}, total: 0, kofi: {}, ach: {}, runs: { d: { mode: "d", date: k, list: L, res: L.map(() => ({ v: 1, f: 1, k: 1 })), id: "a" } } })); }, KEY);
    await pv.reload();
    check("最後の1問のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pv.evaluate(() => { const g = window.__sg; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pv.evaluate((K) => { const g = window.__sg, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10), L = g.dailyList(d); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, cnt: {}, seen: {}, perf: {}, total: 0, kofi: {}, ach: {}, runs: { d: { mode: "d", date: d, list: L, res: L.map(() => ({ v: 1, f: 0, k: 1 })), id: "a" } } })); }, KEY);
    await pv.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつき、今日の上級は出ない", await pv.evaluate(() => { const g = window.__sg, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); return !!g.load().days[d] && !g.load().runs.d; }) && !(await pv.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが保存しても、両方の日ごとの記録を残し、数は多いほう", await pv.evaluate((K) => { const g = window.__sg, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": { r: [] } }, cnt: { phish: 9 }, total: 3 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": { r: [] } }, cnt: { phish: 2 }, total: 7 }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.cnt.phish === 9 && r.total === 7; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pv.evaluate((K) => { const g = window.__sg, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], id: "x" }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base, { res: [{ v: 1 }] }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [{ v: 1 }, { v: 0 }] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 2; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pv.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    await pv.close(); }
  { // 保存できないブラウザでも遊べる
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.clock.setFixedTime(FIXED);
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    for (let i = 0; i < 5; i++) { await answer(pb, "perfect"); await pb.click("#next"); }
    check("保存できないブラウザでも、今日の5問を最後まで遊べる", (await pb.textContent("#app")).includes("全問、見抜いた"));
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 結果を開いたまま日付が変わったら、翌日の上級は始めない
    const pm = await newPage(); await closeHow(pm);
    await pm.evaluate((K) => { const g = window.__sg, k = g.todayKey(); localStorage.setItem(K, JSON.stringify({ v: 1, tut: true, days: { [k]: { r: [1, 2, 3, 4, 5].map(() => ({ v: 1, f: 1, k: 1 })) } }, hdays: {}, cnt: {}, seen: {}, perf: {}, total: 5, kofi: {}, ach: {}, runs: {} })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    if (had) await pm.click("#go-h");
    check("ホームを開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__sg.mode())) !== "h");
    await pm.close(); }

  // スマホ幅：はみ出さない・押せる所は44px以上
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700);
    const how = await p3.evaluate(() => [...document.querySelectorAll("#howto button, #howto a")].filter((e) => e.getBoundingClientRect().height < 44).length);
    await closeHow(p3);
    const meas = () => p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a, summary")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 8)) }));
    const screens = {};
    screens.home = await meas();
    await p3.click("#go-d"); screens.v = await meas();
    // いちばん行の多い問題で、文を選ぶ画面を見る
    const big = await p3.evaluate(() => { const g = window.__sg; return [...g.D.TPL].filter((t) => t.t !== "safe").sort((a, b) => b.L.length - a.L.length || (a.id < b.id ? -1 : 1))[0].id; });
    await p3.evaluate((id) => { const g = window.__sg, k = g.todayKey(), s = g.load(); s.runs.p = { mode: "p", date: k, list: [{ id, s: 1 }], res: [], cur: { i: 0, step: "f", sel: [] }, id: "w" }; localStorage.setItem("sagi-minuki-v1", JSON.stringify(s)); g.play("p"); }, big); // gitleaks:allow 記録の名前（鍵ではない）
    screens.f = await meas();
    await p3.click("#card .ln[data-j='0']"); await p3.click("#decide"); screens.rev = await meas();
    await p3.click("#next"); screens.res = await meas();
    await p3.click("#back"); await p3.click("#go-p"); screens.p = await meas();
    await p3.click("#back"); await p3.click("#go-dex"); screens.dex = await meas();
    await p3.click("#back"); await p3.click("#go-ach"); screens.ach = await meas();
    const ng = Object.entries(screens).filter(([, r]) => r.over || r.small.length).map(([k, r]) => `${k}:${r.over ? "はみ出し" : ""}${r.small.join("/")}`);
    check(`幅${w}px：ホーム・問題・文を選ぶ・答え・結果・練習・見抜き帳・実績で横にはみ出さず、押せる所は高さ44px以上`, ng.length === 0 && how === 0, ng.join(" "));
    await p3.close();
  }
  { // 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
    const sample = { "sagi-minuki-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-07": { r: [{ v: 1, f: 1, k: 1 }] } }, hdays: {}, cnt: { phish: 3 }, seen: {}, perf: {}, total: 3, runs: {}, kofi: {}, ach: {}, t: 1 }) }; // gitleaks:allow 記録の名前（鍵ではない）
    await checkTransfer({ browser, url, game: "sagi-minuki", sample, check, open: async (pg) => { await pg.evaluate(() => { const d = document.getElementById("howto"); if (d.open) d.close(); }); } });
  }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0] + " @" + ((e.stack || "").match(/run\.mjs:(\d+)/) || [])[1]);
} finally {
  if (browser) await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));
check("外へ通信しない（Google Fonts の文字だけ）", outside.length === 0, [...new Set(outside)].slice(0, 3).join(","));
{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 詐欺みぬき QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
