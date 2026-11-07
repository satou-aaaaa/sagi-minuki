// 詐欺みぬきの問題の決め方。今日の5問・上級は日本時間の日付から作る種で決まり、だれでも同じ。
// 乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）。Math.random は使わない（練習の種は画面の側で作る）。
(function (root) {
  "use strict";
  const D = typeof module === "object" && module.exports ? require("./data.js") : root.SAGI_DATA;
  const EPOCH = "2026-11-07";
  function seedOf(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  const byId = new Map(D.TPL.map((t) => [t.id, t]));
  const isScam = (t) => t.t !== "safe";
  // 問題を作る：{ id, t, ch, lv, from, sub, L:[[文, あやしい所]], why, scam }。slot の選び方は種から
  function make(id, seed) {
    const tp = byId.get(id);
    if (!tp) return null;
    const r = rng(seed), pick = {};
    for (const k of Object.keys(D.SLOT)) pick[k] = D.SLOT[k][Math.floor(r() * D.SLOT[k].length)];
    const fill = (s) => s.replace(/\{(\w+?)(U?)\}/g, (m, k, u) => { const v = pick[k]; if (!v) return m; return u ? v[1] : v[0]; });
    return { id, t: tp.t, ch: tp.ch, lv: tp.lv, from: fill(tp.from), sub: tp.sub ? fill(tp.sub) : "", L: tp.L.map(([s, f]) => [fill(s), f || null]), why: tp.why || "", scam: isScam(tp) };
  }
  const flagsOf = (p) => [...new Set(p.L.map((x) => x[1]).filter(Boolean))];
  // 1日分を選ぶ：あやしい問題（手口を重ねない）と、ふつうの連絡を1〜2つ。前の日に出た問題は出さない
  function choose(r, lvs, n, avoid) {
    const nSafe = 1 + (r() < 0.5 ? 1 : 0);
    const pool = (scam) => shuffle(D.TPL.filter((t) => isScam(t) === scam && lvs.includes(t.lv) && !avoid.has(t.id)), r);
    const out = [], types = new Set();
    for (const t of pool(true)) { if (out.length >= n - nSafe) break; if (types.has(t.t)) continue; types.add(t.t); out.push(t.id); }
    for (const t of pool(false)) { if (out.length >= n) break; out.push(t.id); }
    return shuffle(out, r);
  }
  const prevDay = (k) => new Date(Date.parse(k) - 864e5).toISOString().slice(0, 10);
  const nextDay = (k) => new Date(Date.parse(k) + 864e5).toISOString().slice(0, 10);
  const memo = new Map();
  // 日付ごとの { d: 今日の5問, h: 上級の5問 }（EPOCH から順に決める。前の2日に出た問題は今日の5問に出さない）
  function dayOf(k) {
    if (memo.has(k)) return memo.get(k);
    let start = k < EPOCH ? k : EPOCH;
    if (k > EPOCH) { let x = k; while (x > EPOCH && !memo.has(x)) x = prevDay(x); start = memo.has(x) ? nextDay(x) : EPOCH; }
    for (let x = start; x <= k; x = nextDay(x)) {
      if (memo.has(x)) continue;
      const p1 = x > EPOCH ? memo.get(prevDay(x)) : null, p2 = p1 && prevDay(x) > EPOCH ? memo.get(prevDay(prevDay(x))) : null;
      const avoidD = new Set([...(p1 ? p1.d.concat(p1.h) : []), ...(p2 ? p2.d.concat(p2.h) : [])].map((it) => it.id)); // 前の2日の今日の5問と上級に出た問題
      const r = rng(seedOf(x + ":d"));
      const d = choose(r, [1, 2], 5, avoidD).map((id, j) => ({ id, s: seedOf(x + ":d:" + j) }));
      const avoidH = new Set([...d.map((it) => it.id), ...(p1 ? p1.h : []).map((it) => it.id)]);
      const rh = rng(seedOf(x + ":h"));
      const h = choose(rh, [2, 3], 5, avoidH).map((id, j) => ({ id, s: seedOf(x + ":h:" + j) }));
      memo.set(x, { d, h });
      if (x === k) break;
    }
    return memo.get(k);
  }
  const dailyList = (k) => dayOf(k).d;
  const hardList = (k) => dayOf(k).h;
  // 練習：手口を選ぶ（"all" はぜんぶから、"safe" はふつうの連絡も多め）。5問、手口が重ならないように
  function practiceList(seed, type) {
    const r = rng(seed);
    let ids;
    if (type === "all" || !type) ids = choose(r, [1, 2, 3], 5, new Set());
    else {
      const of = (f) => shuffle(D.TPL.filter(f), r).map((t) => t.id);
      ids = type === "safe" ? of((t) => t.t === "safe").slice(0, 3).concat(of(isScam).slice(0, 2)) : of((t) => t.t === type).slice(0, 3).concat(of((t) => t.t === "safe").slice(0, 2));
      // 問題が2つしかない手口は、ほかの手口の詐欺で5問にそろえる
      for (const id of of(isScam)) { if (ids.length >= 5) break; if (!ids.includes(id)) ids.push(id); }
      ids = shuffle(ids, r);
    }
    return ids.map((id, j) => ({ id, s: (seed + j * 7919) >>> 0 }));
  }
  const api = { EPOCH, seedOf, rng, shuffle, make, flagsOf, dailyList, hardList, practiceList, isScam, byId, D };
  if (typeof module === "object" && module.exports) module.exports = api; else root.SAGI = api;
})(typeof window !== "undefined" ? window : globalThis);
