/* ============ Statistics Calculator — Logic ============ */
"use strict";

/* ---------------- Stats core ---------------- */
const Stats = {
  MIN: 40,
  parse(raw) {
    if (!raw || !raw.trim()) throw new Error("Please enter at least one number.");
    const tokens = raw.split(/[\s,;]+/).filter(t => t.length > 0);
    if (tokens.length === 0) throw new Error("Please enter at least one number.");
    const values = [];
    const invalid = [];
    for (const t of tokens) {
      const n = Number(t);
      if (!Number.isFinite(n)) { invalid.push(t); continue; }
      values.push(n);
    }
    if (invalid.length > 0)
      throw new Error("Invalid value(s) detected: " + invalid.slice(0, 6).map(v => `"${v}"`).join(", ") +
        (invalid.length > 6 ? ` and ${invalid.length - 6} more` : ""));
    if (values.length < Stats.MIN)
      throw new Error(`Minimum of ${Stats.MIN} values required — you entered ${values.length}.`);
    return values;
  },

  mean(v) { return v.reduce((a, b) => a + b, 0) / v.length; },

  median(sorted) {
    const n = sorted.length, mid = Math.floor(n / 2);
    return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  mode(v) {
    const freq = new Map();
    for (const x of v) freq.set(x, (freq.get(x) || 0) + 1);
    let max = 0;
    for (const c of freq.values()) if (c > max) max = c;
    if (max === 1) return { modes: [], type: "none" };          // all unique → no mode
    const modes = [...freq.entries()].filter(([, c]) => c === max).map(([x]) => x).sort((a, b) => a - b);
    return { modes, type: modes.length === 1 ? "unimodal" : "multimodal", maxFreq: max };
  },

  variance(v, meanVal, sample) {
    const ss = v.reduce((acc, x) => acc + (x - meanVal) ** 2, 0);
    return ss / (sample ? v.length - 1 : v.length);
  },

  quantile(sorted, q) { // linear interpolation (method used by numpy "linear" / Excel PERCENTILE.INC)
    const n = sorted.length;
    if (n === 1) return sorted[0];
    const pos = (n - 1) * q, base = Math.floor(pos), rest = pos - base;
    return sorted[base + 1] !== undefined
      ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
      : sorted[base];
  },

  compute(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const m = Stats.mode(values);
    const varP = Stats.variance(values, mean, false);
    const varS = n >= 2 ? Stats.variance(values, mean, true) : null;
    return {
      n, sum, mean,
      sorted,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      median: Stats.median(sorted),
      mode: m,
      variancePop: varP,
      varianceSample: varS,
      stdPop: Math.sqrt(varP),
      stdSample: varS === null ? null : Math.sqrt(varS),
      q1: Stats.quantile(sorted, 0.25),
      q3: Stats.quantile(sorted, 0.75),
      iqr: Stats.quantile(sorted, 0.75) - Stats.quantile(sorted, 0.25),
      skewness: n >= 3 ? (n / ((n - 1) * (n - 2))) * values.reduce((a, x) => a + ((x - mean) / Math.sqrt(varP)) ** 3, 0) : null
    };
  }
};

/* ---------------- Formatting ---------------- */
const state = { precision: 2, last: null };

function fmt(x) {
  if (x === null || x === undefined) return "—";
  if (!Number.isFinite(x)) return String(x);
  const r = Number(x.toFixed(state.precision));
  return Number.isInteger(r) ? String(r) : r.toFixed(state.precision).replace(/\.?0+$/, m => m.includes(".") ? "" : m);
}

function fmtList(arr) { return arr.map(fmt).join(", "); }

/* ---------------- DOM refs ---------------- */
const $ = id => document.getElementById(id);
const inputEl = $("dataInput"), errorEl = $("inputError"), resultsEl = $("results");
const tableBody = $("statsTableBody"), freqBody = $("freqBody"), historyList = $("historyList");

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------------- Count-up animation ---------------- */
function countUp(el, target, decimals) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = target; return;
  }
  const dur = 750, start = performance.now();
  const from = 0;
  function frame(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = (from + (target - from) * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = target;
  }
  requestAnimationFrame(frame);
}

