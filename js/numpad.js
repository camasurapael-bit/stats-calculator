/* ===== Numbers-only input: custom number pad on phones, letter filter everywhere ===== */
(function () {
  "use strict";
  const ta = document.getElementById("dataInput");
  if (!ta) return;

  /* 1) Only numbers and separators can ever stay in the box (typed, pasted or from any keyboard) */
  ta.addEventListener("input", () => {
    const c = ta.value.replace(/[^0-9.,;\-\s]/g, "");
    if (c !== ta.value) {
      const pos = Math.max(0, (ta.selectionStart || 0) - (ta.value.length - c.length));
      ta.value = c; ta.setSelectionRange(pos, pos);
    }
  });
  document.getElementById("groupRows").addEventListener("input", e => {
    const i = e.target;
    if (i.tagName === "INPUT") { const c = i.value.replace(/[^0-9.\-]/g, ""); if (c !== i.value) i.value = c; }
  });

  /* 2) On touch devices: no system keyboard -> our own pad with only the allowed keys */
  const mq = q => window.matchMedia(q).matches;
  const phone = mq("(pointer: coarse)") || (mq("(any-pointer: coarse)") && window.innerWidth < 900) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  if (!phone) return;
  ta.setAttribute("inputmode", "none");        // no system keyboard
  ta.setAttribute("virtualkeyboardpolicy", "manual");
  try { ta.virtualKeyboardPolicy = "manual"; } catch (e) {}

  const KEYS = [["7", "7"], ["8", "8"], ["9", "9"], ["⌫", "bs"],
                ["4", "4"], ["5", "5"], ["6", "6"], ["↵", "nl"],
                ["1", "1"], ["2", "2"], ["3", "3"], [",", ","],
                ["-", "-"], ["0", "0"], [".", "."], ["␣", "sp"]];
  const LABEL = { bs: "Backspace", nl: "New line", sp: "Space", ",": "Comma", "-": "Minus", ".": "Decimal point" };
  const pad = document.createElement("div");
  pad.id = "numPad"; pad.className = "numpad"; pad.hidden = true;
  pad.innerHTML = `<div class="np-head"><span>Numbers only · <b>,</b> space or ↵ between values</span><button type="button" data-k="done">Done ⌄</button></div>` +
    `<div class="np-grid">${KEYS.map(([t, k]) => `<button type="button" data-k="${k}"${LABEL[k] ? ` aria-label="${LABEL[k]}"` : ""}${["bs", "nl", "sp"].includes(k) ? ' class="np-act"' : ""}>${t}</button>`).join("")}</div>`;
  document.body.appendChild(pad);

  const fire = () => ta.dispatchEvent(new Event("input", { bubbles: true }));
  function put(txt) { ta.setRangeText(txt, ta.selectionStart, ta.selectionEnd, "end"); fire(); }
  function back() {
    let s = ta.selectionStart; const e = ta.selectionEnd;
    if (s === e && s > 0) s--;
    ta.setRangeText("", s, e, "end"); fire();
  }
  function act(k) {
    if (k === "done") return ta.blur();
    if (k === "bs") return back();
    put(k === "nl" ? "\n" : k === "sp" ? " " : k);
  }

  let rep1, rep2;
  const stop = () => { clearTimeout(rep1); clearInterval(rep2); };
  function down(e) {
    e.preventDefault();                       // keep focus + caret in the textarea
    const b = e.target.closest("button");
    if (!b) return;
    act(b.dataset.k);
    if (b.dataset.k === "bs") { stop(); rep1 = setTimeout(() => { rep2 = setInterval(back, 60); }, 420); }
  }
  pad.addEventListener("touchstart", down, { passive: false });
  pad.addEventListener("mousedown", down);
  ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach(ev => pad.addEventListener(ev, stop));

  const show = () => { pad.hidden = false; document.body.classList.add("pad-open"); };
  const hide = () => { stop(); pad.hidden = true; document.body.classList.remove("pad-open"); };
  ta.addEventListener("focus", show);
  ta.addEventListener("blur", hide);
  document.addEventListener("click", e => { if (e.target.closest("#calcBtn, #clearBtn, .mode-tab, #themeToggle")) ta.blur(); });
})();
