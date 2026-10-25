/* ===== Grouped data mode + step-by-step solution (loads after script.js) ===== */
(function () {
  "use strict";
  const g = id => document.getElementById(id);
  const N = x => String(Number(x.toFixed(state.precision)));
  const clean = x => Number(x.toFixed(10));
  const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const box = v => `<span class="boxed">${v}</span>`;
  const eq = t => `<div class="eq">${t}</div>`;
  const h = t => `<h3 class="sol-h">${t}</h3>`;
  const note = t => `<p class="sol-note">${t}</p>`;
  const bk = c => `<span class="bk">${c}</span>`;
  const tbl = (head, body, foot, cls) =>
    `<table class="sol-table ${cls || ""}">` +
    (head ? `<thead><tr>${head.map(c => `<th>${c}</th>`).join("")}</tr></thead>` : "") +
    `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>` +
    (foot ? `<tfoot><tr>${foot.map(c => `<td>${c}</td>`).join("")}</tr></tfoot>` : "") + `</table>`;

  let mode = "raw";
  function resetCards() {
    ["meanVal", "medianVal", "modeVal", "stdMain", "stdSub"].forEach(id => (g(id).textContent = "—"));
    g("metricGrid").classList.add("is-empty");
  }
  const showCards = () => g("metricGrid").classList.remove("is-empty");
  const toCards = () => {}; // scrolling to the result boxes is handled in ui.js

  /* ---------- variance table + s², s, σ², σ ---------- */
  function varianceBlock(rows, mean, n, withClass) {
    let ss = 0;
    const all = rows.map(r => {
      const d = r.x - mean, d2 = d * d, fd2 = r.f * d2;
      ss += fd2;
      return withClass
        ? [r.cls, r.f, N(r.x), N(d), N(d2), N(fd2)]
        : [N(r.x), r.f, N(d), N(d2), N(fd2)];
    });
    const shown = all.slice(0, 60);
    const head = withClass
      ? ["Class", "f", "x", "x−x̄", "(x−x̄)²", "f(x−x̄)²"]
      : ["x", "f", "x−x̄", "(x−x̄)²", "f(x−x̄)²"];
    const foot = withClass ? ["Σ", n, "", "", "", N(ss)] : ["Σ", n, "", "", N(ss)];
    let html = tbl(head, shown, foot);
    if (all.length > 60) html += note(`Showing the first 60 of ${all.length} rows — totals use every row.`);
    html += eq(`Σf(x−x̄)² = ${N(ss)}`);
    const out = { ss, p2: ss / n, p: Math.sqrt(ss / n), s2: null, s: null };
    if (n >= 2) {
      out.s2 = ss / (n - 1); out.s = Math.sqrt(out.s2);
      html += eq(`s² = ${frac("Σf(x−x̄)²", "n − 1")} = ${frac(N(ss), n - 1)} = ${box(N(out.s2))}`);
      html += eq(`s = √${N(out.s2)} = ${box(N(out.s))}`);
    } else html += note("Sample variance / s needs n ≥ 2.");
    html += eq(`σ² = ${frac("Σf(x−μ)²", "N")} = ${frac(N(ss), n)} = ${box(N(out.p2))}`);
    html += eq(`σ = √${N(out.p2)} = ${box(N(out.p))}`);
    out.html = html;
    return out;
  }

  const LEGEND = n => `<div class="legend"><span><b>n</b> = number of values in a <i>sample</i> (s divides by n − 1)</span><span><b>N</b> = number of values in the <i>whole population</i> (σ divides by N)</span><span>Your data has <b>${n}</b> values, so n = N = ${n}. μ = x̄ (same mean).</span></div>`;
  const summary = rows => tbl(["Statistic", "Value"], rows, null, "sum");
  const summaryRows = (n, mean, med, modeTxt, v) => [
    ["Count (n)", n], ["Mean (x̄)", N(mean)], ["Median", N(med)], ["Mode", modeTxt],
    ["Variance — sample (s²)", v.s2 === null ? "n ≥ 2 needed" : N(v.s2)],
    ["Std Dev — sample (s)", v.s === null ? "n ≥ 2 needed" : N(v.s)],
    ["Variance — population (σ²)", N(v.p2)], ["Std Dev — population (σ)", N(v.p)]
  ];

  /* ---------- RAW solution ---------- */
  function rawSolution(r, values) {
    const n = r.n, s = r.sorted;
    const fm = new Map();
    for (const x of values) fm.set(x, (fm.get(x) || 0) + 1);
    let cum = 0;
    const frows = [...fm.entries()].sort((a, b) => a[0] - b[0]).map(([x, f]) => { cum += f; return [N(x), f, N(x * f), cum]; });
    let html = h("Frequency Distribution") + tbl(["x", "f", "fx", "&lt;cf"], frows.slice(0, 60), ["Σ", n, N(r.sum), ""]);
    if (frows.length > 60) html += note(`Showing the first 60 of ${frows.length} rows — totals use every value.`);
    html += note("x = value · f = how many times it appears · &lt;cf = cumulative frequency.");
    html += h("Mean") + eq(`x̄ = ${frac("Σfx", "n")} = ${frac(N(r.sum), n)} = ${box(N(r.mean))}`);
    html += h("Median");
    html += n % 2
      ? note(`n = ${n} (odd) → the middle value is the ${(n + 1) / 2}th value of the sorted data.`) + eq(`Md = ${box(N(r.median))}`)
      : note(`n = ${n} (even) → average the ${n / 2}th and ${n / 2 + 1}th values.`) +
        eq(`Md = ${frac(`${N(s[n / 2 - 1])} + ${N(s[n / 2])}`, 2)} = ${box(N(r.median))}`);
    html += h("Mode");
    const modeTxt = r.mode.type === "none" ? "none" : r.mode.modes.map(N).join(", ");
    html += r.mode.type === "none"
      ? note("Every value appears once, so there is no mode.")
      : note(`Highest frequency = ${r.mode.maxFreq}.`) + eq(`Mo = ${box(modeTxt)}`);
    const map = new Map();
    for (const x of values) map.set(x, (map.get(x) || 0) + 1);
    const rows = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([x, f]) => ({ x, f }));
    // raw table columns: x, f, x−x̄, ...  (varianceBlock builds [f, x, ...] so swap for raw)
    const v = varianceBlock(rows.map(o => ({ x: o.x, f: o.f })), r.mean, n, false);
    html += h("Variance & Standard Deviation") + v.html;
    html += h("Final Summary") + summary(summaryRows(n, r.mean, r.median, modeTxt, v));
    return html;
  }

  /* ---------- GROUPED input ---------- */
  const rowsEl = g("groupRows");
  function addRow(lo = "", hi = "", f = "") {
    const d = document.createElement("div");
    d.className = "g-row";
    const inp = (ph, v, l) => `<input inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="${ph}" aria-label="${l}" value="${v}">`;
    d.innerHTML = inp("50", lo, "Lower limit") + inp("54", hi, "Upper limit") + inp("1", f, "Frequency") +
      `<button type="button" class="g-del" aria-label="Remove row">✕</button>`;
    rowsEl.appendChild(d);
    return d;
  }
  function resetRows() { rowsEl.innerHTML = ""; addRow(); addRow(); addRow(); }
  function loadRows(list) { rowsEl.innerHTML = ""; list.forEach(r => addRow(...r)); }

  rowsEl.addEventListener("click", e => {
    const b = e.target.closest(".g-del");
    if (!b) return;
    if (rowsEl.children.length <= 1) b.parentElement.querySelectorAll("input").forEach(i => (i.value = ""));
    else b.parentElement.remove();
  });
  rowsEl.addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const inputs = [...rowsEl.querySelectorAll("input")];
    const i = inputs.indexOf(e.target);
    if (i === inputs.length - 1) addRow().querySelector("input").focus();
    else inputs[i + 1].focus();
  });
  g("addRowBtn").addEventListener("click", () => addRow().querySelector("input").focus());

  const GS = {
    1: [[50, 54, 1], [55, 59, 3], [60, 64, 6], [65, 69, 5], [70, 74, 5], [75, 79, 14], [80, 84, 3], [85, 89, 10], [90, 94, 3]],
    2: [[10, 14, 4], [15, 19, 9], [20, 24, 15], [25, 29, 8], [30, 34, 4]]
  };
  document.querySelectorAll("[data-gsample]").forEach(b =>
    b.addEventListener("click", () => { setMode("grouped"); loadRows(GS[b.dataset.gsample]); window.calculate(); }));

  /* ---------- GROUPED calculation ---------- */
  function readClasses() {
    const raw = [...rowsEl.children].map((el, idx) => {
      const [lo, hi, f] = [...el.querySelectorAll("input")].map(i => i.value.trim());
      return { lo, hi, f, idx: idx + 1 };
    }).filter(r => r.lo || r.hi || r.f);
    if (!raw.length) throw new Error("Enter at least one class with its frequency.");
    const cls = raw.map(r => {
      const lo = Number(r.lo), hi = Number(r.hi), f = Number(r.f);
      if (!r.lo || !r.hi || !r.f && r.f !== "0" || ![lo, hi, f].every(Number.isFinite))
        throw new Error(`Row ${r.idx}: fill in lower limit, upper limit and frequency (numbers only).`);
      if (hi < lo) throw new Error(`Row ${r.idx}: upper limit must be ≥ lower limit.`);
      if (f < 0 || !Number.isInteger(f)) throw new Error(`Row ${r.idx}: frequency must be a whole number (0 or more).`);
      return { lo, hi, f };
    }).sort((a, b) => a.lo - b.lo);
    let gap;
    if (cls.length === 1) gap = Number.isInteger(cls[0].lo) && Number.isInteger(cls[0].hi) ? 1 : 0;
    else {
      gap = clean(cls[1].lo - cls[0].hi);
      for (let i = 1; i < cls.length; i++) {
        const gp = clean(cls[i].lo - cls[i - 1].hi);
        if (gp < 0) throw new Error("Classes overlap — check the class limits.");
        if (Math.abs(gp - gap) > 1e-9) throw new Error("The gap between classes must be the same everywhere (e.g. 50–54, 55–59, 60–64).");
      }
    }
    let cf = 0;
    return cls.map(c => {
      cf += c.f;
      const lb = clean(c.lo - gap / 2), ub = clean(c.hi + gap / 2);
      return { ...c, lb, ub, w: clean(ub - lb), x: (c.lo + c.hi) / 2, cf, label: `${c.lo}–${c.hi}` };
    });
  }

  function calcGrouped() {
    const errorEl = g("inputError"), res = g("results");
    errorEl.hidden = true;
    let C;
    try {
      C = readClasses();
      const tot = C.reduce((a, c) => a + c.f, 0);
      if (tot < Stats.MIN) throw new Error(`Minimum of ${Stats.MIN} values required — your total frequency (Σf) is ${tot}.`);
    } catch (e) {
      errorEl.textContent = "⚠ " + e.message; errorEl.hidden = false; res.hidden = true; resetCards(); return;
    }
    const n = C[C.length - 1].cf;
    const sumFx = C.reduce((a, c) => a + c.f * c.x, 0), mean = sumFx / n;
    // median
    const half = n / 2, mi = C.findIndex(c => c.cf >= half), m = C[mi], cfPrev = mi ? C[mi - 1].cf : 0;
    const med = m.lb + m.w * ((half - cfPrev) / m.f);
    // mode
    const maxF = Math.max(...C.map(c => c.f)), oi = C.findIndex(c => c.f === maxF), o = C[oi];
    const multi = C.filter(c => c.f === maxF).length > 1;
    const fPrev = oi ? C[oi - 1].f : 0, fNext = oi < C.length - 1 ? C[oi + 1].f : 0;
    const d1 = o.f - fPrev, den = 2 * o.f - fPrev - fNext;
    const mo = den > 0 ? o.lb + o.w * (d1 / den) : o.x;

    let html = h("Frequency Distribution") + tbl(
      ["Class", "Boundaries", "f", "x", "fx", "&lt;cf"],
      C.map(c => [c.label, `${N(c.lb)}–${N(c.ub)}`, c.f, N(c.x), N(c.f * c.x), c.cf]),
      ["Σ", "", n, "", N(sumFx), ""]);
    html += note("x = class midpoint · boundaries = limits ∓ half the gap between classes · &lt;cf = cumulative frequency.");

    html += h("Mean") + eq(`x̄ = ${frac("Σfx", "n")} = ${frac(N(sumFx), n)} = ${box(N(mean))}`);

    html += h("Median") + note(`n/2 = ${N(half)} → falls in the <b>${m.label}</b> class (cf goes from ${cfPrev} to ${m.cf}).`) +
      note(`LCB = ${N(m.lb)}, C = ${N(m.w)}, f = ${m.f}, cf before = ${cfPrev}`) +
      eq(`Md = LCB + C${bk("[")}${frac("n/2 − cf", "f")}${bk("]")} = ${N(m.lb)} + ${N(m.w)}${bk("[")}${frac(`${N(half)} − ${cfPrev}`, m.f)}${bk("]")} = ${N(m.lb)} + ${N(m.w)}(${N((half - cfPrev) / m.f)}) = ${box(N(med))}`);

    html += h("Mode") + note(`Highest frequency = ${maxF}, in the <b>${o.label}</b> class (modal class).` +
      (multi ? " Several classes tie — the first one is used." : "")) +
      note(`LCB = ${N(o.lb)}, C = ${N(o.w)}, f = ${o.f}, f before = ${fPrev}, f after = ${fNext}`);
    html += den > 0
      ? eq(`Mo = LCB + C${bk("[")}${frac("f − f₁", "2f − f₁ − f₂")}${bk("]")} = ${N(o.lb)} + ${N(o.w)}${bk("[")}${frac(`${o.f} − ${fPrev}`, `2(${o.f}) − ${fPrev} − ${fNext}`)}${bk("]")} = ${N(o.lb)} + ${N(o.w)}${bk("[")}${frac(d1, den)}${bk("]")} = ${box(N(mo))}`)
      : note("Neighbouring classes tie with the modal class, so the class midpoint is used.") + eq(`Mo = ${box(N(mo))}`);

    const v = varianceBlock(C.map(c => ({ cls: c.label, f: c.f, x: c.x })), mean, n, true);
    html += h("Variance & Standard Deviation") + v.html;
    html += h("Final Summary") + summary(summaryRows(n, mean, med, N(mo), v));

    // fill UI
    showCards();
    g("meanVal").textContent = N(mean);
    g("medianVal").textContent = N(med);
    g("modeVal").textContent = N(mo);
    g("stdMain").textContent = N(v.s === null ? v.p : v.s);
    g("stdSub").textContent = v.s === null ? "sample s: needs n ≥ 2" : `population σ = ${N(v.p)}`;
    g("solutionBody").innerHTML = LEGEND(n) + html;
    g("fullStatsCard").hidden = true;
    g("solDot").textContent = "2"; g("distDot").textContent = "3";
    state.last = { r: {}, values: [], grouped: C, stat: { mean, median: med, modes: [mo] } };
    res.hidden = false;
    renderHistogram(null, null);
    toCards();
  }

  function drawGroupedHist(C) {
    const canvas = g("histogram"), dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth || 600, hgt = 260;
    canvas.width = w * dpr; canvas.height = hgt * dpr;
    canvas.style.width = w + "px"; canvas.style.height = hgt + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    drawBars(ctx, w, hgt, C.map(c => c.f), C.map(c => c.x).concat([""]));
    g("binInfo").textContent = `${C.length} class${C.length > 1 ? "es" : ""} · labels = midpoints`;
  }

  /* ---------- hook the original functions ---------- */
  const origHist = window.renderHistogram;
  window.renderHistogram = function (values, r) {
    if (state.last && state.last.grouped) return drawGroupedHist(state.last.grouped);
    return origHist(values, r);
  };

  const origCalc = window.calculate;
  function failSafe(e) {
    console.error(e);
    const er = g("inputError");
    er.textContent = "⚠ Something went wrong while calculating. Please check your data.";
    er.hidden = false; g("results").hidden = true; state.last = null; resetCards();
  }
  window.calculate = function () {
    try {
      if (mode === "grouped") return calcGrouped();
      origCalc();
      if (g("results").hidden || !state.last) { resetCards(); return; }   // not valid -> nothing is shown
      showCards();
      g("fullStatsCard").hidden = false;
      g("solDot").textContent = "3"; g("distDot").textContent = "4";
      g("solutionBody").innerHTML = LEGEND(state.last.r.n) + rawSolution(state.last.r, state.last.values);
      renderHistogram(state.last.values, state.last.r);       // redraw now that results are visible (correct width)
      toCards();
    } catch (e) { failSafe(e); }
  };

  // editing the data makes old results stale -> hide them until Calculate is pressed again
  const staleHide = () => { if (!g("results").hidden) { g("results").hidden = true; state.last = null; resetCards(); } };
  g("dataInput").addEventListener("input", staleHide);
  rowsEl.addEventListener("input", staleHide);

  // replace Calculate button so it uses the wrapped function
  const oldBtn = g("calcBtn"), newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);
  newBtn.addEventListener("click", () => window.calculate());

  g("clearBtn").addEventListener("click", () => {
    resetCards();
    if (mode === "grouped") { resetRows(); g("inputError").hidden = true; g("results").hidden = true; state.last = null; }
  });

  /* ---------- tabs ---------- */
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mode-tab").forEach(t => t.classList.toggle("active", t.dataset.mode === m));
    const gr = m === "grouped";
    g("rawBlock").hidden = gr; g("groupedBlock").hidden = !gr;
    g("rawSamples").hidden = gr; g("groupSamples").hidden = !gr;
    g("rawHint").hidden = gr; g("groupHint").hidden = !gr;
    g("inputError").hidden = true; g("results").hidden = true; state.last = null; resetCards();
  }
  document.querySelectorAll(".mode-tab").forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));
  resetRows();

  /* ---------- block pinch / double-tap zoom (iOS ignores user-scalable) ---------- */
  ["gesturestart", "gesturechange", "gestureend"].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  document.addEventListener("touchmove", e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
