/* Shared runtime for the client demos: DOM helpers, formatting, router, modal/toast,
   CSV handling and PDF text extraction (pdf.js). No build step, no framework. */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const money = (n, dp = 0) => n == null || isNaN(n) ? "—" :
    (n < 0 ? "−$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const num = (n, dp = 0) => n == null || isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const pct = (n, dp = 1) => n == null || isNaN(n) ? "—" : (n > 0 ? "+" : "") + n.toFixed(dp) + "%";
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fdate = d => { if (!d) return "—"; const x = d instanceof Date ? d : new Date(d + (String(d).length === 10 ? "T12:00:00" : "")); return `${MON[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
  const TODAY = new Date("2026-09-16T12:00:00");
  const daysUntil = d => Math.round((new Date(d + "T12:00:00") - TODAY) / 864e5);
  const initials = n => n.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const parseMoney = s => { if (s == null) return null; const m = String(s).replace(/,/g, "").match(/-?\$?\s*(-?\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; };

  /* ---------- icons (stroke, 24 grid) ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    scale: '<path d="M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>',
    spark: '<path d="M12 3l1.9 5.8L20 10.7l-5 3.8 1.8 6-4.8-3.6-4.8 3.6 1.8-6-5-3.8 6.1-1.9z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    pill: '<path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7zM8.5 8.5l7 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  };
  const icon = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[name] || ""}</svg>`;

  /* ---------- toast / modal ---------- */
  function toast(msg, kind = "") {
    let box = $(".toasts"); if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "toast " + kind; t.innerHTML = `<span class="d"></span><span>${msg}</span>`;
    box.appendChild(t); setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3600);
  }
  function modal({ title, body, actions = [], wide = false, onOpen }) {
    const bg = document.createElement("div"); bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal ${wide ? "wide" : ""}"><div class="modal-h"><h3>${title}</h3><button class="x" aria-label="Close">×</button></div>
      <div class="modal-b">${body}</div>${actions.length ? `<div class="modal-f">${actions.map((a, i) => `<button class="btn ${a.primary ? "primary" : ""}" data-i="${i}">${a.label}</button>`).join("")}</div>` : ""}</div>`;
    const close = () => bg.remove();
    bg.addEventListener("click", e => { if (e.target === bg || e.target.closest(".x")) close(); });
    $$(".modal-f .btn", bg).forEach(b => b.addEventListener("click", () => { const a = actions[+b.dataset.i]; if (!a.onClick || a.onClick(bg) !== false) close(); }));
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    document.body.appendChild(bg); onOpen && onOpen(bg); return { el: bg, close };
  }

  /* ---------- router ---------- */
  const routes = [];
  function route(pattern, fn) { const keys = []; const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "$"); routes.push({ re, keys, fn }); }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  let onNav = null;
  function render() {
    const h = location.hash.replace(/^#/, "") || "/home";
    for (const r of routes) {
      const m = h.match(r.re);
      if (m) { const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); onNav && onNav(h); r.fn(params); window.scrollTo(0, 0); return; }
    }
    location.hash = "#/home";
  }
  window.addEventListener("hashchange", () => document.body.dataset.authed && render());

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ""));
  }
  const toCSV = rows => rows.map(r => r.map(v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
  function download(name, content, type = "text/csv") {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- files ---------- */
  async function fetchSample(url) {
    const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error("Could not load " + url);
    const blob = await r.blob(); return new File([blob], decodeURIComponent(url.split("/").pop()), { type: blob.type });
  }
  const ext = name => (name.split(".").pop() || "").toLowerCase();
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";

  /* ---------- PDF text as lines; table cells joined with " | " ---------- */
  let pdfjsReady = null;
  function loadPdfjs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise((res, rej) => {
      if (window.pdfjsLib) return res(window.pdfjsLib);
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = () => rej(new Error("PDF reader failed to load")); document.head.appendChild(s);
    });
    return pdfjsReady;
  }
  async function pdfLines(file) {
    const lib = await loadPdfjs();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p); const tc = await page.getTextContent();
      const items = tc.items.filter(i => i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = [];
      for (const it of items) {
        const L = lines.find(l => Math.abs(l.y - it.y) < 3);
        L ? L.items.push(it) : lines.push({ y: it.y, items: [it] });
      }
      pages.push(lines.sort((a, b) => b.y - a.y).map(l => {
        l.items.sort((a, b) => a.x - b.x); let out = "", end = null;
        for (const it of l.items) { out += end == null ? it.s : (it.x - end > 10 ? " | " : (it.x - end > 1.5 ? " " : "")) + it.s; end = it.x + it.w; }
        return out.replace(/\s+/g, " ").trim();
      }));
    }
    return { pages, lines: pages.flat(), numPages: pdf.numPages };
  }

  /* ---------- tag comparison tables so the guide can highlight one cell: tr[data-row] td[data-col] ---------- */
  const slug = t => String(t || "").toLowerCase().replace(/×.*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function tagTable(table, colIds, skip = 1) {
    if (!table) return; let section = "";
    [...table.rows].forEach(tr => {
      if (tr.classList.contains("sect")) { section = slug(tr.textContent); return; }
      const label = slug(tr.cells[0]?.textContent); if (tr.parentElement.tagName === "TBODY") tr.dataset.row = label; if (section && tr.parentElement.tagName === "TBODY") tr.dataset.sect = section;
      [...tr.cells].forEach((c, k) => { const id = colIds[k - skip]; if (k >= skip && id != null) c.dataset.col = id; });
    });
  }

  /* ---------- document previews for the guided demo ---------- */
  async function pdfDoc(url) { const lib = await loadPdfjs(); const data = await (await fetch(url, { cache: "no-store" })).arrayBuffer(); return { lib, pdf: await lib.getDocument({ data }).promise }; }
  // Render one page to fit `width`, with a box over every text run containing one of `find`.
  async function pdfPreview(url, { page = 1, find = [], width = 500 } = {}) {
    const { lib, pdf } = await pdfDoc(url);
    let pg = await pdf.getPage(Math.min(page, pdf.numPages));
    if (find.length && page === 1) {                       // jump to the first page that has a match
      for (let n = 1; n <= pdf.numPages; n++) { const cand = await pdf.getPage(n); const tc = await cand.getTextContent(); if (tc.items.some(it => find.some(f => it.str.includes(f)))) { pg = cand; break; } }
    }
    const base = pg.getViewport({ scale: 1 }); const vp = pg.getViewport({ scale: width / base.width });
    const wrap = document.createElement("div"); wrap.className = "pv"; wrap.style.width = vp.width + "px"; wrap.style.height = vp.height + "px";
    const c = document.createElement("canvas"); const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = vp.width * dpr; c.height = vp.height * dpr; c.style.width = vp.width + "px"; c.style.height = vp.height + "px";
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); await pg.render({ canvasContext: ctx, viewport: vp }).promise; wrap.appendChild(c);
    const tc = await pg.getTextContent();
    for (const it of tc.items) {
      if (!it.str.trim() || !find.some(f => it.str.includes(f))) continue;
      const t = lib.Util.transform(vp.transform, it.transform); const h = Math.hypot(t[2], t[3]);
      const box = document.createElement("div"); box.className = "pv-hl";
      Object.assign(box.style, { left: t[4] - 3 + "px", top: t[5] - h - 2 + "px", width: it.width * vp.scale + 6 + "px", height: h + 5 + "px" });
      wrap.appendChild(box);
    }
    return wrap;
  }
  async function pdfThumb(url, width = 92) {
    const { pdf } = await pdfDoc(url); const pg = await pdf.getPage(1);
    const vp = pg.getViewport({ scale: width / pg.getViewport({ scale: 1 }).width });
    const c = document.createElement("canvas"); c.width = vp.width * 2; c.height = vp.height * 2; c.style.width = vp.width + "px"; c.style.height = vp.height + "px";
    const ctx = c.getContext("2d"); ctx.scale(2, 2); await pg.render({ canvasContext: ctx, viewport: vp }).promise; return c;
  }
  // Spreadsheet-style grid; mark(rowIndex, header, value, row) returns a class for cells to highlight.
  function csvPreview(text, mark = () => "") {
    const rows = parseCSV(text); const head = rows[0];
    const t = document.createElement("table"); t.className = "cv";
    t.innerHTML = `<thead><tr><th></th>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((r, i) => {
      const cells = head.map((h, k) => { const cls = mark(i, h, r[k] || "", r) || ""; return `<td class="${cls}">${esc(r[k] || "")}${cls && !r[k] ? "&nbsp;blank&nbsp;" : ""}</td>`; });
      return `<tr class="${cells.some(x => /class="(?!")/.test(x)) ? "has" : ""}"><td class="rn">${i + 2}</td>${cells.join("")}</tr>`; }).join("")}</tbody>`;
    return t;
  }
  function textPreview(text, find = []) {
    const d = document.createElement("div"); d.className = "tv"; let h = esc(text);
    find.forEach(f => { const e = esc(f); h = h.split(e).join(`<mark>${e}</mark>`); });
    d.innerHTML = h; return d;
  }

  /* ---------- animated work steps: each step is [label, async fn -> optional detail] ---------- */
  async function runSteps(el, steps, pace = 380) {
    el.innerHTML = `<div class="steps">${steps.map(s => `<div class="step"><span class="s-ic"></span><span>${s[0]}</span><small></small></div>`).join("")}</div>`;
    const rows = $$(".step", el); const out = [];
    for (let i = 0; i < steps.length; i++) {
      rows[i].className = "step run"; const t0 = performance.now();
      const r = await steps[i][1](); out.push(r);
      const dt = performance.now() - t0; if (dt < pace) await sleep(pace - dt);
      rows[i].className = "step done"; if (r && r.detail) $("small", rows[i]).textContent = r.detail;
    }
    return out;
  }

  function dropzone(el, onFiles, { accept = "", multiple = true } = {}) {
    const input = document.createElement("input"); input.type = "file"; input.multiple = multiple; if (accept) input.accept = accept; input.hidden = true;
    el.appendChild(input);
    el.addEventListener("click", e => { if (!e.target.closest("button,a")) input.click(); });
    input.addEventListener("change", () => { if (input.files.length) onFiles([...input.files]); input.value = ""; });
    ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
    el.addEventListener("drop", e => { if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
  }

  /* ---------- backend (server.py); every call degrades to null when the server isn't there ---------- */
  async function api(method, path, body) {
    try {
      const r = await fetch(path, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
      if (!r.ok) return null; return await r.json();
    } catch (e) { return null; }
  }
  function setBackend(ok) {
    const ws = $(".ws"); if (!ws) return;
    ws.dataset.tip = ok ? "Connected to the demo server. Progress is saved there, so a refresh or a closed tab picks up where you left off." : "Running without the demo server. Progress is kept in this browser tab.";
    const dot = $(".ws .dot"); if (dot) dot.style.background = ok ? "#34d399" : "#fbbf24";
  }

  /* ---------- print only one element (a proposal, a form) ---------- */
  function printOnly(el) {
    if (!el) return window.print();
    el.classList.add("print-target"); document.body.classList.add("printing");
    const done = () => { el.classList.remove("print-target"); document.body.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done); window.print(); setTimeout(done, 1500);
  }

  /* ---------- command palette: ⌘K / Ctrl+K / "/" or click the search box ---------- */
  let paletteItems = () => [];
  function openPalette() {
    if ($(".pal-bg")) return;
    const bg = document.createElement("div"); bg.className = "pal-bg";
    bg.innerHTML = `<div class="pal" role="dialog" aria-label="Search"><div class="pal-in">${icon("search")}<input placeholder="Search groups, accounts, people and pages" aria-label="Search"><kbd>esc</kbd></div><div class="pal-list" role="listbox"></div></div>`;
    document.body.appendChild(bg);
    const input = $("input", bg), list = $(".pal-list", bg); let sel = 0, shown = [];
    const close = () => bg.remove();
    const draw = () => {
      const q = input.value.trim().toLowerCase(); const all = paletteItems();
      shown = (q ? all.filter(it => (it.label + " " + (it.sub || "") + " " + (it.kind || "")).toLowerCase().includes(q)) : all.filter(it => it.top)).slice(0, 9);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length ? shown.map((it, i) => `<a class="pal-it ${i === sel ? "on" : ""}" href="${it.href}" data-i="${i}" role="option"><span class="pal-ic">${icon(it.icon || "arrow")}</span><span class="pal-t"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span><span class="pal-k">${esc(it.kind || "")}</span></a>`).join("")
        : `<div class="pal-empty">Nothing matches "${esc(input.value)}". Try a company name, a person or a page like "renewals".</div>`;
      $$(".pal-it", list).forEach(a => a.onclick = close);
    };
    input.oninput = () => { sel = 0; draw(); };
    input.onkeydown = e => {
      if (e.key === "ArrowDown") { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); }
      if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
      if (e.key === "Enter" && shown[sel]) { location.hash = shown[sel].href.replace(/^#/, ""); close(); }
      if (e.key === "Escape") close();
    };
    bg.addEventListener("mousedown", e => { if (e.target === bg) close(); });
    draw(); input.focus();
  }
  document.addEventListener("keydown", e => {
    if (!document.body.dataset.authed) return;
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || "");
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openPalette(); }
  });
  document.addEventListener("click", e => { if (e.target.closest(".topbar .search")) openPalette(); });

  window.UI = { $, $$, esc, sleep, money, num, pct, fdate, TODAY, daysUntil, initials, parseMoney, icon, toast, modal,
    route, go, render, setOnNav: f => (onNav = f), api, setBackend, printOnly, setPalette: f => (paletteItems = f), openPalette, pdfPreview, pdfThumb, csvPreview, textPreview, tagTable, slug, parseCSV, toCSV, download, fetchSample, ext, kb, pdfLines, runSteps, dropzone };
})();
