/* ===== Numbers-only input using the phone's own number keyboard ===== */
(function () {
  "use strict";
  const ta = document.getElementById("dataInput");
  const rowsEl = document.getElementById("groupRows");
  if (!ta || !rowsEl) return;

  /* native numeric keypad (1-2-3 / 4-5-6 / 7-8-9, "." "," and a Next key) */
  ta.setAttribute("inputmode", "decimal");
  ta.setAttribute("enterkeyhint", "next");
  ta.setAttribute("autocomplete", "off");

  /* only numbers and separators can ever stay in the fields (typed, pasted or from any keyboard) */
  ta.addEventListener("input", () => {
    const c = ta.value.replace(/[^0-9.,;\-\s]/g, "");
    if (c !== ta.value) {
      const pos = Math.max(0, (ta.selectionStart || 0) - (ta.value.length - c.length));
      ta.value = c; ta.setSelectionRange(pos, pos);
    }
  });
  rowsEl.addEventListener("input", e => {
    const i = e.target;
    if (i.tagName === "INPUT") { const c = i.value.replace(/[^0-9.\-]/g, ""); if (c !== i.value) i.value = c; }
  });

  /* keep the field you are typing in visible above the keyboard */
  document.addEventListener("focusin", e => {
    const el = e.target;
    if (el !== ta && !(el.tagName === "INPUT" && rowsEl.contains(el))) return;
    setTimeout(() => { try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (err) {} }, 320);
  });

  /* tapping Calculate / Clear / tabs closes the keyboard */
  document.addEventListener("click", e => {
    if (e.target.closest("#calcBtn, #clearBtn, .mode-tab, #themeToggle")) {
      const a = document.activeElement; if (a && a.blur && /INPUT|TEXTAREA/.test(a.tagName)) a.blur();
    }
  });
})();