/* ---------------- Render ---------------- */
function renderTable(r) {
  const m = r.mode;
  const modeText = m.type === "none"
    ? "No mode (all values unique)"
    : `${fmtList(m.modes)}${m.type === "multimodal" ? "  (multimodal)" : ""}`;
  const rows = [
    ["Count (n)", String(r.n)],
    ["Sum", fmt(r.sum)],
    ["Mean (x̄)", fmt(r.mean), true],
    ["Median", fmt(r.median), true],
    ["Mode", modeText, true],
    ["Std Dev — Population (σ)", fmt(r.stdPop), true],
    ["Std Dev — Sample (s)", r.stdSample === null ? "Requires n ≥ 2" : fmt(r.stdSample)],
    ["Variance — Population (σ²)", fmt(r.variancePop)],
    ["Variance — Sample (s²)", r.varianceSample === null ? "Requires n ≥ 2" : fmt(r.varianceSample)],
    ["Minimum", fmt(r.min)],
    ["Maximum", fmt(r.max)],
    ["Range", fmt(r.range)],
    ["Q1 (25th percentile)", fmt(r.q1)],
    ["Q3 (75th percentile)", fmt(r.q3)],
    ["IQR (Q3 − Q1)", fmt(r.iqr)],
    ["Skewness", r.skewness === null ? "Requires n ≥ 3" : fmt(r.skewness)],
    ["Sorted data", r.sorted.map(x => fmt(x)).join(", ")]
  ];
  tableBody.innerHTML = rows.map(([k, v, hl]) =>
    `<tr class="${hl ? "row-highlight" : ""}"><td>${k}</td><td>${v}</td></tr>`).join("");
}

function renderFreq(r, values) {
  const freq = new Map();
  for (const x of values) freq.set(x, (freq.get(x) || 0) + 1);
  const entries = [...freq.entries()].sort((a, b) => a[0] - b[0]);
  const max = Math.max(...entries.map(([, c]) => c));
  freqBody.innerHTML = entries.map(([v, c]) => `
    <tr>
      <td>${fmt(v)}</td>
      <td>${c}</td>
      <td>${((c / r.n) * 100).toFixed(1)}%</td>
      <td><div class="freq-bar-track"><div class="freq-bar" data-w="${(c / max) * 100}"></div></div></td>
    </tr>`).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    freqBody.querySelectorAll(".freq-bar").forEach(b => { b.style.width = b.dataset.w + "%"; });
  }));
}

function renderHistogram(values, r) {
  const canvas = $("histogram");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth || 600;
  const cssH = 260;
  canvas.width = cssW * dpr; canvas.height = cssH * dpr;
  canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // Binning (Freedman–Diaconis fallback to Sturges)
  const unique = [...new Set(values)];
  let binCount, edges;
  const rangeV = r.max - r.min;
  if (unique.length <= 12 && unique.every(x => Number.isInteger(x))) {
    const map = new Map();
    for (const x of values) map.set(x, (map.get(x) || 0) + 1);
    drawValueBars(ctx, cssW, cssH, [...map.entries()].sort((a, b) => a[0] - b[0]), values.length, r);
    $("binInfo").textContent = `${unique.length} unique integer value${unique.length > 1 ? "s" : ""}`;
    return;
  }
  let width = rangeV / 10;
  if (r.iqr > 0) width = 2 * r.iqr / Math.cbrt(values.length);
  binCount = Math.max(3, Math.min(20, Math.ceil(rangeV / (width || rangeV / 10 || 1))));
  edges = [];
  for (let i = 0; i <= binCount; i++) edges.push(r.min + (rangeV * i) / binCount);
  const counts = new Array(binCount).fill(0);
  for (const x of values) {
    let idx = Math.floor((x - r.min) / (rangeV / binCount));
    if (idx >= binCount) idx = binCount - 1;
    counts[idx]++;
  }
  drawBars(ctx, cssW, cssH, counts, edges);
  $("binInfo").textContent = `${binCount} bins`;
}

