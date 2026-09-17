/* Guided demo: an interactive walkthrough plus hover tooltips (data-tip).
   A step can: spotlight an element, show the real sample files (drag them onto the drop area),
   show the source document with the extracted values highlighted, highlight the matching fields
   in the app, and animate a pointer to what should be clicked. Each app passes its own steps. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = UI.esc;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- tooltips ---------- */
  const tipEl = document.createElement("div"); tipEl.className = "tip-pop"; tipEl.hidden = true; document.body.appendChild(tipEl);
  let tipFor = null;
  document.addEventListener("mouseover", e => {
    const t = e.target.closest("[data-tip]"); if (t === tipFor) return; tipFor = t;
    if (!t || document.body.classList.contains("g-dragging")) { tipEl.hidden = true; return; }
    tipEl.textContent = t.dataset.tip; tipEl.hidden = false;
    const r = t.getBoundingClientRect(), w = Math.min(300, tipEl.offsetWidth);
    let x = r.left + r.width / 2 - w / 2; x = Math.max(8, Math.min(x, innerWidth - w - 8));
    let y = r.top - tipEl.offsetHeight - 8; if (y < 8) y = r.bottom + 8;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
  });
  document.addEventListener("scroll", () => { tipEl.hidden = true; tipFor = null; }, true);
  UI.tip = (label, text) => `<span class="has-tip" data-tip="${esc(text)}">${label}</span>`;
  UI.info = text => `<span class="tip-i" data-tip="${esc(text)}" aria-label="${esc(text)}">?</span>`;

  /* ---------- tour state ---------- */
  let cfg = null, idx = -1, pop = null, ring = null, hand = null, ripple = null, raf = null, handOn = false, marked = [];
  const cleanups = [];
  const key = () => "guide:" + cfg.app;
  const saveIdx = i => { try { sessionStorage.setItem(key(), String(i)); } catch (e) { } };
  const onCleanup = f => cleanups.push(f);
  function cleanupStep() {
    cleanups.splice(0).forEach(f => { try { f(); } catch (e) { } });
    handOn = false; if (hand) { hand.getAnimations().forEach(a => a.cancel()); hand.style.opacity = 0; }
  }

  function ensureDom() {
    if (ring) return;
    ring = document.createElement("div"); ring.className = "g-ring";
    pop = document.createElement("div"); pop.className = "g-pop";
    hand = document.createElement("div"); hand.className = "g-hand";
    hand.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 3.5v18.2l4.6-4.2 3.2 7.4 3.4-1.5-3.2-7.2 6.3-.4z" fill="#fff" stroke="#111827" stroke-width="1.8" stroke-linejoin="round"/></svg><span class="g-hand-file">${UI.icon("file")}</span>`;
    ripple = document.createElement("div"); ripple.className = "g-ripple";
    document.body.append(ring, pop, hand, ripple);
  }
  function teardown() {
    cleanupStep(); cancelAnimationFrame(raf);
    [ring, pop, hand, ripple].forEach(e => e && e.remove()); ring = pop = hand = ripple = null;
    document.body.classList.remove("g-on");
  }

  /* ---------- placement: beside the target without covering it, otherwise docked in a corner ---------- */
  function place(target, s) {
    const r = target.getBoundingClientRect(), pad = 6;
    Object.assign(ring.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
    const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 16, m = 12;
    const fits = (x, y) => x >= m && y >= m && x + pw <= innerWidth - m && y + ph <= innerHeight - m;
    const clampY = y => Math.max(m, Math.min(y, innerHeight - ph - m)), clampX = x => Math.max(m, Math.min(x, innerWidth - pw - m));
    const cand = { right: [r.right + gap, clampY(r.top)], left: [r.left - pw - gap, clampY(r.top)], below: [clampX(r.left), r.bottom + gap], above: [clampX(r.left), r.top - ph - gap] };
    const order = [s.place, "right", "left", "below", "above"].filter((v, k, a) => v && a.indexOf(v) === k);
    let pos = null;
    for (const k of order) { const [x, y] = cand[k]; if (fits(x, y)) { pos = [x, y]; break; } }
    if (!pos) { // dock in the corner that hides the fewest highlighted fields, then the least of the target
      const corners = [[innerWidth - pw - m, innerHeight - ph - m], [m, innerHeight - ph - m], [innerWidth - pw - m, 64], [m, 64]];
      const inter = ([x, y], b) => Math.max(0, Math.min(x + pw, b.right) - Math.max(x, b.left)) * Math.max(0, Math.min(y + ph, b.bottom) - Math.max(y, b.top));
      const boxes = marked.filter(el => el.isConnected).map(el => el.getBoundingClientRect());
      const score = c => boxes.reduce((t, b) => t + inter(c, b), 0) * 10 + inter(c, r);
      pos = corners.reduce((best, c) => (score(c) < score(best) ? c : best), corners[0]);
    }
    pop.style.left = pos[0] + "px"; pop.style.top = pos[1] + "px";
  }
  function follow(target, s) { cancelAnimationFrame(raf); const loop = () => { if (!ring || !document.body.contains(target)) return; place(target, s); raf = requestAnimationFrame(loop); }; loop(); }

  /* ---------- pointer that shows where to click, or carries a file to the drop area ---------- */
  function startHand(getTarget, mode) {
    handOn = true; hand.classList.toggle("drag", mode === "drag");
    const run = () => {
      if (!handOn || !pop) return;
      const t = getTarget(); if (!t) { setTimeout(run, 400); return; }
      const tr = t.getBoundingClientRect();
      const src = (mode === "drag" ? pop.querySelector(".g-file") : pop.querySelector(".g-foot")) || pop;
      const sr = src.getBoundingClientRect();
      const from = [sr.left + Math.min(40, sr.width / 2), sr.top + sr.height / 2];
      const to = [tr.left + tr.width / 2, tr.top + Math.min(tr.height / 2, 60)];
      const T = (x, y, sc = 1) => `translate(${x}px, ${y}px) scale(${sc})`;
      const anim = hand.animate([
        { transform: T(...from), opacity: 0 }, { transform: T(...from), opacity: 1, offset: .12 },
        { transform: T(...to), opacity: 1, offset: .62 }, { transform: T(...to, .82), opacity: 1, offset: .7 },
        { transform: T(...to), opacity: 1, offset: .84 }, { transform: T(...to), opacity: 0 }], { duration: 2400, easing: "cubic-bezier(.45,0,.2,1)" });
      setTimeout(() => {
        if (!handOn || !ripple) return; Object.assign(ripple.style, { left: to[0] + "px", top: to[1] + "px" });
        ripple.animate([{ transform: "translate(-50%,-50%) scale(.2)", opacity: .9 }, { transform: "translate(-50%,-50%) scale(1.6)", opacity: 0 }], { duration: 650, easing: "ease-out" });
      }, 1650);
      anim.onfinish = () => handOn && setTimeout(run, 700);
    };
    setTimeout(run, 650);
  }

  /* ---------- highlight fields in the app, and words inside text ---------- */
  function markElements(selectors) {
    const els = selectors.flatMap(sel => [...document.querySelectorAll(sel)]); marked = els;
    els.forEach(el => el.classList.add("g-mark")); onCleanup(() => { els.forEach(el => el.classList.remove("g-mark")); marked = []; });
  }
  function markText(container, finds) {
    const root = document.querySelector(container); if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    const made = [];
    nodes.forEach(node => {
      let cur = node;
      for (const f of finds) {
        const k = cur.nodeValue.indexOf(f); if (k < 0) continue;
        const hit = cur.splitText(k); const rest = hit.splitText(f.length);
        const m = document.createElement("mark"); m.className = "g-tmark"; hit.replaceWith(m); m.appendChild(hit); made.push(m); cur = rest;
      }
    });
    onCleanup(() => { made.forEach(m => m.parentNode && m.replaceWith(document.createTextNode(m.textContent))); root.normalize(); });
  }

  /* ---------- the source document shown inside the step ---------- */
  async function renderSource(box, src) {
    try {
      let el;
      if (src.type === "pdf") el = await UI.pdfPreview(src.url, { find: src.find || [], page: src.page || 1, width: Math.max(720, Math.round((box.clientWidth - 14) * (src.zoom || 1.55))) });
      else { const text = await (await fetch(src.url, { cache: "no-store" })).text(); el = src.type === "csv" ? UI.csvPreview(text, src.mark) : UI.textPreview(text, src.find || []); }
      if (!box.isConnected) return;
      box.innerHTML = ""; box.appendChild(el);
      const first = box.querySelector(".pv-hl, td.bad, td.fix, td.dup, mark");
      if (first) {
        const row = first.closest("tr");
        box.style.scrollBehavior = "auto";
        box.scrollTop = Math.max(0, (row ? row.offsetTop : first.offsetTop) - 70);
        box.scrollLeft = Math.max(0, first.offsetLeft - (row ? 230 : 50));
        box.style.scrollBehavior = "";
      }
    } catch (e) { if (box.isConnected) box.innerHTML = `<div class="g-src-err">The preview couldn't load, but the file is in the demo's samples folder.</div>`; }
  }

  /* ---------- files you drag onto the drop area ---------- */
  function setupFiles(s, advance) {
    const cards = [...pop.querySelectorAll(".g-file")];
    cards.forEach(async card => {
      const f = s.files[+card.dataset.i]; const th = card.querySelector(".g-thumb");
      if (/\.pdf$/i.test(f.url)) { try { const c = await UI.pdfThumb(f.url, 58); if (th.isConnected) { th.innerHTML = ""; th.classList.add("img"); th.appendChild(c); } } catch (e) { } }
    });
    let dropped = false;
    const drop = async () => {
      const dz = $(s.dropzone); if (!dz || dropped) return; dropped = true;
      handOn = false; hand.style.opacity = 0;
      const dr = dz.getBoundingClientRect();
      await Promise.race([sleep(1100), Promise.all(cards.map((c, k) => {
        const r = c.getBoundingClientRect(); const g = c.cloneNode(true); g.classList.add("g-fly");
        Object.assign(g.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px" }); document.body.appendChild(g);
        const dx = dr.left + dr.width / 2 - r.left - r.width / 2, dy = dr.top + dr.height / 2 - r.top - r.height / 2;
        return g.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.45)`, opacity: .2 }], { duration: 620, delay: k * 90, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }).finished.then(() => g.remove());
      }))]);
      document.querySelectorAll(".g-fly").forEach(g => g.remove());
      dz.classList.add("over"); setTimeout(() => dz.classList.remove("over"), 450);
      const btn = s.dropButton ? $(s.dropButton) : null;
      if (btn) btn.click(); else if (typeof s.onDrop === "function") s.onDrop();
      if (!s.doneWhen) return advance();
      // stay on this step while the files are read, so the reading is visible
      const box = dz.closest(".card") || dz; follow(box, s);
      pop.querySelector(".g-files")?.remove(); pop.querySelector(".g-dropit")?.remove();
      const hint = pop.querySelector(".g-drag-hint"); if (hint) hint.innerHTML = `<span class="g-spin"></span><span>Reading ${s.files.length > 1 ? "each file" : "the file"}. Watch the steps as they finish.</span>`;
      const me = idx, t0 = Date.now();
      while (!$(s.doneWhen) && Date.now() - t0 < 25000) { await sleep(150); if (idx !== me) return; }
      if (hint) hint.innerHTML = `${UI.icon("check")}<span>Done.</span>`;
      await sleep(s.linger || 1200); if (idx === me) advance();
    };
    pop.querySelector(".g-dropit")?.addEventListener("click", drop);
    cards.forEach(card => card.addEventListener("pointerdown", e => {
      e.preventDefault(); const dz = $(s.dropzone);
      const ghost = document.createElement("div"); ghost.className = "g-ghost";
      ghost.innerHTML = `${UI.icon("file")}<span>${s.files.length > 1 ? `${s.files.length} files` : esc(s.files[0].name)}</span>`;
      document.body.appendChild(ghost); document.body.classList.add("g-dragging"); handOn = false; hand.style.opacity = 0;
      const isOver = ev => { ghost.style.display = "none"; const el = document.elementFromPoint(ev.clientX, ev.clientY); ghost.style.display = ""; return !!(dz && el && dz.contains(el)); };
      const move = ev => { ghost.style.left = ev.clientX + 12 + "px"; ghost.style.top = ev.clientY + 8 + "px"; dz && dz.classList.toggle("over", isOver(ev)); };
      const up = ev => {
        removeEventListener("pointermove", move); removeEventListener("pointerup", up);
        const hit = isOver(ev); ghost.remove(); document.body.classList.remove("g-dragging"); dz && dz.classList.remove("over");
        if (hit) drop(); else startHand(() => $(s.dropzone), "drag");
      };
      move(e); addEventListener("pointermove", move); addEventListener("pointerup", up);
      onCleanup(() => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); ghost.remove(); document.body.classList.remove("g-dragging"); });
    }));
  }

  /* ---------- show a step ---------- */
  async function show(i) {
    const steps = cfg.steps; if (i < 0) i = 0;
    if (i >= steps.length) { finish(); return; }
    cleanupStep(); idx = i; saveIdx(i); ensureDom(); document.body.classList.add("g-on");
    const s = steps[i];
    if (s.route && !location.hash.startsWith(s.route)) { document.querySelectorAll(".modal-bg").forEach(m => m.remove()); location.hash = s.route; }
    pop.className = "g-pop"; pop.innerHTML = `<div class="g-step">Step ${i + 1} of ${steps.length} · ${esc(s.chapter || "")}</div><div class="g-title">Loading…</div>`;
    Object.assign(ring.style, { width: "0px", height: "0px" }); place(document.body, {});
    const t0 = Date.now(); let target = null;
    while (Date.now() - t0 < (s.wait || 12000)) {
      target = s.target ? document.querySelector(s.target) : null;
      if (target && target.offsetParent !== null) break;
      await sleep(120); if (idx !== i) return;
    }
    if (s.before) { try { await s.before(); } catch (e) { } await sleep(200); if (idx !== i) return; target = (s.target && document.querySelector(s.target)) || target; }
    if (!target) target = $(".page-head") || $("#view");
    target.scrollIntoView({ block: s.block || "center", behavior: "smooth" });
    await sleep(380); if (idx !== i) return;

    const mode = s.files ? "files" : s.advance === "click" ? "click" : "next";
    const kind = url => /\.pdf$/i.test(url) ? "pdf" : /\.csv$/i.test(url) ? "csv" : "txt";
    pop.className = "g-pop" + (s.files || s.source ? " wide" : "");
    pop.innerHTML = `<div class="g-step">Step ${i + 1} of ${steps.length} · ${esc(s.chapter || "")}</div>
      <button class="g-x" aria-label="End tour">×</button>
      <div class="g-title">${s.title}</div><div class="g-body">${s.body}</div>
      ${s.files ? `<div class="g-files">${s.files.map((f, k) => `<div class="g-file" data-i="${k}" title="Drag onto the drop area"><div class="g-thumb ${kind(f.url)}">${{ pdf: "PDF", csv: "CSV", txt: "EMAIL" }[kind(f.url)]}</div><div class="g-fm"><b>${esc(f.name)}</b><small>${esc(f.note || "")}</small></div></div>`).join("")}</div>
        <div class="g-drag-hint">${UI.icon("upload")}<span>Drag ${s.files.length > 1 ? "any of these files" : "the file"} onto the highlighted drop area</span></div>` : ""}
      ${s.source ? `<div class="g-src"><div class="g-src-h">${UI.icon("file")}<span class="g-src-name">${esc(s.source.caption || "Source document")}</span>${s.source.legend ? `<span class="g-legend">${s.source.legend}</span>` : ""}</div><div class="g-src-b"><div class="g-src-load">Opening the document…</div></div></div>` : ""}
      ${s.why ? `<div class="g-why"><b>Why it matters</b> ${s.why}</div>` : ""}
      <div class="g-foot"><div class="g-dots">${steps.map((_, k) => `<i class="${k < i ? "d" : k === i ? "c" : ""}"></i>`).join("")}</div>
        <span style="flex:1"></span>${i ? `<button class="btn sm ghost g-back">Back</button>` : ""}
        ${mode === "files" ? `<button class="btn sm g-dropit">Drop them for me</button>`
          : mode === "click" ? `<span class="g-hint">${s.hint || "Click the highlighted button"}</span><button class="btn sm ghost g-skip">Skip</button>`
          : `<button class="btn sm primary g-next">${i === steps.length - 1 ? "Finish" : "Next"}</button>`}</div>`;
    pop.querySelector(".g-x").onclick = () => end();
    const next = () => setTimeout(() => idx === i && show(i + 1), s.after || 350);
    pop.querySelector(".g-back")?.addEventListener("click", () => show(i - 1));
    pop.querySelector(".g-next")?.addEventListener("click", () => show(i + 1));
    pop.querySelector(".g-skip")?.addEventListener("click", () => show(i + 1));

    ring.classList.toggle("pulse", mode !== "next");
    follow(target, s);
    if (s.marks) markElements(s.marks);
    if (s.markText) s.markText.forEach(mt => markText(mt.in, mt.find));
    if (s.source) renderSource(pop.querySelector(".g-src-b"), s.source);
    if (mode === "files") { setupFiles(s, next); startHand(() => $(s.dropzone), "drag"); }
    if (mode === "click") {
      const sel = s.clickTarget || s.target;
      const h = e => { if (e.target.closest(sel)) { document.removeEventListener("click", h, true); handOn = false; next(); } };
      document.addEventListener("click", h, true); onCleanup(() => document.removeEventListener("click", h, true));
      startHand(() => $(sel), "click");
    }
    if (s.pointer && mode === "next") startHand(() => $(s.pointer), "click");
    updateLauncher();
  }
  function end() { teardown(); idx = -1; saveIdx(-1); updateLauncher(); }
  function finish() {
    end(); try { sessionStorage.setItem(key() + ":done", "1"); } catch (e) { }
    UI.modal({ title: cfg.doneTitle || "That's the tour", body: cfg.doneBody || "", actions: [{ label: "Explore on my own", primary: true }] });
    updateLauncher();
  }
  document.addEventListener("keydown", e => {
    if (idx < 0 || !pop || /input|textarea/i.test(document.activeElement?.tagName || "")) return;
    const s = cfg.steps[idx];
    if (e.key === "Escape") end();
    if (e.key === "ArrowRight" && !s.files && s.advance !== "click") show(idx + 1);
    if (e.key === "ArrowLeft" && idx > 0) show(idx - 1);
  });

  /* ---------- launcher + chapter panel ---------- */
  let launcher = null;
  function updateLauncher() {
    if (!launcher) return;
    const n = cfg.steps.length, at = idx >= 0 ? idx + 1 : 0;
    launcher.querySelector(".gl-t").textContent = idx >= 0 ? `Guided demo · ${at}/${n}` : "Guided demo";
    launcher.querySelector(".gl-bar i").style.width = (at / n * 100) + "%";
  }
  function panel() {
    const chapters = [];
    cfg.steps.forEach((s, i) => { let c = chapters.find(c => c.name === s.chapter); if (!c) chapters.push(c = { name: s.chapter, first: i, steps: [] }); c.steps.push(i); });
    UI.modal({ title: "Guided demo", body: `<p class="ink2" style="margin-top:0">${cfg.intro}</p>
      <div class="g-chapters">${chapters.map((c, k) => `<button class="g-ch" data-i="${c.first}"><span class="g-num">${k + 1}</span><span style="flex:1;text-align:left"><b>${esc(c.name)}</b><small>${esc(cfg.chapterNotes?.[c.name] || "")}</small></span><span class="muted" style="font-size:12px">${c.steps.length} steps</span></button>`).join("")}</div>`,
      actions: [{ label: "Reset demo data", onClick: () => cfg.reset && cfg.reset() }, { label: idx >= 0 ? "Resume" : "Start from the beginning", primary: true, onClick: () => { setTimeout(() => show(idx >= 0 ? idx : 0), 50); } }],
      onOpen: el => el.querySelectorAll(".g-ch").forEach(b => b.onclick = () => { el.remove(); setTimeout(() => show(+b.dataset.i), 50); }) });
  }

  window.Guide = {
    init(c) {
      cfg = c;
      launcher = document.createElement("button"); launcher.className = "g-launch no-print"; launcher.type = "button";
      launcher.setAttribute("data-tip", "Step-by-step walkthrough. Jump to any chapter, or reset the demo data.");
      launcher.innerHTML = `<span class="gl-ic">${UI.icon("spark")}</span><span><span class="gl-t">Guided demo</span><span class="gl-bar"><i></i></span></span>`;
      launcher.onclick = panel;
      const bar = document.querySelector(".topbar .search");
      bar ? bar.insertAdjacentElement("afterend", launcher) : document.body.appendChild(launcher);
      updateLauncher();
    },
    afterLogin(opts = {}) {
      let resume = -1, done = false;
      try { resume = +(sessionStorage.getItem(key()) ?? -1); done = !!sessionStorage.getItem(key() + ":done"); } catch (e) { }
      if (resume >= 0) { setTimeout(() => show(resume), 400); return; }
      if (opts.restored || done || sessionStorage.getItem(key() + ":welcomed")) return;
      try { sessionStorage.setItem(key() + ":welcomed", "1"); } catch (e) { }
      UI.modal({ title: cfg.welcomeTitle, body: cfg.welcomeBody,
        actions: [{ label: "Explore on my own" }, { label: `Take the guided demo · ${cfg.minutes} min`, primary: true, onClick: () => setTimeout(() => show(0), 100) }] });
    },
    start: i => show(i || 0), end,
  };
})();
