/* ===== Animated math background: floating symbols + moving bell curves ===== */
(function () {
  "use strict";
  const cv = document.getElementById("mathBg");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SYM = ["Σ", "π", "x̄", "σ", "√", "∫", "±", "μ", "%", "n", "Δ", "∞", "÷", "×", "s²", "f(x)", "z", "N", "Σfx", "68%", "95%", "x²", "Md", "Mo"];
  const DARK = [[140, 185, 255], [167, 139, 250], [34, 211, 238], [251, 146, 60]];
  const LIGHT = [[37, 99, 235], [124, 58, 237], [8, 145, 178], [249, 115, 22]];
  let W = 0, H = 0, t = 0, items = [];
  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

  function make(init) {
    return {
      s: SYM[(Math.random() * SYM.length) | 0], c: Math.random() < 0.4 ? 0 : (Math.random() * 4) | 0,
      x: Math.random() * W, y: init ? Math.random() * H : H + 60,
      size: 16 + Math.random() * 30, vy: 0.12 + Math.random() * 0.3,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.006,
      a: 0.08 + Math.random() * 0.14, ph: Math.random() * 6.28
    };
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(40, Math.max(16, (W * H) / 38000)));
    while (items.length < n) items.push(make(true));
    items.length = n;
    if (reduce) draw();
  }
  function bell(mu, sigma, amp, rgb, alpha) {
    const base = H - 6;
    ctx.beginPath();
    for (let x = 0; x <= W + 6; x += 6) {
      const z = (x - mu) / sigma, y = base - amp * Math.exp(-z * z / 2);
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${rgb},${alpha})`; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineTo(W + 6, base); ctx.lineTo(0, base); ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, base);
    g.addColorStop(0, `rgba(${rgb},${alpha * 0.35})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const pal = isLight() ? LIGHT : DARK, k = isLight() ? 0.8 : 1;
    bell(W * (0.5 + 0.2 * Math.sin(t * 0.0004)), W * 0.15, H * 0.17, pal[0].join(","), 0.30 * k);
    bell(W * (0.5 + 0.28 * Math.cos(t * 0.0003 + 1)), W * 0.09, H * 0.11, pal[2].join(","), 0.22 * k);
    for (const it of items) {
      const fade = Math.min(1, Math.max(0, it.y / 90));
      ctx.save();
      ctx.translate(it.x + Math.sin(t * 0.0006 + it.ph) * 14, it.y);
      ctx.rotate(it.rot);
      ctx.font = `${it.size}px "Cambria Math", Cambria, "Times New Roman", serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${pal[it.c].join(",")},${it.a * fade * k})`;
      ctx.fillText(it.s, 0, 0);
      ctx.restore();
    }
  }
  function tick() {
    t += 16;
    for (const it of items) {
      it.y -= it.vy; it.rot += it.vr;
      if (it.y < -60) Object.assign(it, make(false), { x: Math.random() * W });
    }
    draw();
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", resize);
  const tg = document.getElementById("themeToggle");
  if (tg) tg.addEventListener("click", () => setTimeout(draw, 30));
  resize();
  reduce ? draw() : requestAnimationFrame(tick);
})();