const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
const axisC = () => isLight() ? "#566a94" : "#93a0bd";
const gridC = () => isLight() ? "rgba(30,60,120,0.12)" : "rgba(255,255,255,0.08)";
const valC = () => isLight() ? "#1e3a8a" : "#cfe0ff";

function styleCtx(ctx) {
    ctx.fillStyle = axisC();
  ctx.font = "11px Segoe UI, sans-serif";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
}

function drawBars(ctx, w, h, counts, edges) {
  const pad = { l: 36, r: 10, t: 14, b: 34 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const maxC = Math.max(...counts, 1);
  const yTicks = 4;
  styleCtx(ctx);
  for (let i = 0; i <= yTicks; i++) {
    const y = pad.t + ch - (ch * i) / yTicks;
    ctx.strokeStyle = gridC();
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round((maxC * i) / yTicks)), pad.l - 6, y + 4);
  }
  const bw = cw / counts.length;
  counts.forEach((c, i) => {
    const bh = (c / maxC) * ch;
    const x = pad.l + i * bw, y = pad.t + ch - bh;
    const g = ctx.createLinearGradient(0, y, 0, pad.t + ch);
    g.addColorStop(0, "rgba(37,99,235,0.95)");
    g.addColorStop(1, "rgba(96,165,250,0.35)");
    ctx.fillStyle = g;
    const gap = Math.min(4, bw * 0.12);
    roundRect(ctx, x + gap / 2, y, bw - gap, bh, 5);
    ctx.fill();
    if (counts.length <= 12 || i % 2 === 0) {
      ctx.fillStyle = axisC(); ctx.textAlign = "center";
      const label = fmt(edges[i]);
      ctx.fillText(label, x + bw / 2, h - pad.b + 16);
    }
  });
  ctx.fillStyle = axisC(); ctx.textAlign = "center";
  ctx.fillText(fmt(edges[edges.length - 1]), pad.l + cw, h - pad.b + 16);
  ctx.textAlign = "left"; ctx.fillText("Freq", 4, pad.t - 2);
}

function drawValueBars(ctx, w, h, entries, total, r) {
  const pad = { l: 36, r: 10, t: 14, b: 34 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const maxC = Math.max(...entries.map(([, c]) => c), 1);
  styleCtx(ctx);
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ch - (ch * i) / 4;
    ctx.strokeStyle = gridC();
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.fillText(String(Math.round((maxC * i) / 4)), pad.l - 6, y + 4);
  }
  // mean line
  const n = entries.length, bw = cw / n;
  const meanX = pad.l + ((r.mean - entries[0][0]) / Math.max(1, (entries[n - 1][0] - entries[0][0]))) * (cw - bw) + bw / 2;
  const bw2 = cw / Math.max(1, (entries[n - 1][0] - entries[0][0]) || 1);
  const exactMeanX = pad.l + (r.mean - entries[0][0]) * bw2 + bw / 2;
  const mx = (entries.length === 1) ? pad.l + bw / 2 : exactMeanX;
  if (mx >= pad.l && mx <= w - pad.r) {
    ctx.strokeStyle = "rgba(14,165,233,0.9)";
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(mx, pad.t); ctx.lineTo(mx, pad.t + ch); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(14,165,233,1)"; ctx.textAlign = "center";
    ctx.fillText("mean " + fmt(r.mean), mx, pad.t - 2 > 10 ? pad.t - 2 : 10);
  }
  entries.forEach(([val, c], i) => {
    const bh = (c / maxC) * ch;
    const x = pad.l + i * bw, y = pad.t + ch - bh;
    const g = ctx.createLinearGradient(0, y, 0, pad.t + ch);
    g.addColorStop(0, "rgba(37,99,235,0.95)");
    g.addColorStop(1, "rgba(96,165,250,0.35)");
    ctx.fillStyle = g;
    const gap = Math.min(6, bw * 0.25);
    roundRect(ctx, x + gap / 2, y, bw - gap, bh, 5);
    ctx.fill();
    ctx.fillStyle = axisC(); ctx.textAlign = "center";
    ctx.fillText(fmt(val), x + bw / 2, h - pad.b + 16);
    ctx.fillStyle = valC();
    if (c > 0) ctx.fillText(String(c), x + bw / 2, y - 5);
  });
  ctx.textAlign = "left"; ctx.fillStyle = axisC(); ctx.fillText("Freq", 4, pad.t - 2);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, 0);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- History ---------------- */
