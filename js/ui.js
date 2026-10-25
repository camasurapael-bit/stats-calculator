/* ===== Calculate stays reachable + gives visible feedback every time it is pressed ===== */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const calc = $("calcBtn");
  if (!calc) return;

  const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const UP = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* floating Calculate button: appears whenever the real one is scrolled out of view */
  const fab = document.createElement("button");
  fab.type = "button"; fab.id = "calcFab"; fab.className = "calc-fab";
  fab.innerHTML = UP + "<span>Enter Data</span>";
  document.body.appendChild(fab);
  /* tapping it takes you back up to the "Enter Your Data" card */
  fab.addEventListener("click", () => {
    const card = document.querySelector(".input-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  let inView = true;
  const sync = () => fab.classList.toggle("show", !inView);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold: 0.5 }).observe(calc);
  }

  /* visible feedback, even when the numbers did not change */
  let t;
  function flash() {
    const err = $("inputError");
    if (err && !err.hidden) return;                       // an error message is already showing
    [calc].forEach(b => {
      b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse");
      b.dataset.label = b.dataset.label || b.innerHTML;
      b.innerHTML = CHECK + "<span>Calculated</span>";
    });
    clearTimeout(t);
    t = setTimeout(() => [calc].forEach(b => { b.innerHTML = b.dataset.label; b.classList.remove("pulse"); }), 1100);
  }
  calc.addEventListener("click", () => setTimeout(flash, 40));

  /* after Calculate (button or floating button) go back to the result boxes (Mean / Median / Mode / Std Dev) */
  function toBoxes() {
    const res = $("results"), grid = $("metricGrid"), err = $("inputError");
    if (!grid || !res || res.hidden || (err && !err.hidden)) return;   // nothing calculated -> stay put
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  calc.addEventListener("click", () => setTimeout(toBoxes, 120));
})();
