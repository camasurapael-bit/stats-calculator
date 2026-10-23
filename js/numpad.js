/* ===== Numbers-only input: custom number pad on phones (raw box + grouped cells), letter filter everywhere ===== */
(function () {
  "use strict";
  const ta = document.getElementById("dataInput");
  const rowsEl = document.getElementById("groupRows");
  if (!ta || !rowsEl) return;

  /* 1) Only numbers and separators can ever stay in the fields (typed, pasted or from any keyboard) */
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

  /* 2) Touch devices: no system keyboard -> our own pad with only the allowed keys */
  const mq = q => window.matchMedia(q).matches;
  const phone = mq("(pointer: coarse)") || (mq("(any-pointer: coarse)") && window.innerWidth < 900) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  if (!phone) return;

  const noSys = el => { el.setAttribute("inputmode", "none"); el.setAttribute("virtualkeyboardpolicy", "manual"); try { el.virtualKeyboardPolicy = "manual"; } catch (e) {} };
  noSys(ta);
  rowsEl.querySelectorAll("input").forEach(noSys);
  new MutationObserver(() => rowsEl.querySelectorAll("input:not([inputmode='none'])").forEach(noSys)).observe(rowsEl, { childList: true, subtree: true });

  /* two layouts: raw data (separators) and grouped cells (navigation) */
  const LAYOUT = {
    raw: [["7", "7"], ["8", "8"], ["9", "9"], ["⌫", "bs"],
          ["4", "4"], ["5", "5"], ["6", "6"], ["↵", "nl"],
          ["1", "1"], ["2", "2"], ["3", "3"], [",", ","],
          ["-", "-"], ["0", "0"], [".", "."], ["␣", "sp"]],
    grouped: [["7", "7"], ["8", "8"], ["9", "9"], ["⌫", "bs"],
              ["4", "4"], ["5", "5"], ["6", "6"], ["Next ›", "next"],
              ["1", "1"], ["2", "2"], ["3", "3"], ["‹ Prev", "prev"],
              ["-", "-"], ["0", "0"], [".", "."], ["+ Row", "row"]]
  };
  const LABEL = { bs: "Backspace", nl: "New line", sp: "Space", ",": "Comma", "-": "Minus", ".": "Decimal point", next: "Next cell", prev: "Previous cell", row: "Add class row" };
  const HINT = {
    raw: `Numbers only · <b>,</b> space or ↵ between values`,
    grouped: `Numbers only · <b>Next ›</b> moves to the next cell`
  };
  const ACT = ["bs", "nl", "sp", "next", "prev", "row"];

  const pad = document.createElement("div");
  pad.id = "numPad"; pad.className = "numpad"; pad.hidden = true;
  pad.innerHTML = `<div class="np-head"><span class="np-hint"></span><button type="button" data-k="done">Done ⌄</button></div><div class="np-grid"></div>`;
  document.body.appendChild(pad);
  const hintEl = pad.querySelector(".np-hint"), gridEl = pad.querySelector(".np-grid");

  let layout = "";
  function setLayout(name) {
    if (layout === name) return;
    layout = name;
    hintEl.innerHTML = HINT[name];
    gridEl.innerHTML = LAYOUT[name].map(([t, k]) =>
      `<button type="button" data-k="${k}"${LABEL[k] ? ` aria-label="${LABEL[k]}"` : ""}${ACT.includes(k) ? ' class="np-act"' : ""}>${t}</button>`).join("");
  }

  let cur = null;                                   // field that currently owns the pad
  const isField = el => el && (el === ta || (el.tagName === "INPUT" && rowsEl.contains(el)));
  const fire = () => cur && cur.dispatchEvent(new Event("input", { bubbles: true }));
  function put(txt) { if (!cur) return; cur.setRangeText(txt, cur.selectionStart, cur.selectionEnd, "end"); fire(); }
  function back() {
    if (!cur) return;
    let s = cur.selectionStart; const e = cur.selectionEnd;
    if (s === e && s > 0) s--;
    cur.setRangeText("", s, e, "end"); fire();
  }
  const cells = () => [...rowsEl.querySelectorAll("input")];
  function go(step) {
    const list = cells(), i = list.indexOf(cur), n = i + step;
    if (n >= 0 && n < list.length) list[n].focus();
    else if (n >= list.length) document.getElementById("addRowBtn").click();   // adds a class + focuses its first cell
  }
  function act(k) {
    if (k === "done") return cur && cur.blur();
    if (k === "bs") return back();
    if (k === "next") return go(1);
    if (k === "prev") return go(-1);
    if (k === "row") return document.getElementById("addRowBtn").click();
    put(k === "nl" ? "\n" : k === "sp" ? " " : k);
  }

  let rep1, rep2;
  const stop = () => { clearTimeout(rep1); clearInterval(rep2); };
  function down(e) {
    e.preventDefault();                       // keep focus + caret in the field
    const b = e.target.closest("button");
    if (!b) return;
    act(b.dataset.k);
    if (b.dataset.k === "bs") { stop(); rep1 = setTimeout(() => { rep2 = setInterval(back, 60); }, 420); }
  }
  pad.addEventListener("touchstart", down, { passive: false });
  pad.addEventListener("mousedown", down);
  ["touchend", "touchcancel", "mouseup", "mouseleave"].forEach(ev => pad.addEventListener(ev, stop));

  /* reserve exactly the pad's height so nothing (Calculate, samples, rows) hides behind it */
  const syncH = () => document.documentElement.style.setProperty("--pad-h", pad.offsetHeight + "px");
  function reveal() {
    if (!cur) return;
    requestAnimationFrame(() => { syncH(); try { cur.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {} });
  }

  let hideT;
  function show(el) {
    clearTimeout(hideT);
    cur = el;
    setLayout(el === ta ? "raw" : "grouped");
    const wasHidden = pad.hidden;
    pad.hidden = false;
    document.body.classList.add("pad-open");
    if (!wasHidden) pad.style.animation = "none";
    syncH(); reveal(); setTimeout(reveal, 260);
  }
  function hide() {
    stop();
    hideT = setTimeout(() => {                 // small delay: moving between cells must not flash the pad
      pad.hidden = true; pad.style.animation = ""; cur = null;
      document.body.classList.remove("pad-open");
      document.documentElement.style.removeProperty("--pad-h");
    }, 90);
  }
  document.addEventListener("focusin", e => { if (isField(e.target)) show(e.target); });
  document.addEventListener("focusout", e => { if (isField(e.target)) hide(); });
  window.addEventListener("resize", () => { if (!pad.hidden) { syncH(); reveal(); } });

  /* tapping controls outside the pad closes it */
  document.addEventListener("click", e => {
    if (e.target.closest("#calcBtn, #clearBtn, .mode-tab, #themeToggle, [data-sample], [data-gsample]")) {
      const a = document.activeElement; if (isField(a)) a.blur();
    }
  });
})();