const HKEY = "statsCalcHistory";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 8))); } catch {}
}
function renderHistory() {
  const list = loadHistory();
  historyList.innerHTML = list.length === 0
    ? `<li class="history-empty">No calculations yet — results will appear here.</li>`
    : list.map((h, i) => `
      <li class="history-item" style="animation-delay:${i * 50}ms">
        <div class="history-main">
          <span class="history-data" title="${escapeHtml(h.raw)}">${escapeHtml(h.raw)}</span>
          <span class="history-summary">n=${h.n} · mean=${h.mean} · median=${h.median} · σ=${h.stdPop}</span>
        </div>
        <div class="history-actions">
          <button class="btn-chip" data-restore="${i}">Load</button>
          <button class="btn-chip" data-remove="${i}">✕</button>
        </div>
      </li>`).join("");
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- Main flow ---------------- */
function calculate() {
  errorEl.hidden = true;
  let values;
  try { values = Stats.parse(inputEl.value); }
  catch (e) {
    errorEl.textContent = "⚠ " + e.message;
    errorEl.hidden = false;
    resultsEl.hidden = true;
    return;
  }

  const r = Stats.compute(values);
  state.last = { r, values };

  // hero cards
  $("meanVal").textContent = fmt(r.mean);
  $("medianVal").textContent = fmt(r.median);
  $("modeVal").textContent = r.mode.type === "none" ? "none" : fmtList(r.mode.modes);
  const stdEl = $("stdMain"), subEl = $("stdSub");
  stdEl.textContent = fmt(r.stdPop);
  subEl.textContent = r.stdSample === null
    ? "sample s: needs n ≥ 2"
    : `sample s = ${fmt(r.stdSample)}`;

  renderTable(r);
  renderHistogram(values, r);
  $("stdNote").textContent = "σ divides by n (whole population) · s divides by n−1 (sample estimate).";

  // count-up animation on mean/median
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    countUp($("meanVal"), Number(fmt(r.mean)), state.precision);
    countUp($("medianVal"), Number(fmt(r.median)), state.precision);
  }

  resultsEl.hidden = false;
  resultsEl.classList.remove("anim-in"); // restart pop animations
  document.querySelectorAll(".anim-pop").forEach(el => {
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  });

  // history
  const hist = loadHistory();
  hist.unshift({
    raw: inputEl.value.trim().slice(0, 120),
    n: r.n, mean: fmt(r.mean), median: fmt(r.median), stdPop: fmt(r.stdPop),
    values: values
  });
  saveHistory(hist);
  renderHistory();

  toast("✓ Calculated " + r.n + " value" + (r.n > 1 ? "s" : ""));
  if (window.innerWidth < 760) resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------- Copy / export ---------------- */
function buildResultsText() {
  if (!state.last) return "";
  const r = state.last.r;
  const rows = [
    ["Values", state.last.values.join(", ")],
    ["Count (n)", r.n], ["Sum", fmt(r.sum)],
    ["Mean", fmt(r.mean)], ["Median", fmt(r.median)],
    ["Mode", r.mode.type === "none" ? "none" : r.mode.modes.join(", ")],
    ["Std Dev population σ", fmt(r.stdPop)],
    ["Std Dev sample s", r.stdSample === null ? "n/a (n<2)" : fmt(r.stdSample)],
    ["Variance population", fmt(r.variancePop)],
    ["Variance sample", r.varianceSample === null ? "n/a (n<2)" : fmt(r.varianceSample)],
    ["Min / Max / Range", `${fmt(r.min)} / ${fmt(r.max)} / ${fmt(r.range)}`],
    ["Q1 / Q3 / IQR", `${fmt(r.q1)} / ${fmt(r.q3)} / ${fmt(r.iqr)}`],
    ["Skewness", r.skewness === null ? "n/a (n<3)" : fmt(r.skewness)],
    ["Sorted", r.sorted.join(", ")]
  ];
  return "STATISTICS RESULTS\n" + rows.map(([k, v]) => `${k}: ${v}`).join("\n");
}

function copyResults() {
  const text = buildResultsText();
  if (!text) return;
  const done = () => toast("📋 Results copied to clipboard");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch { toast("Copy failed — please select manually", true); }
  document.body.removeChild(ta);
}
function downloadResults() {
  const text = buildResultsText();
  if (!text) return;
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "statistics-results.txt";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("⬇ Results downloaded as .txt");
}

/* ---------------- Events ---------------- */
$("calcBtn").addEventListener("click", calculate);
inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); calculate(); }
});
$("clearBtn").addEventListener("click", () => {
  inputEl.value = ""; errorEl.hidden = true; resultsEl.hidden = true; state.last = null;
});
$("precision").addEventListener("change", () => {
  state.precision = +$("precision").value;
  if (state.last) calculate();
});
$("copyResultsBtn").addEventListener("click", copyResults);

