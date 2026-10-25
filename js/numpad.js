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
  /* automatic comma on one line:
     Enter / Space / comma after a number  ->  "5, "  (ready for the next number).
     Pasted or imported data is tidied the same way:  1, 2, 3, 4, 5 */
  window.fmtLines = text => {
    const nums = String(text).match(/-?\d*\.?\d+/g);
    return nums ? nums.join(", ") : String(text);
  };
  ta.addEventListener("input", e => {
    const t = e.inputType || "", d = e.data || "";
    if (t === "insertFromPaste" || t === "insertFromDrop") { ta.value = window.fmtLines(ta.value); return; }
    const typedSep = t === "insertLineBreak" || (t === "insertText" && /^[ ,;\n]+$/.test(d));
    if (!typedSep) return;
    const len = t === "insertLineBreak" ? 1 : d.length;
    const end = ta.selectionStart || 0, start = end - len, v = ta.value;
    const prev = v[start - 1], next = v[end];
    const room = next === undefined || /[0-9.\-]/.test(next);
    let ins = "";                                              // otherwise ignore (no double commas / spaces)
    if (room && prev !== undefined) {
      if (/[0-9.]/.test(prev)) ins = ", ";
      else if (prev === ",") ins = " ";                        // e.g. after backspacing the space
    }
    ta.value = v.slice(0, start) + ins + v.slice(end);
    const pos = start + ins.length; ta.setSelectionRange(pos, pos);
  });

  rowsEl.addEventListener("input", e => {
    const i = e.target;
    if (i.tagName === "INPUT") { const c = i.value.replace(/[^0-9.\-]/g, ""); if (c !== i.value) i.value = c; }
  });

  /* the data box grows with the text: when a line fills up and wraps, the box gets taller
     (up to a limit, then it scrolls inside) */
  function grow() {
    ta.style.height = "";
    const extra = ta.offsetHeight - ta.clientHeight;
    if (ta.scrollHeight > ta.clientHeight) ta.style.height = (ta.scrollHeight + extra) + "px";
  }
  const vd = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  Object.defineProperty(ta, "value", { configurable: true, get() { return vd.get.call(this); }, set(v) { vd.set.call(this, v); grow(); } });
  ta.addEventListener("input", grow);
  window.addEventListener("resize", grow);
  document.addEventListener("click", e => { if (e.target.closest("#calcBtn, #clearBtn, .btn-chip, .mode-tab")) setTimeout(grow, 80); });
  grow();

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
