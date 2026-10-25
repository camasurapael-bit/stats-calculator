/* ===== Extra features: more stats, grouped percentiles, more charts, CSV import, share link, print, PWA ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const F = x => (typeof fmt === "function" ? fmt(x) : String(+(+x).toFixed(2)));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const note = m => { if (typeof toast === "function") toast(m); };
  const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
  const tcrit = df => df <= 30 ? T95[df - 1] : df <= 40 ? 2.021 : df <= 60 ? 2 : df <= 120 ? 1.98 : 1.96;
  const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const cdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
  const numOnly = el => el.addEventListener("input", () => { const c = el.value.replace(/[^0-9.\-]/g, ""); if (c !== el.value) el.value = c; });

  /* ---------- build the new UI pieces once ---------- */
  const results = $("results"), solution = $("solutionCard");
  const mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; return e; };

  const extra = mk("section", "card glass x-card", `<div class="card-head"><h2><span class="step-dot">+</span> Quartiles &amp; Percentiles</h2></div>
    <div class="table-wrap"><table class="stats-table"><tbody id="xBody"></tbody></table></div>
    <div class="x-tools"><label>Percentile P<sub>k</sub> — k =</label><input id="xK" inputmode="decimal" placeholder="e.g. 90"><b id="xKOut">—</b></div>
    <div class="x-tools"><label>Percentile rank of x =</label><input id="xX" inputmode="decimal" placeholder="e.g. 75"><b id="xXOut">—</b></div>`);
  extra.hidden = true; results.insertBefore(extra, solution);

  const charts = mk("section", "card glass x-card", `<div class="card-head"><h2><span class="step-dot">★</span> More Charts</h2></div>
    <h3 class="x-h">Box plot</h3><div class="x-cv"><canvas id="cvBox"></canvas></div>
    <h3 class="x-h">Ogive (cumulative frequency)</h3><div class="x-cv"><canvas id="cvOgive"></canvas></div>
    <h3 class="x-h">Frequency polygon</h3><div class="x-cv"><canvas id="cvPoly"></canvas></div><div class="x-legend" id="cmmLegend2"></div>
    <h3 class="x-h">Pie chart (relative frequency)</h3><div class="x-cv"><canvas id="cvPie"></canvas></div>`);
  results.appendChild(charts);

  const tools = mk("section", "card glass x-card x-export", `<div class="card-head"><h2><span class="step-dot">⇪</span> Export &amp; Share</h2></div>
    <div class="x-btns"><button type="button" class="btn btn-ghost" id="xPrint">🖨 Print / Save as PDF</button><button type="button" class="btn btn-ghost" id="xShare">🔗 Copy share link</button></div>`);
  results.appendChild(tools);

  const zbox = mk("div", "x-tools zbox", `<label>Z-score of a value x =</label><input id="zIn" inputmode="decimal" placeholder="e.g. 7.5"><b id="zOut">—</b>`);
  $("stdNote").after(zbox);

  const tog = mk("div", "sd-toggle", `<button type="button" data-p="pop">σ population</button><button type="button" data-p="samp">s sample</button>`);
  $("stdSub").after(tog);

  const rawBlock = $("rawBlock");
  const csvBtn = mk("button", "csv-chip", "📂 CSV"); csvBtn.type = "button"; csvBtn.title = "Import numbers from a CSV / text file";
  const csvIn = document.createElement("input"); csvIn.type = "file"; csvIn.accept = ".csv,.txt,text/csv,text/plain"; csvIn.hidden = true;
  rawBlock.style.position = "relative"; rawBlock.append(csvBtn, csvIn);
  csvBtn.addEventListener("click", () => csvIn.click());
  csvIn.addEventListener("change", () => {
    const f = csvIn.files[0]; if (!f) return;
    f.text().then(t => {
      const nums = t.match(/-?\d+(?:\.\d+)?/g) || [];
      if (!nums.length) return note("No numbers found in that file");
      const ta = $("dataInput"); ta.value = nums.join(", "); ta.dispatchEvent(new Event("input", { bubbles: true }));
      note(`Imported ${nums.length} numbers`); csvIn.value = "";
    });
  });

  /* ---------- std-dev toggle (σ / s) ---------- */
  let pref = "pop"; try { pref = localStorage.getItem("sdPref") || "pop"; } catch (e) {}
  const sdOf = r => (pref === "samp" && r.stdSample !== null ? r.stdSample : r.stdPop);
  function applySd() {
    const L = state.last, raw = L && !L.grouped && L.r && L.r.n;
    tog.hidden = !raw; if (!raw) return;
    const r = L.r, alt = pref === "samp" && r.stdSample !== null;
    $("stdMain").textContent = F(sdOf(r));
    $("stdSub").textContent = alt ? `population σ = ${F(r.stdPop)}` : (r.stdSample === null ? "sample s: needs n ≥ 2" : `sample s = ${F(r.stdSample)}`);
    tog.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.p === (alt ? "samp" : "pop")));
  }
  tog.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; pref = b.dataset.p; try { localStorage.setItem("sdPref", pref); } catch (err) {} applySd(); zUpdate(); });

  /* ---------- z-score ---------- */
  function zUpdate() {
    const L = state.last, out = $("zOut"), x = parseFloat($("zIn").value);
    if (!L || L.grouped || isNaN(x)) { out.textContent = "—"; return; }
    const sd = sdOf(L.r); if (!sd) { out.textContent = "n/a"; return; }
    const z = (x - L.r.mean) / sd; out.textContent = `z = ${F(z)} · ≈ ${F(cdf(z) * 100)}th percentile`;
  }
  numOnly($("zIn")); $("zIn").addEventListener("input", zUpdate);

  /* ---------- extra rows for raw data ---------- */
  function rawExtras(r, v) {
    const n = v.length, m = r.mean, sd = r.stdPop, s = r.stdSample;
    const lo = r.q1 - 1.5 * r.iqr, hi = r.q3 + 1.5 * r.iqr, out = v.filter(x => x < lo || x > hi);
    const mad = sum(v.map(x => Math.abs(x - m))) / n;
    const kur = sd ? sum(v.map(x => ((x - m) / sd) ** 4)) / n - 3 : null;
    const se = s === null ? null : s / Math.sqrt(n), t = se === null ? 0 : tcrit(n - 1) * se;
    const rows = [["Midrange", F((r.min + r.max) / 2)], ["Coefficient of variation", m ? F(sd / Math.abs(m) * 100) + "%" : "n/a"],
      ["Mean absolute deviation", F(mad)], ["Standard error", se === null ? "n ≥ 2" : F(se)], ["Kurtosis (excess)", kur === null ? "n/a" : F(kur)],
      ["95% CI for the mean", se === null ? "n ≥ 2" : `${F(m - t)} – ${F(m + t)}`], ["Outlier fences (1.5 × IQR)", `${F(lo)} – ${F(hi)}`],
      ["Outliers", out.length ? out.map(F).join(", ") : "none"]];
    const body = $("statsTableBody"), last = body.lastElementChild;
    rows.forEach(([k, val]) => { const tr = document.createElement("tr"); tr.innerHTML = `<td>${k}</td><td>${val}</td>`; body.insertBefore(tr, last); });
    return { lo, hi, out };
  }

  /* ---------- grouped quartiles / deciles / percentiles ---------- */
  let G = null;
  const pctl = (C, n, p) => { const t = p / 100 * n, c = C.find(c => c.cf >= t) || C[C.length - 1]; return c.lb + c.w * (t - (c.cf - c.f)) / c.f; };
  const prank = (C, n, x) => { if (x <= C[0].lb) return 0; const last = C[C.length - 1]; if (x >= last.ub) return 100; const c = C.find(c => x >= c.lb && x < c.ub); return (c.cf - c.f + c.f * (x - c.lb) / c.w) / n * 100; };
  function grpExtras(C) {
    const n = C[C.length - 1].cf; G = { C, n };
    const q = [25, 50, 75].map(p => pctl(C, n, p)), rows = [["Q1 (P25)", F(q[0])], ["Q2 (median)", F(q[1])], ["Q3 (P75)", F(q[2])], ["IQR", F(q[2] - q[0])]];
    for (let d = 1; d <= 9; d++) rows.push([`D${d} (P${d * 10})`, F(pctl(C, n, d * 10))]);
    $("xBody").innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
    xUpdate(); return q;
  }
  function xUpdate() {
    if (!G) return; const k = parseFloat($("xK").value), x = parseFloat($("xX").value);
    $("xKOut").textContent = isNaN(k) || k < 0 || k > 100 ? "—" : `P${k} = ${F(pctl(G.C, G.n, k))}`;
    $("xXOut").textContent = isNaN(x) ? "—" : `${F(prank(G.C, G.n, x))}th percentile`;
  }
  [$("xK"), $("xX")].forEach(i => { numOnly(i); i.addEventListener("input", xUpdate); });

  /* ---------- charts ---------- */
  function setup(cv, h) { const dpr = window.devicePixelRatio || 1, w = cv.parentElement.clientWidth || 320; cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px"; const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = "11px system-ui, sans-serif"; return { c, w, h }; }
  /* ---------- mean / median / mode markers ---------- */
  const MC = { mean: "#ffd54a", median: "#4ade80", mode: "#f472b6" };
  function cmm(L) {
    if (L.grouped) return L.stat;
    const r = L.r;
    return { mean: r.mean, median: r.median, modes: r.mode.type === "none" ? [] : r.mode.modes.slice(0, 6) };
  }
  function drawMarks(c, X, y0, y1, m) {
    const items = [["mean", m.mean, [6, 4]], ["median", m.median, []], ...m.modes.map(v => ["mode", v, [2, 3]])];
    items.forEach(([k, v, d]) => {
      if (v == null || isNaN(v)) return;
      c.save(); c.strokeStyle = MC[k]; c.lineWidth = 2; c.setLineDash(d);
      c.beginPath(); c.moveTo(X(v), y0); c.lineTo(X(v), y1); c.stroke(); c.restore();
    });
  }
  function legends(m) {
    const lg = (k, t, d) => `<span class="lg"><i style="--c:${MC[k]};--d:${d}"></i>${t}</span>`;
    const html = lg("mean", "Mean = " + F(m.mean), "dashed") + lg("median", "Median = " + F(m.median), "solid") +
      lg("mode", m.modes.length ? "Mode = " + m.modes.map(F).join(", ") : "Mode = none", "dotted");
    ["cmmLegend", "cmmLegend2"].forEach(id => { const e = $(id); if (e) e.innerHTML = html; });
  }
  const histWrap = $("histogram") && $("histogram").closest(".chart-wrap");
  if (histWrap) { const d = document.createElement("div"); d.className = "x-legend"; d.id = "cmmLegend"; histWrap.after(d); }

  function histMarks() {
    const L = state.last; if (!L || $("results").hidden) return;
    const cv = $("histogram"), w = parseFloat(cv.style.width), h = parseFloat(cv.style.height);
    if (!w || !h) return;
    const m = cmm(L), pad = { l: 36, r: 10, t: 14, b: 34 }, cw = w - pad.l - pad.r;
    let X;
    if (L.grouped) {
      const C = L.grouped, bw = cw / C.length;
      X = v => {
        let i = C.findIndex(c => v >= c.lb && v < c.ub), f;
        if (i < 0) { i = v < C[0].lb ? 0 : C.length - 1; f = v < C[0].lb ? 0 : 1; } else f = (v - C[i].lb) / C[i].w;
        return pad.l + (i + f) * bw;
      };
    } else {
      const r = L.r, u = [...new Set(L.values)].sort((a, b) => a - b);
      if (u.length <= 12 && u.every(Number.isInteger)) {
        const bw = cw / u.length;
        X = v => {
          let j = 0; while (j < u.length - 2 && v > u[j + 1]) j++;
          const t = u.length === 1 ? 0 : Math.min(1, Math.max(0, (v - u[j]) / (u[j + 1] - u[j])));
          return pad.l + (j + t + 0.5) * bw;
        };
      } else X = v => pad.l + (v - r.min) / ((r.max - r.min) || 1) * cw;
    }
    const c = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMarks(c, X, pad.t, h - pad.b, m);
    legends(m);
  }
  const prevHist = window.renderHistogram;
  window.renderHistogram = function () {
    const res = prevHist.apply(this, arguments);
    try { histMarks(); } catch (e) { console.error(e); }
    return res;
  };

  function line(cv, pts, marks) {
    const { c, w, h } = setup(cv, 210), L = 36, R = 12, T = 10, B = 26, ac = css("--accent"), dim = css("--text-dim"), gl = css("--border");
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y1 = Math.max(...pts.map(p => p[1])) || 1;
    const X = x => L + (x1 === x0 ? .5 : (x - x0) / (x1 - x0)) * (w - L - R), Y = y => h - B - y / y1 * (h - T - B);
    c.strokeStyle = gl; c.fillStyle = dim; c.lineWidth = 1; c.textAlign = "right";
    for (let i = 0; i <= 4; i++) { const y = y1 * i / 4; c.beginPath(); c.moveTo(L, Y(y)); c.lineTo(w - R, Y(y)); c.stroke(); c.fillText(F(y), L - 5, Y(y) + 4); }
    c.textAlign = "center"; [x0, (x0 + x1) / 2, x1].forEach(x => c.fillText(F(x), X(x), h - 8));
    const g = c.createLinearGradient(0, T, 0, h - B); g.addColorStop(0, ac + "66"); g.addColorStop(1, ac + "00");
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])));
    c.lineTo(X(pts[pts.length - 1][0]), Y(0)); c.lineTo(X(pts[0][0]), Y(0)); c.closePath(); c.fillStyle = g; c.fill();
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.strokeStyle = ac; c.lineWidth = 2.2; c.lineJoin = "round"; c.stroke();
    if (marks) drawMarks(c, X, T, h - B, marks);
    c.fillStyle = ac; pts.length <= 40 && pts.forEach(p => { c.beginPath(); c.arc(X(p[0]), Y(p[1]), 3, 0, 7); c.fill(); });
  }
  function box(cv, s) {
    const { c, w, h } = setup(cv, 120), L = 14, R = 14, mid = 46, bh = 34, dim = css("--text-dim"), ac = css("--accent"), tx = css("--text");
    const lo = Math.min(s.min, ...(s.out || [])), hi = Math.max(s.max, ...(s.out || [])), X = x => L + (hi === lo ? .5 : (x - lo) / (hi - lo)) * (w - L - R);
    c.strokeStyle = dim; c.lineWidth = 1.6; c.beginPath(); c.moveTo(X(s.wl), mid); c.lineTo(X(s.wh), mid); c.moveTo(X(s.wl), mid - 9); c.lineTo(X(s.wl), mid + 9); c.moveTo(X(s.wh), mid - 9); c.lineTo(X(s.wh), mid + 9); c.stroke();
    c.fillStyle = ac + "55"; c.strokeStyle = ac; c.lineWidth = 2; c.beginPath(); c.rect(X(s.q1), mid - bh / 2, Math.max(2, X(s.q3) - X(s.q1)), bh); c.fill(); c.stroke();
    c.strokeStyle = tx; c.lineWidth = 3; c.beginPath(); c.moveTo(X(s.med), mid - bh / 2); c.lineTo(X(s.med), mid + bh / 2); c.stroke();
    if (s.mean != null) {
      const mx = X(s.mean); c.fillStyle = MC.mean; c.strokeStyle = css("--bg-0"); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(mx, mid - 8); c.lineTo(mx + 8, mid); c.lineTo(mx, mid + 8); c.lineTo(mx - 8, mid); c.closePath(); c.fill(); c.stroke();
      c.textAlign = "center"; c.fillText("x̄ = " + F(s.mean), Math.min(w - 40, Math.max(40, mx)), mid - bh / 2 - 6);
    }
    c.fillStyle = "#ff6a3d"; (s.out || []).forEach(o => { c.beginPath(); c.arc(X(o), mid, 3.5, 0, 7); c.fill(); });
    c.fillStyle = dim; c.textAlign = "center"; [["min", s.wl], ["Q1", s.q1], ["Md", s.med], ["Q3", s.q3], ["max", s.wh]].forEach(([k, v], i) => { const x = Math.min(w - 20, Math.max(20, X(v))); c.fillText(k, x, mid + bh / 2 + 16 + (i % 2) * 14 - 0); c.fillText(F(v), x, mid + bh / 2 + 30 + (i % 2) * 14); });
  }
  const col = (i, n) => `hsl(${(24 + i * 360 / n) % 360}, 72%, 56%)`;
  function pie(cv, items) {
    const tot = sum(items.map(i => i.f)) || 1, w = cv.parentElement.clientWidth || 320;
    const R = Math.min(95, w / 2 - 16), rowH = 18, h = R * 2 + 36 + items.length * rowH;
    const { c } = setup(cv, h);
    const cx = w / 2, cy = R + 14, dim = css("--text-dim"), bg = css("--bg-1"), L = 16;
    let a0 = -Math.PI / 2;
    items.forEach((it, i) => {
      const a1 = a0 + it.f / tot * 2 * Math.PI;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath();
      c.fillStyle = col(i, items.length); c.fill(); c.strokeStyle = bg; c.lineWidth = 2; c.stroke();
      if (it.f / tot > 0.05) {
        const m = (a0 + a1) / 2; c.fillStyle = "#fff"; c.textAlign = "center";
        c.fillText(F(it.f / tot * 100) + "%", cx + Math.cos(m) * R * 0.65, cy + Math.sin(m) * R * 0.65 + 4);
      }
      a0 = a1;
    });
    c.textAlign = "left";
    items.forEach((it, i) => {
      const y = cy + R + 24 + i * rowH;
      c.fillStyle = col(i, items.length); c.fillRect(L, y - 9, 10, 10);
      c.fillStyle = dim; c.fillText(`${it.label}  ·  f = ${it.f} (${F(it.f / tot * 100)}%)`, L + 16, y);
    });
  }
  let CH = null;
  function drawCharts() {
    if (!CH) return;
    box($("cvBox"), CH.box); line($("cvOgive"), CH.ogive); line($("cvPoly"), CH.poly, CH.marks); pie($("cvPie"), CH.pie);
  }

  function rawCharts(r, v, fence) {
    const s = v.slice().sort((a, b) => a - b), n = s.length, ins = s.filter(x => x >= fence.lo && x <= fence.hi);
    const u = [...new Set(s)], cum = []; let i = 0; u.forEach(x => { while (i < n && s[i] <= x) i++; cum.push([x, i]); });
    const k = Math.max(3, Math.ceil(1 + Math.log2(n))), a = s[0], b = s[n - 1], w = (b - a) / k || 1, cnt = new Array(k).fill(0);
    s.forEach(x => cnt[Math.min(k - 1, Math.floor((x - a) / w))]++);
    const poly = [[a - w / 2, 0], ...cnt.map((f, j) => [a + w * (j + .5), f]), [b + w / 2, 0]];
    CH = { box: { min: a, max: b, wl: ins[0], wh: ins[ins.length - 1], q1: r.q1, med: r.median, q3: r.q3, out: fence.out }, ogive: [[a, 0], ...cum], poly,
      pie: cnt.map((f, j) => ({ label: `${F(a + w * j)} – ${F(a + w * (j + 1))}`, f })) };
  }
  function grpCharts(C, q) {
    const w = C[0].w; CH = { box: { min: C[0].lb, max: C[C.length - 1].ub, wl: C[0].lb, wh: C[C.length - 1].ub, q1: q[0], med: q[1], q3: q[2], out: [] },
      ogive: [[C[0].lb, 0], ...C.map(c => [c.ub, c.cf])], poly: [[C[0].x - w, 0], ...C.map(c => [c.x, c.f]), [C[C.length - 1].x + w, 0]],
      pie: C.map(c => ({ label: `${F(c.lb)} – ${F(c.ub)}`, f: c.f })) };
  }

  /* ---------- hook into every calculation ---------- */
  const base = window.calculate;
  window.calculate = function () {
    const res = base.apply(this, arguments);
    try {
      const L = state.last, ok = L && !$("results").hidden;
      if (!ok) { extra.hidden = true; return res; }
      if (L.grouped && L.grouped.length) { extra.hidden = false; grpCharts(L.grouped, grpExtras(L.grouped)); }
      else { extra.hidden = true; G = null; rawCharts(L.r, L.values, rawExtras(L.r, L.values)); }
      CH.marks = cmm(L); CH.box.mean = CH.marks.mean; legends(CH.marks);
      applySd(); zUpdate(); requestAnimationFrame(drawCharts);
    } catch (e) { console.error(e); }
    return res;
  };
  window.addEventListener("resize", () => setTimeout(drawCharts, 80));
  const tg = $("themeToggle"); if (tg) tg.addEventListener("click", () => setTimeout(drawCharts, 80));

  /* ---------- print + share ---------- */
  $("xPrint").addEventListener("click", () => window.print());
  $("xShare").addEventListener("click", () => {
    const v = $("dataInput").value.trim();
    if (!v || !document.querySelector('.mode-tab.active[data-mode="raw"]')) return note("Share link works for raw data");
    const url = location.origin + location.pathname + "#d=" + encodeURIComponent(btoa(v));
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => note("🔗 Link copied"), () => prompt("Copy this link:", url));
  });
  const m = /^#d=(.+)$/.exec(location.hash);
  if (m) { try { $("dataInput").value = atob(decodeURIComponent(m[1])); setTimeout(() => window.calculate(), 350); } catch (e) {} }

  /* ---------- installable app (works offline) ---------- */
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