const SAMPLES = {
  "1": "4, 8, 6, 5, 3, 8, 9, 5, 7, 8, 6, 7, 5, 9, 4, 8, 7, 6, 5, 8, 3, 7, 9, 6, 8, 5, 7, 4, 8, 6, 9, 7, 5, 8, 6, 7, 4, 8, 9, 5, 7, 6",
  "2": "2.5, 3.75, -1.2, 4.8, 3.75, 0.5, -1.2, 2.5, 6.25, 1.1, 3.3, -0.8, 5.4, 2.9, 4.1, 0.7, -2.1, 3.6, 5.9, 1.8, 2.2, -1.5, 4.4, 3.1, 6.0, 0.9, 2.7, -0.3, 5.1, 3.9, 1.4, 4.7, 2.0, -1.9, 3.4, 5.6, 0.2, 2.5, 4.3, 3.75, 1.6, -0.6",
  "3": "1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19",
  "4": "12, 15, 22, 18, 25, 30, 14, 19, 27, 21, 16, 23, 29, 17, 24, 20, 26, 13, 28, 19, 22, 15, 31, 18, 25, 21, 17, 24, 20, 27, 16, 23, 19, 26, 14, 22, 30, 18, 25, 21, 17, 28, 20, 24, 15, 29, 19, 23, 26, 22"
};
document.querySelectorAll(".btn-chip[data-sample]").forEach(b =>
  b.addEventListener("click", () => { inputEl.value = SAMPLES[b.dataset.sample]; calculate(); }));

historyList.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const hist = loadHistory();
  if (btn.dataset.restore !== undefined) {
    const h = hist[+btn.dataset.restore];
    if (h) { inputEl.value = h.values.join(", "); calculate(); }
  } else if (btn.dataset.remove !== undefined) {
    hist.splice(+btn.dataset.remove, 1);
    saveHistory(hist);
    renderHistory();
  }
});
$("clearHistoryBtn").addEventListener("click", () => {
  saveHistory([]); renderHistory(); toast("History cleared");
});

/* ---------------- Theme toggle ---------------- */
const THEME_KEY = "statsTheme";
function syncThemeToggle() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isLight ? "#f5f9ff" : "#060d20");
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.setAttribute("aria-pressed", String(isLight));
    btn.title = isLight ? "Switch to dark mode" : "Switch to light mode";
  }
}
document.getElementById("themeToggle").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  syncThemeToggle();
  if (state.last && !resultsEl.hidden) renderHistogram(state.last.values, state.last.r);
  toast((next === "light" ? "☀️ Light" : "🌙 Dark") + " theme enabled");
});

window.addEventListener("resize", () => {
  if (state.last && !resultsEl.hidden) renderHistogram(state.last.values, state.last.r);
});

syncThemeToggle();
renderHistory();
