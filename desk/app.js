/* Submission Desk: screens. Depends on shared/core.js (UI), data.js (DATA) and parsers.js (Parsers). */
(() => {
  const { $, $$, esc, money, num, pct, fdate, daysUntil, icon, toast, modal, route, go, render } = UI;
  const S = { docs: [], dec: null, loss: null, chg: null, quotes: [], sent: new Set(), recommend: null, done: new Set(), formTab: "125", x: {} };
  const credit = (...a) => window.SD?.credit?.(...a);
  const A = id => DATA.accounts.find(a => a.id === id);
  const view = () => $("#view");
  const daysChip = d => { const n = daysUntil(d); return `<span class="chip ${n <= 30 ? "crit" : n <= 60 ? "warn" : ""} plain">${n} days</span>`; };
  function setPage(crumbs, html) {
    $("#crumbs").innerHTML = crumbs.map((c, i) => i === crumbs.length - 1 ? `<b>${esc(c[0])}</b>` : `<a href="${c[1]}">${esc(c[0])}</a><span>/</span>`).join(" ");
    view().innerHTML = html;
  }
  const head = (title, sub, actions = "") => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div><div class="actions">${actions}</div></div>`;
  const card = (title, body, { sub = "", actions = "", tight = false, foot = "", guide = "" } = {}) =>
    `<div class="card" ${guide ? `data-guide="${guide}"` : ""}><div class="card-h"><h3>${title}</h3>${sub ? `<span class="sub">${sub}</span>` : ""}<div class="actions">${actions}</div></div><div class="card-b ${tight ? "tight" : ""}">${body}</div>${foot ? `<div class="card-f">${foot}</div>` : ""}</div>`;

  const next = (step, text, btn = "", done = false) => `<div class="next ${done ? "done" : ""}"><span class="n-step">${step}</span><span class="n-text">${text}</span>${btn}</div>`;
  const T = UI.tip, I = UI.info;
  const TYPE_TIP = { "E&S": "Excess and surplus lines: a non-admitted market for hard-to-place risks. Not backed by the state guaranty fund.", Admitted: "Licensed in the state, files its rates, backed by the state guaranty fund.", Program: "A specialty program for one class of business, usually through a managing general agent." };
  const STATUS_TIP = { "In appetite": "Every driver, unit, radius, commodity and loss is inside this market's written guidelines.", Conditional: "Will quote, but with a condition such as excluding a driver.", Declines: "Fails at least one of this market's guidelines, so it isn't sent." };

  const NAV = [
    ["Workspace", [["#/home", "home", "Home"], ["#/inbox", "inbox", "Inbox", () => S.x.inbox ? 0 : 7, true], ["#/accounts", "building", "Accounts"], ["#/requests", "mail", "Client requests", () => DATA.requests.filter(r => !S.done.has("req" + r.id)).length]]],
    ["Placement", [["#/renewals", "calendar", "Renewals"], ["#/accounts/brazos-valley", "layers", "Brazos Valley renewal"], ["#/submissions", "send", "Submissions"]]],
    ["Service", [["#/certificates", "shield", "Certificates", () => DATA.certificates.filter(c => !S.done.has("coi" + c.id)).length, true], ["#/claims", "alert", "Claims", () => S.x.claim?.sent ? 0 : 1], ["#/missing", "clock", "Missing info"]]],
    ["Insights", [["#/ask", "search", "Ask the file"], ["#/savings", "chart", "Time & cost saved"]]],
  ];
  UI.setOnNav(h => {
    $("#nav").innerHTML = NAV.map(([sec, items]) => `<div class="nav-h">${sec}</div>` + items.map(([href, ic, label, cnt, hot]) => {
      const c = cnt ? cnt() : 0; const on = href === "#/accounts" ? h === "/accounts" : h.startsWith(href.slice(1));
      return `<a href="${href}" class="${on ? "on" : ""}">${icon(ic)}<span>${label}</span>${c ? `<span class="cnt ${hot ? "hot" : ""}">${c}</span>` : ""}</a>`;
    }).join("")).join("");
  });

  /* ---------- merged account (expiring policy + client's changes) ---------- */
  function merged() {
    if (!S.dec) return null;
    const rm = new Set((S.chg?.removeUnits || []).map(r => r.unit));
    const vehicles = S.dec.vehicles.filter(v => !rm.has(v.unit)).map(v => ({ ...v, src: "Dec page" }));
    (S.chg?.addVehicles || []).forEach((v, i) => vehicles.push({ ...v, unit: S.dec.vehicles.length + 1 + i, src: "Client email", isNew: true }));
    const drivers = S.dec.drivers.map(d => ({ ...d, src: "Dec page" })).concat((S.chg?.addDrivers || []).map(d => ({ ...d, src: "Client email", isNew: true })));
    drivers.forEach(d => { d.flags = []; if (d.exp < 2) d.flags.push(["crit", "Under 2 yrs experience"]); if (d.age < 25) d.flags.push(["warn", `Age ${d.age}`]); if (/class c/i.test(d.cls)) d.flags.push(["info", "Non-CDL (hot shot)"]); });
    vehicles.forEach(v => { v.age = 2027 - v.year; v.flags = v.age > 15 ? [["warn", `${v.age} yrs old`]] : []; });
    const states = ["TX", ...(S.chg?.states || []).map(s => ({ Oklahoma: "OK", "New Mexico": "NM" }[s] || s))];
    return { ...S.dec, vehicles, drivers, states, statesPct: S.chg?.statesPct, radiusMiles: 500, stated: vehicles.reduce((s, v) => s + v.value, 0) };
  }
  function marketCheck(m, acct) {
    const out = { fails: [], conditions: [] };
    const young = acct.drivers.filter(d => d.age < m.minAge), green = acct.drivers.filter(d => d.exp < m.minExp);
    young.forEach(d => out.fails.push(`${d.name} is ${d.age}; minimum driver age ${m.minAge}`));
    green.forEach(d => (m.conditional ? out.conditions : out.fails).push(m.conditional ? `Will exclude ${d.name} (${d.exp} yr experience)` : `${d.name} has ${d.exp} yr experience; minimum ${m.minExp}`));
    if (acct.radiusMiles > m.radius) out.fails.push(`Radius ${acct.radiusMiles} mi is over the ${m.radius} mi limit`);
    const old = acct.vehicles.filter(v => v.age > m.maxVehAge); old.forEach(v => out.fails.push(`${v.year} ${v.make} is over ${m.maxVehAge} years old`));
    acct.commodities.filter(c => m.excludes.includes(c.name)).forEach(c => out.fails.push(`${c.name} (${c.pct}% of loads) not accepted`));
    const open = S.loss ? S.loss.open.reduce((s, c) => s + c.incurred, 0) : 0;
    if (open > m.openLimit) out.fails.push(`Open claims ${money(open)} over the ${money(m.openLimit)} limit`);
    out.status = out.fails.length ? "Declines" : out.conditions.length ? "Conditional" : "In appetite";
    return out;
  }

  /* ================= home ================= */
  route("/home", () => {
    const soon = DATA.accounts.filter(a => daysUntil(a.xdate) <= 90);
    setPage([["Home"]], `${head("Good morning, Dana", "Wednesday, September 16 · what the desk handled overnight and what needs you.",
      `<a class="btn" href="#/certificates">${icon("shield")}Certificates</a><a class="btn primary" href="#/accounts/brazos-valley">${icon("layers")}Open Brazos Valley renewal</a>`)}
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><div class="l">${icon("calendar")} Renewals in 90 days</div><div class="v">${soon.length}</div><div class="d">${money(soon.reduce((s, a) => s + a.premium, 0))} premium</div></div>
        <div class="card kpi"><div class="l">${icon("send")} Submissions out</div><div class="v">11</div><div class="d">across 3 accounts · 9 quotes back</div></div>
        <div class="card kpi"><div class="l">${icon("shield")} Certificates this week</div><div class="v">41</div><div class="d">median 4 min from request to sent</div></div>
        <div class="card kpi"><div class="l">${icon("clock")} Re-keying handled · Sep ${I("Estimated from how long the work takes by hand: about 2 hours per trucking application set, 15 minutes per certificate.")}</div><div class="v">62 hrs</div><div class="d"><span class="up">+19 hrs</span> vs August</div></div>
      </div>
      <div class="grid g-main-l" style="margin-bottom:16px">
        ${card("Handled automatically", DATA.activity.map(a => `<a class="list-item" href="${a.link}" style="text-decoration:none;color:inherit"><div class="li-ic ${a.kind}">${icon(a.icon)}</div><div class="li-b"><b>${a.title}</b><p>${a.body}</p></div><div class="li-t">${a.t}</div></a>`).join(""), { tight: true, sub: "since 6:00 PM yesterday", guide: "activity" })}
        ${card("Needs a decision", [
          ["Review Brazos Valley submission before it goes to markets", "1 driver under 2 years CDL, open AL claim", "2026-09-18", "#/accounts/brazos-valley"],
          ["BlueLine Logistics wants $250K reefer cargo", "Gulf Coast Reefer carries $100K", "2026-09-17", "#/certificates"],
          ["Coastal Aggregates requires $2M liability", "Inland Empire has $1M, no umbrella", "2026-09-19", "#/certificates"],
          ["Midnight Tow wrecker hit a car this morning", "The truck bought yesterday isn't on the policy yet", "2026-09-16", "#/claims"],
          ["Bind Inland Empire Dump & Haul", "Expiring Oct 15 · best quote 6.2% under", "2026-09-30", "#/accounts"],
        ].map(([t, w, d, l]) => `<a class="list-item" href="${l}" style="text-decoration:none;color:inherit"><div class="li-b"><b>${t}</b><p>${w}</p></div>${daysChip(d)}</a>`).join(""), { tight: true, guide: "tasks" })}
      </div>
      ${card("Renewal pipeline", accountsTable(DATA.accounts), { tight: true, actions: `<a class="btn sm ghost" href="#/renewals">Renewal calendar</a>` })}`);
  });
  const accountsTable = rows => `<div class="tbl-wrap"><table class="t"><thead><tr><th>Account</th><th>Class</th><th class="num">Units</th><th>Carrier</th><th class="num">Premium</th><th>${T("X-date", "Expiration date of the current policy")}</th><th>Stage</th></tr></thead><tbody>
    ${[...rows].sort((a, b) => a.xdate.localeCompare(b.xdate)).map(a => `<tr class="click" onclick="location.hash='#/accounts/${a.id}'"><td><div class="cell-2"><b>${esc(a.name)}</b><small>${a.city} · ${a.ae}</small></div></td>
      <td>${a.cls}</td><td class="num">${a.units || "—"}</td><td>${a.carrier}</td><td class="num">${money(a.premium)}</td><td class="nowrap">${fdate(a.xdate)} ${daysChip(a.xdate)}</td><td><span class="chip ${a.kind}">${a.stage}</span></td></tr>`).join("")}</tbody></table></div>`;

  route("/accounts", () => setPage([["Accounts"]], `${head("Accounts", `${DATA.accounts.length} accounts · trucking, tow, dump, reefer, bars, cannabis and dealerships`)}${card("All accounts", accountsTable(DATA.accounts), { tight: true })}`));

  /* ================= account workspace ================= */
  route("/accounts/:id", ({ id }) => id === "brazos-valley" ? acct("docs") : other(id));
  route("/accounts/brazos-valley/:tab", ({ tab }) => acct(tab));
  function other(id) {
    const a = A(id); if (!a) return go("#/accounts");
    setPage([["Accounts", "#/accounts"], [a.name]], `${head(esc(a.name), `${a.cls} · ${a.city}`)}
      <div class="grid g4" style="margin-bottom:16px"><div class="card kpi"><div class="l">Expiring premium</div><div class="v">${money(a.premium)}</div></div><div class="card kpi"><div class="l">X-date</div><div class="v" style="font-size:20px">${fdate(a.xdate)}</div></div><div class="card kpi"><div class="l">Current carrier</div><div class="v" style="font-size:18px">${a.carrier}</div></div><div class="card kpi"><div class="l">Stage</div><div class="v" style="font-size:18px">${a.stage}</div></div></div>
      <div class="card"><div class="empty">${icon("layers")}<p>The full renewal workflow is set up on <b>Brazos Valley Hot Shot & Flatbed</b> for this walkthrough.</p><a class="btn primary" href="#/accounts/brazos-valley">Open Brazos Valley</a></div></div>`);
  }
  function acct(tab) {
    const a = A("brazos-valley"); const has = !!S.dec;
    const tabs = [["docs", "Documents"], ["data", "Account data"], ["risk", "Risk review"], ["forms", "Applications"], ["supp", "Supplementals"], ["markets", "Markets"], ["quotes", "Quotes"], ["proposal", "Proposal"], ["bind", "Bind & filings"]];
    setPage([["Accounts", "#/accounts"], [a.name]], `${head(esc(a.name), `Hot shot & flatbed · Waco, TX · USDOT 3190552 · renews ${fdate(a.xdate)} with Redline Transport`,
      `${daysChip(a.xdate)}<span class="chip">Expiring ${money(a.premium)}</span>`)}
      <div class="tabs">${tabs.map(([k, l]) => `<a href="#/accounts/brazos-valley/${k}" class="${tab === k ? "on" : ""}">${l}${k === "docs" && S.docs.length ? `<span class="cnt">${S.docs.length}</span>` : ""}${k === "quotes" && S.quotes.length ? `<span class="cnt">${S.quotes.length}</span>` : ""}</a>`).join("")}</div>
      ${!has ? next("Start", "<b>Load the renewal packet.</b> The expiring dec page, the loss run and the client's email about what changed.") : ({
        docs: next("Step 1 of 9", "<b>Packet read.</b> Check the schedules and the underwriting flags before anything goes out.", `<a class="btn sm primary" href="#/accounts/brazos-valley/data">${icon("arrow")}Account data</a>`),
        data: next("Step 2 of 9", "<b>Schedules rebuilt with the client's changes.</b> Next, the FMCSA record, the drivers and the losses.", `<a class="btn sm primary" href="#/accounts/brazos-valley/risk">${icon("eye")}Risk review</a>`),
        risk: next("Step 3 of 9", "<b>Checked the way an underwriter will.</b> Fix or explain the flags, then fill the applications.", `<a class="btn sm primary" href="#/accounts/brazos-valley/forms">${icon("file")}Applications</a>`),
        forms: next("Step 4 of 9", "<b>Applications filled.</b> Switch between the forms; yellow means no document had that field.", `<a class="btn sm primary" href="#/accounts/brazos-valley/supp">${icon("table")}Supplementals</a>`),
        supp: next("Step 5 of 9", "<b>One set of answers for every market's supplemental.</b> What only the client knows goes to missing info.", `<a class="btn sm primary" href="#/accounts/brazos-valley/markets">${icon("send")}Choose markets</a>`),
        markets: next("Step 6 of 9", "<b>Send to the markets that fit.</b> When quotes come back, compare them.", `<a class="btn sm primary" href="#/accounts/brazos-valley/quotes">${icon("columns")}Quotes</a>`),
        quotes: S.quotes.length ? next("Step 7 of 9", "<b>Pick a recommendation.</b> The client proposal is built from it.", `<a class="btn sm primary" href="#/accounts/brazos-valley/proposal">${icon("file")}Proposal</a>`) : next("Step 7 of 9", "<b>Load the quotes the markets sent back.</b>"),
        proposal: next("Step 8 of 9", "<b>Proposal ready.</b> Download it or send it. Once the client signs, bind it.", `<a class="btn sm primary" href="#/accounts/brazos-valley/bind">${icon("check")}Bind & filings</a>`),
        bind: next("Step 9 of 9", "<b>Bind, file, and check the issued policy against the quote.</b>", "", !!S.x.bindFixed) }[tab] || "")}
      <div id="aBody"></div>`);
    if (tab !== "docs" && !has) { $("#aBody").innerHTML = `<div class="card"><div class="empty">${icon("file")}<p><b>Nothing read yet.</b></p><p>Drop the renewal packet and every other tab fills itself.</p><a class="btn primary" href="#/accounts/brazos-valley/docs">Go to documents</a></div></div>`; return; }
    ({ docs, data, forms, markets, quotes, proposal, ...(window.SD?.tabs || {}) }[tab] || docs)();
  }

  function docs() {
    const KIND = { dec: "Declarations page", lossrun: "Loss run", email: "Client email", quote: "Market quote" };
    $("#aBody").innerHTML = `<div class="grid g-main-l"><div class="stack">
      <div class="card"><div class="card-b"><div class="drop" id="dDrop"><div class="ic">${icon("upload")}</div><b>Drop the renewal packet</b><div class="hint">Dec pages, loss runs, schedules, applications, client emails. PDF or text, any carrier's layout.</div>
        <div style="margin-top:14px"><button class="btn primary" id="dSample">${icon("file")}Load Brazos Valley renewal packet</button></div></div><div id="dRun" style="margin-top:14px"></div></div></div>
      ${S.docs.length ? card("Documents read", S.docs.map(d => `<div class="file-row"><div class="file-ic ${d.ext === "txt" ? "eml" : "pdf"}">${d.ext === "txt" ? "EML" : "PDF"}</div><div class="meta"><b>${esc(d.name)}</b><small>${KIND[d.kind] ? `${KIND[d.kind]} · ${d.fields} values read${d.pages ? ` · ${d.pages} page${d.pages > 1 ? "s" : ""}` : ""}` : "This demo reads dec pages, loss runs, client emails and market quotes"}</small></div>${KIND[d.kind] ? '<span class="chip ok">Read</span>' : '<span class="chip warn">Not recognized</span>'}</div>`).join(""),
        { tight: true, guide: "docs-read", foot: S.dec ? `<a class="btn primary" href="#/accounts/brazos-valley/data">${icon("arrow")}Review account data</a>` : `<span class="muted" style="font-size:12.5px">Add the expiring dec page to build the schedules and applications.</span>` }) : ""}
    </div>
    ${card("What gets pulled out", `<div class="steps">${["Named insured, DOT and MC numbers, operations, radius", "Every vehicle with year, make, VIN and stated value", "Every driver with date of birth, license class and experience", "Coverages, limits, deductibles and premium", "Commodities hauled and max value per load", "Every claim, open reserves and loss ratio by term", "Changes the client emailed: new units, sold units, new drivers, new states"].map(t => `<div class="step done"><span class="s-ic"></span><span>${t}</span></div>`).join("")}</div>`)}
    </div>`;
    const handle = async files => {
      const B = { dec: S.dec, loss: S.loss, chg: S.chg, quotes: [...S.quotes], docs: [...S.docs] };
      const steps = files.map(f => [`Reading ${esc(f.name)}`, async () => {
        const ext = UI.ext(f.name); let kind, fields = 0, pages = 0;
        if (ext === "pdf") {
          const doc = await UI.pdfLines(f); pages = doc.numPages; kind = Parsers.classify(doc.lines.join("\n"), f.name);
          if (kind === "dec") { B.dec = Parsers.dec(doc); fields = B.dec.fields; }
          if (kind === "lossrun") { B.loss = Parsers.lossrun(doc); fields = B.loss.fields; }
          if (kind === "quote") { const q = Parsers.quote(doc, f.name); if (q.total && q.al) { B.quotes = B.quotes.filter(x => x.filename !== f.name).concat([q]); fields = q.fields; } else kind = "unknown"; }
          if (kind === "dec" && !B.dec.vehicles.length && !B.dec.drivers.length && !B.dec.insured) { B.dec = S.dec; kind = "unknown"; }
          if (kind === "lossrun" && !B.loss.claims.length && !B.loss.terms.length) { B.loss = S.loss; kind = "unknown"; }
        } else { const t = await f.text(); kind = Parsers.classify(t, f.name); if (kind === "email") { B.chg = Parsers.email(t); fields = B.chg.fields; } }
        B.docs = B.docs.filter(d => d.name !== f.name).concat([{ name: f.name, kind, fields, pages, ext }]);
        const label = { dec: "declarations page", lossrun: "loss run", email: "client change email", quote: "market quote" }[kind] || "unrecognized";
        return { detail: `${label} · ${fields} values` };
      }]);
      steps.push(["Applying the client's changes to the schedules", async () => { Object.assign(S, B); const m = merged(); return { detail: m ? `${m.vehicles.length} units · ${m.drivers.length} drivers` : "" }; }]);
      steps.push(["Checking drivers, units and losses against market appetite", async () => ({ detail: `${DATA.markets.length} markets` }) ]);
      await UI.runSteps($("#dRun"), steps, 450);
      const unk = S.docs.filter(d => d.kind === "unknown").length;
      if (unk) toast(`${unk} file${unk > 1 ? "s weren't" : " wasn't"} recognized. Dec pages, loss runs, client emails and market quotes are read.`, "warn");
      if (S.dec) { credit("packet"); toast("Renewal packet read · applications ready for review"); } else if (!unk) toast("Add the expiring dec page to build the applications", "warn");
      render();
    };
    UI.dropzone($("#dDrop"), handle, { accept: ".pdf,.txt,.eml" });
    $("#dSample").onclick = async e => { e.stopPropagation(); e.target.disabled = true; handle(await Promise.all(DATA.packet.map(f => UI.fetchSample("samples/brazos-valley/" + encodeURIComponent(f))))); };
  }

  function data() {
    const m = merged(); const L = S.loss;
    const flags = [...m.drivers.flatMap(d => d.flags.filter(f => f[0] !== "info").map(f => [f[0], `${d.name}: ${f[1]}`])),
      ...(L ? L.open.map(c => ["crit", `Open ${c.coverage.toLowerCase()} claim ${c.no}: ${money(c.incurred)} incurred`]) : []),
      ...(S.chg?.states?.length ? [["info", `New states: ${S.chg.states.join(" and ")} (${S.chg.statesPct}% of runs)`]] : []),
      ...m.commodities.filter(c => /oilfield/i.test(c.name)).map(c => ["info", `${c.name}: ${c.pct}% of loads (some markets exclude)`])];
    $("#aBody").innerHTML = `
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><div class="l">Power units + trailers</div><div class="v">${m.vehicles.length}</div><div class="d">${money(m.stated)} stated value</div></div>
        <div class="card kpi"><div class="l">Drivers</div><div class="v">${m.drivers.length}</div><div class="d">${m.drivers.filter(d => d.flags.some(f => f[0] !== "info")).length} flagged for underwriting</div></div>
        <div class="card kpi"><div class="l">5-year loss ratio ${I("Incurred losses (paid plus reserves) divided by earned premium over the last five policy terms")}</div><div class="v">${L ? (L.lossRatio * 100).toFixed(1) + "%" : "—"}</div><div class="d">${L ? `${L.claims.length} claims · ${money(L.incurred)} incurred` : ""}</div></div>
        <div class="card kpi"><div class="l">Expiring premium</div><div class="v">${money(m.total)}</div><div class="d">${esc(m.carrier)}</div></div>
      </div>
      <div class="grid g-main-l" style="margin-bottom:16px">
        ${card("Vehicle schedule", `<div class="tbl-wrap"><table class="t"><thead><tr><th>#</th><th>Year / make / model</th><th>VIN</th><th>Type</th><th class="num">${T("Stated value", "The agreed value physical damage pays on a total loss")}</th><th>${T("Source", "Where each value came from, so it can be checked")}</th></tr></thead><tbody>
          ${m.vehicles.map(v => `<tr class="${v.isNew ? "sel" : ""}"><td>${v.unit}</td><td><b>${v.year} ${esc(v.make)}</b></td><td class="mono">${esc(v.vin)}</td><td>${esc(v.type)}</td><td class="num">${money(v.value)}</td><td>${v.isNew ? '<span class="chip accent">Added from email</span>' : '<span class="src">dec p2</span>'}</td></tr>`).join("")}
          ${(S.chg?.removeUnits || []).map(r => `<tr><td class="muted">${r.unit}</td><td class="muted" style="text-decoration:line-through">${esc(r.desc)}</td><td></td><td></td><td></td><td><span class="chip crit">Removed: sold 9/5</span></td></tr>`).join("")}
        </tbody></table></div>`, { tight: true, guide: "vehicles" })}
        ${card("Underwriting flags", flags.map(([k, t]) => `<div class="list-item"><div class="li-ic ${k}">${icon(k === "info" ? "eye" : "alert")}</div><div class="li-b"><p style="color:var(--ink);margin:0">${esc(t)}</p></div></div>`).join(""), { tight: true, guide: "flags", sub: "what an underwriter will ask about" })}
      </div>
      <div class="grid g-main-l" style="margin-bottom:16px">
        ${card("Drivers", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Driver</th><th>DOB</th><th class="num">${T("Age at renewal", "Age on the renewal date, which is what markets rate on")}</th><th>License</th><th class="num">Years exp.</th><th>Hired</th><th></th></tr></thead><tbody>
          ${m.drivers.map(d => `<tr class="${d.isNew ? "sel" : ""}"><td><b>${esc(d.name)}</b></td><td>${d.dob}</td><td class="num">${d.age}</td><td>${d.state} ${esc(d.cls)}</td><td class="num">${d.exp}</td><td>${d.hired}</td><td>${d.isNew ? '<span class="chip accent">Added from email</span> ' : ""}${d.flags.map(f => `<span class="chip ${f[0]} plain">${f[1]}</span>`).join(" ")}</td></tr>`).join("")}
        </tbody></table></div>`, { tight: true })}
        ${card("Operations", `<dl class="kv"><dt>Named insured</dt><dd>${esc(m.insured)}</dd><dt>USDOT / MC</dt><dd>${esc(m.dot)} / ${esc(m.mc)}</dd><dt>Operations</dt><dd>${esc(m.operations)}</dd><dt>${T("Radius", "How far trucks run from the garaging location. Intermediate is 201 to 500 miles")}</dt><dd>${esc(m.radius)}</dd><dt>States</dt><dd>${m.states.join(", ")}</dd><dt>In business</dt><dd>${esc(m.since)}</dd></dl>
          <table class="t" style="margin-top:14px"><thead><tr><th>Commodity</th><th class="num">Loads</th><th class="num">Max / load</th></tr></thead><tbody>${m.commodities.map(c => `<tr><td>${esc(c.name)}</td><td class="num">${c.pct}%</td><td class="num">${money(c.maxLoad)}</td></tr>`).join("")}</tbody></table>`)}
      </div>
      ${L ? card("Loss history", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Claim</th><th>Date</th><th>Coverage</th><th>Description</th><th class="num">Paid</th><th class="num">Reserve</th><th class="num">Incurred</th><th>Status</th></tr></thead><tbody>
          ${L.claims.map(c => `<tr class="${/open/i.test(c.status) ? "bad" : ""}"><td class="mono">${c.no}</td><td>${c.date}</td><td>${c.coverage}</td><td>${esc(c.desc)}</td><td class="num">${money(c.paid)}</td><td class="num">${money(c.reserve)}</td><td class="num strong">${money(c.incurred)}</td><td><span class="chip ${/open/i.test(c.status) ? "crit" : "ok"}">${c.status}</span></td></tr>`).join("")}
        </tbody></table></div>`, { tight: true, sub: `valued ${L.valued}` }) : ""}`;
    tagAccount();
  }

  function tagAccount() {
    $$("#aBody table").forEach(t => [...(t.tBodies[0]?.rows || [])].forEach(tr => {
      const txt = [...tr.cells].map(c => c.textContent.trim());
      const vin = txt.find(x => /^[A-HJ-NPR-Z0-9]{17}$/.test(x)); if (vin) tr.dataset.vin = vin;
      if (/Removed/.test(tr.textContent)) tr.dataset.removed = "1";
      if (/^RT-\d/.test(txt[0] || "")) tr.dataset.claim = txt[0];
      const d = txt.findIndex(x => /^\d{2}\/\d{2}\/\d{4}$/.test(x)); if (d > 0 && !vin) tr.dataset.driver = txt[d - 1];
    }));
    $$("#aBody .list-item").forEach(li => (li.dataset.flag = li.textContent.trim()));
    $$("#aBody .card").forEach(c => { const h = c.querySelector(".card-h h3")?.textContent.trim(); if (h === "Loss history") c.dataset.guide = "loss"; if (h === "Drivers") c.dataset.guide = "drivers"; });
    $$("#aBody .fs-cell").forEach(c => (c.dataset.field = UI.slug(c.querySelector("label")?.textContent)));
    $$("#aBody [data-guide=markets] > .card").forEach(c => (c.dataset.market = c.querySelector("h3")?.textContent.trim()));
  }

  /* ---------- application forms ---------- */
  function forms() {
    const m = merged(); const L = S.loss; const FT = S.formTab;
    const cell = (label, val, span = 1, review = false) => `<div class="fs-cell" style="grid-column:span ${span}"><label>${label}</label><div class="val ${review ? "rev" : ""}">${val == null || val === "" ? "&nbsp;" : esc(val)}</div></div>`;
    const top = (no, title) => `<div class="fs-top"><div class="fs-logo">ACORD</div><div class="fs-title">${title}</div><div class="fs-date">DATE (MM/DD/YYYY)<b>09/16/2026</b></div></div>`;
    const needs = [["FEIN", "Not in any document received"], ["Safety program / dashcams", "Asked by 2 of 3 markets"]].filter(n => !(S.x.fein && n[0] === "FEIN"));
    const f125 = `<div class="form-sheet">${top(125, "Commercial Insurance Application · Applicant Information Section")}
      <div class="fs-sec">Agency / carrier</div>
      <div class="fs-row" style="grid-template-columns:2fr 1fr 1fr">${cell("Agency", DATA.firm + " · 2200 Commerce Pkwy, Austin, TX 78701")}${cell("Carrier", "Per market submission")}${cell("Proposed eff. / exp. date", "11/01/2026 – 11/01/2027")}</div>
      <div class="fs-sec">Lines of business</div>
      <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr">${cell("Business auto", "X  " + money(S.dec.coverages[0]?.premium) + " expiring")}${cell("Motor truck cargo", "X  " + money(S.dec.coverages[2]?.premium) + " expiring")}${cell("General liability", "")}</div>
      <div class="fs-sec">Applicant information</div>
      <div class="fs-row" style="grid-template-columns:2fr 1fr 1fr">${cell("Name (first named insured)", m.insured)}${cell("Entity", "LLC")}${cell("FEIN", S.x.fein || "NEEDS INPUT", 1, !S.x.fein)}</div>
      <div class="fs-row" style="grid-template-columns:2fr 1fr 1fr">${cell("Mailing address", m.address)}${cell("USDOT number", m.dot)}${cell("MC number", m.mc)}</div>
      <div class="fs-row" style="grid-template-columns:2fr 1fr 1fr">${cell("Nature of business / description of operations", m.operations + "; " + m.commodities.map(c => `${c.name.toLowerCase()} ${c.pct}%`).join(", "))}${cell("Date business started", (m.since || "").replace("Since ", "01/01/"))}${cell("Radius", m.radius)}</div>
      <div class="fs-sec">Prior carrier information</div>
      <div class="fs-row" style="grid-template-columns:1.2fr 1fr 1fr 1fr">${cell("Carrier", m.carrier)}${cell("Policy number", m.policy)}${cell("Policy period", m.period)}${cell("Total premium", money(m.total))}</div>
      <div class="fs-sec">Loss history (last 5 years)</div>
      <table class="fs-tbl"><thead><tr><th>Date of loss</th><th>Line</th><th>Description</th><th>Paid</th><th>Reserved</th><th>Status</th></tr></thead><tbody>${(L?.claims || []).map(c => `<tr><td>${c.date}</td><td>${c.coverage}</td><td>${esc(c.desc)}</td><td>${money(c.paid)}</td><td>${money(c.reserve)}</td><td>${c.status}</td></tr>`).join("")}</tbody></table>
      <div class="fs-foot"><span>ACORD 125 layout · data mapped by Submission Desk</span><span>Page 1 of 1</span></div></div>`;
    const f127 = `<div class="form-sheet">${top(127, "Business Auto Section")}
      <div class="fs-sec">Driver information</div>
      <table class="fs-tbl"><thead><tr><th>#</th><th>Driver name</th><th>Date of birth</th><th>Age</th><th>Lic. state</th><th>Class</th><th>Yrs exp.</th><th>Date hired</th></tr></thead><tbody>${m.drivers.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td>${d.dob}</td><td>${d.age}</td><td>${d.state}</td><td>${esc(d.cls)}</td><td>${d.exp}</td><td>${d.hired}</td></tr>`).join("")}</tbody></table>
      <div class="fs-sec">Operations</div>
      <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr 1fr">${cell("Radius of operations", "Intermediate (201–500 mi)")}${cell("States operated in", m.states.join(", "))}${cell("Hazardous materials", "No")}${cell("Safety program / cameras", S.x.fein ? "Forward cameras; program: ask client" : "NEEDS INPUT", 1, true)}</div>
      <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr">${cell("Coverage requested: liability", S.dec.coverages[0]?.limit)}${cell("Physical damage deductible", S.dec.coverages[1]?.deductible)}${cell("Symbol", "7")}</div>
      <div class="fs-foot"><span>ACORD 127 layout · data mapped by Submission Desk</span><span>Page 1 of 1</span></div></div>`;
    const f129 = `<div class="form-sheet">${top(129, "Vehicle Schedule")}
      <table class="fs-tbl"><thead><tr><th>Veh #</th><th>Year</th><th>Make / model</th><th>VIN</th><th>Body type</th><th>Stated amount</th><th>Garaging zip</th><th>Radius</th><th>Use</th></tr></thead><tbody>${m.vehicles.map(v => `<tr><td>${v.unit}</td><td>${v.year}</td><td>${esc(v.make)}</td><td>${esc(v.vin)}</td><td>${esc(v.type)}</td><td>${money(v.value)}</td><td>76710</td><td>500</td><td>Commercial</td></tr>`).join("")}
      <tr><td colspan="5" style="text-align:right">Total stated amount</td><td>${money(m.stated)}</td><td colspan="3"></td></tr></tbody></table>
      <div class="fs-foot"><span>ACORD 129 layout · data mapped by Submission Desk</span><span>Page 1 of 1</span></div></div>`;
    const fcargo = `<div class="form-sheet">${top("cargo", "Motor Truck Cargo Supplemental")}
      <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr">${cell("Cargo limit requested", S.dec.coverages[2]?.limit)}${cell("Deductible", S.dec.coverages[2]?.deductible)}${cell("Refrigeration breakdown", "N/A")}</div>
      <table class="fs-tbl"><thead><tr><th>Commodity</th><th>% of loads</th><th>Maximum value per load</th></tr></thead><tbody>${m.commodities.map(c => `<tr><td>${esc(c.name)}</td><td>${c.pct}%</td><td>${money(c.maxLoad)}</td></tr>`).join("")}</tbody></table>
      <div class="fs-row" style="grid-template-columns:1fr 1fr">${cell("States", m.states.join(", "))}${cell("Cargo losses (5 years)", (L?.claims || []).filter(c => /cargo/i.test(c.coverage)).map(c => `${c.date} ${money(c.incurred)}`).join("; "))}</div>
      <div class="fs-foot"><span>Cargo supplemental · data mapped by Submission Desk</span><span>Page 1 of 1</span></div></div>`;
    const count = s => (s.match(/class="val/g) || []).length + (s.match(/<td>/g) || []).length;
    const map = { "125": f125, "127": f127, "129": f129, cargo: fcargo };
    $("#aBody").innerHTML = `<div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 300px">
      <div><div class="row no-print" style="margin-bottom:12px"><div class="seg" id="ft">${[["125", "ACORD 125", "Commercial insurance application: the insured, operations, prior carrier and loss history"], ["127", "ACORD 127", "Business auto section: drivers and operations"], ["129", "ACORD 129", "Vehicle schedule"], ["cargo", "Cargo supplemental", "Commodities, values per load and cargo losses"]].map(([k, l, tip]) => `<button data-f="${k}" data-tip="${tip}" class="${FT === k ? "on" : ""}">${l}</button>`).join("")}</div><span class="spacer"></span><button class="btn" onclick="UI.printOnly(document.querySelector('[data-guide=form] .form-sheet'))">${icon("printer")}Download PDF</button></div>
        <div data-guide="form" style="overflow-x:auto;background:#e9ebef;padding:18px;border-radius:8px">${map[FT]}</div></div>
      <div class="stack no-print">
        ${card("Application status", `<div class="kpi" style="padding:0"><div class="v">${Object.values(map).reduce((s, f) => s + count(f), 0)}</div><div class="d">fields filled across 4 forms</div></div>
          <div class="progress ok" style="margin:12px 0"><i style="width:96%"></i></div><p class="muted" style="font-size:12.5px;margin:0">Everything came from the dec page, loss run and the client's email. Nothing typed.</p>`)}
        ${card(`Needs input ${I("Fields no document contained. Highlighted yellow on the forms.")}`, needs.map(([f, w]) => `<div class="list-item"><div class="li-ic warn">${icon("alert")}</div><div class="li-b"><b>${f}</b><p>${w}</p></div></div>`).join(""), { tight: true, guide: "needs", foot: `<button class="btn sm" onclick="UI.toast('Sent to Carla Mendez: FEIN and dashcam question')">${icon("mail")}Ask the client</button>` })}
        <a class="btn primary" href="#/accounts/brazos-valley/markets" style="justify-content:center">${icon("arrow")}Choose markets</a>
      </div></div>`;
    tagAccount();
    $$("#ft button").forEach(b => b.onclick = () => { S.formTab = b.dataset.f; forms(); save(); });
    credit("forms");
  }

  /* ---------- markets ---------- */
  function markets() {
    const m = merged();
    const rows = DATA.markets.map(mk => ({ mk, r: marketCheck(mk, m) }));
    $("#aBody").innerHTML = `<div class="alert" style="margin-bottom:16px">${icon("zap")}<div>Each market's appetite checked against this account's drivers, units, radius, commodities and open losses. Submissions go out in the format each market asks for.</div></div>
      <div class="grid g2" data-guide="markets">${rows.map(({ mk, r }) => { const sent = S.sent.has(mk.name); const kind = r.status === "Declines" ? "crit" : r.status === "Conditional" ? "warn" : "ok";
        return `<div class="card"><div class="card-h"><div><h3>${mk.name}</h3><div class="sub">${T(mk.type, TYPE_TIP[mk.type])} · ${mk.format}</div></div><div class="actions"><span class="chip ${kind}" data-tip="${STATUS_TIP[r.status]}">${r.status}</span></div></div>
          <div class="card-b">${r.fails.length || r.conditions.length ? [...r.fails.map(t => `<div class="row" style="margin:4px 0;align-items:flex-start"><span style="color:var(--crit)">✕</span><span>${esc(t)}</span></div>`), ...r.conditions.map(t => `<div class="row" style="margin:4px 0;align-items:flex-start"><span style="color:var(--warn)">!</span><span>${esc(t)}</span></div>`)].join("") : `<div class="row"><span style="color:var(--ok)">✓</span><span>Drivers, radius, units, commodities and losses all within appetite</span></div>`}</div>
          <div class="card-f">${r.status === "Declines" ? `<span class="muted" style="font-size:12.5px">Not submitted, saving the underwriter's time and yours</span>` : sent ? `<span class="chip ok">Submitted ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>` : `<button class="btn sm primary" data-sub="${esc(mk.name)}">${icon("send")}Review submission</button>`}</div></div>`; }).join("")}</div>`;
    tagAccount();
    $$("[data-sub]").forEach(b => b.onclick = () => {
      const mk = DATA.markets.find(x => x.name === b.dataset.sub); const r = marketCheck(mk, m);
      const att = mk.format.includes("Program") ? ["Program application (pre-filled).pdf", "Loss runs 5 yr.pdf", "Driver list and MVRs.pdf"] : ["ACORD 125.pdf", "ACORD 127.pdf", "ACORD 129.pdf", "Cargo supplemental.pdf", "Loss runs 5 yr.pdf"];
      modal({ title: `Submission to ${mk.name}`, wide: true, body: `<div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 280px">
        <div><div class="field"><label>To</label><input class="input" value="${mk.email}"></div><div class="field"><label>Subject</label><input class="input" value="New submission: ${esc(m.insured)} · USDOT ${m.dot} · eff. 11/01/2026"></div>
        <textarea class="input" style="min-height:260px">Hello,\n\nPlease quote the attached renewal for ${m.insured}, a ${m.operations.toLowerCase()} operation out of Waco, TX, in business ${(m.since || "").toLowerCase()}.\n\n- ${m.vehicles.length} units (${money(m.stated)} stated value), ${m.drivers.length} drivers\n- Intermediate radius, ${m.states.join(", ")}\n- Commodities: ${m.commodities.map(c => `${c.name.toLowerCase()} ${c.pct}%`).join(", ")}\n- Requesting ${S.dec.coverages.map(c => `${c.name.replace(/ \(.*\)/, "")} ${c.limit}`).join("; ")}\n- Expiring ${money(m.total)} with ${m.carrier}\n- 5-year loss ratio ${S.loss ? (S.loss.lossRatio * 100).toFixed(1) + "%" : "n/a"}, one open AL claim (details in the loss runs)\n${r.conditions.length ? "\nWe note your driver guidelines; please quote with and without " + m.drivers.filter(d => d.exp < 2).map(d => d.name).join(", ") + ".\n" : ""}\nTarget quote date: October 9.\n\nThank you,\nCarlos Ibarra\n${DATA.firm}</textarea></div>
        <div><div class="muted" style="font-size:12px;margin-bottom:8px">ATTACHMENTS · generated</div>${att.map(f => `<div class="file-row" style="padding:8px 0"><div class="file-ic pdf">PDF</div><div class="meta"><b>${f}</b><small>ready</small></div></div>`).join("")}</div></div>`,
        actions: [{ label: "Cancel" }, { label: "Send submission", primary: true, onClick: () => { S.sent.add(mk.name); credit("submit", "submit:" + mk.name); toast(`Submitted to ${mk.name}`); markets(); save(); } }] });
    });
  }

  /* ---------- quotes ---------- */
  function quotes() {
    const exp = S.dec.total;
    if (!S.quotes.length) {
      $("#aBody").innerHTML = `<div class="card"><div class="card-b"><div class="drop" id="qDrop"><div class="ic">${icon("upload")}</div><b>Drop the quotes markets sent back</b><div class="hint">Every market's layout is different. Premiums, limits, deductibles, fees and subjectivities are pulled out of each.</div>
        <div style="margin-top:14px"><button class="btn primary" id="qSample">${icon("file")}Load the 3 quotes received</button></div></div><div id="qRun" style="margin-top:14px"></div></div></div>`;
      const handle = async files => {
        let skipped = 0;
        await UI.runSteps($("#qRun"), files.map(f => [`Reading ${esc(f.name)}`, async () => { const doc = await UI.pdfLines(f); const q = Parsers.quote(doc, f.name);
          if (!q.total || !q.al) { skipped++; return { detail: "no premiums found" }; }
          S.quotes = S.quotes.filter(x => x.filename !== f.name).concat([q]); return { detail: `${money(q.total)} · ${q.subjectivities.length} subjectivities` }; }]), 500);
        if (skipped) toast(`${skipped} file${skipped > 1 ? "s" : ""} had no liability premium and total to compare`, "warn");
        if (S.quotes.length) { credit("quotes"); toast(`${S.quotes.length} quotes compared against expiring`); } render();
      };
      UI.dropzone($("#qDrop"), handle, { accept: ".pdf" });
      $("#qSample").onclick = async e => { e.stopPropagation(); e.target.disabled = true; handle(await Promise.all(DATA.quotes.map(f => UI.fetchSample("samples/brazos-valley/" + encodeURIComponent(f))))); };
      return;
    }
    const Q = S.quotes; const excl = q => q.subjectivities.some(s => /exclude driver/i.test(s));
    if (!S.recommend) S.recommend = [...Q].filter(q => !excl(q)).sort((a, b) => a.total - b.total)[0]?.market;
    const best = Math.min(...Q.map(q => q.total));
    const row = (l, f) => `<tr><td>${l}</td><td class="cur">${f(null)}</td>${Q.map(q => `<td>${f(q)}</td>`).join("")}</tr>`;
    const expCov = S.dec.coverages;
    $("#aBody").innerHTML = `<div class="card" data-guide="qcmp"><div class="card-h"><h3>Quote comparison</h3><span class="sub">vs expiring ${money(exp)} with ${esc(S.dec.carrier)}</span><div class="actions"><button class="btn sm" id="qCsv">${icon("download")}Export</button></div></div>
      <div class="tbl-wrap"><table class="cmp"><thead><tr><th></th><th class="cur"><span class="car">Expiring</span><span class="pl">${esc(S.dec.carrier)}</span></th>${Q.map(q => `<th><span class="car" data-tip="${TYPE_TIP[q.type]}">${q.type}</span><span class="pl">${esc(q.market)}</span>${S.recommend === q.market ? '<div style="margin-top:6px"><span class="chip ok">Recommended</span></div>' : ""}</th>`).join("")}</tr></thead><tbody>
        <tr class="sect"><td colspan="${Q.length + 2}">Auto liability</td></tr>
        ${row("Limit", q => q ? esc(q.al?.limit) : esc(expCov[0]?.limit))}${row("Premium", q => money(q ? q.al?.premium : expCov[0]?.premium))}
        <tr class="sect"><td colspan="${Q.length + 2}">Physical damage</td></tr>
        ${row("Deductible", q => { const v = q ? q.apd?.ded : expCov[1]?.deductible; return q && v !== expCov[1]?.deductible ? `<span style="color:var(--crit);font-weight:600">${esc(v)}</span>` : esc(v); })}${row("Premium", q => money(q ? q.apd?.premium : expCov[1]?.premium))}
        <tr class="sect"><td colspan="${Q.length + 2}">Motor truck cargo</td></tr>
        ${row("Limit", q => { const v = q ? q.cargo?.limit : expCov[2]?.limit; return q && v !== expCov[2]?.limit ? `<span style="color:var(--ok);font-weight:600">${esc(v)}</span>` : esc(v); })}${row("Deductible", q => { const v = q ? q.cargo?.ded : expCov[2]?.deductible; return q && v !== expCov[2]?.deductible ? `<span style="color:var(--crit);font-weight:600">${esc(v)}</span>` : esc(v); })}${row("Premium", q => money(q ? q.cargo?.premium : expCov[2]?.premium))}
        <tr class="sect"><td colspan="${Q.length + 2}">Total</td></tr>
        ${row("Fees and taxes", q => money(q ? q.fees : 0))}
        <tr class="total"><td>Total cost</td><td class="cur">${money(exp)}</td>${Q.map(q => `<td class="${q.total === best ? "best" : ""}">${money(q.total)}</td>`).join("")}</tr>
        ${row("vs expiring", q => q ? `<span style="color:${q.total < exp ? "var(--ok)" : "var(--crit)"};font-weight:600">${pct((q.total / exp - 1) * 100)}</span>` : "—")}
        <tr><td>${T("Subjectivities", "Conditions the market requires before or after binding. A driver exclusion here changes what's covered.")}</td><td class="cur"></td>${Q.map(q => `<td style="white-space:normal;text-align:left;min-width:220px">${q.subjectivities.map(s => `<div style="font-size:12.5px;margin:3px 0" class="${/exclude/i.test(s) ? "" : "ink2"}">${/exclude/i.test(s) ? "⚠ " : "• "}${esc(s)}</div>`).join("")}</td>`).join("")}</tr>
        <tr><td></td><td class="cur"></td>${Q.map(q => `<td><button class="btn sm ${S.recommend === q.market ? "primary" : ""}" data-rec="${esc(q.market)}">${S.recommend === q.market ? "Recommended" : "Recommend"}</button></td>`).join("")}</tr>
      </tbody></table></div></div>
      ${(() => { const cheap = [...Q].sort((a, b) => a.total - b.total)[0]; const rec = Q.find(q => q.market === S.recommend);
        return cheap && rec && cheap !== rec && excl(cheap) ? `<div class="alert warn" data-guide="qalert" style="margin-top:16px">${icon("alert")}<div><b>${esc(cheap.market)} is the lowest price, but it excludes a driver.</b> An excluded driver means no coverage while he's behind the wheel, the physical damage deductible doubles to ${esc(cheap.apd?.ded)}, and the cargo deductible rises to ${esc(cheap.cargo?.ded)}. ${esc(rec.market)} keeps every driver and raises cargo to ${esc(rec.cargo?.limit)} for ${money(rec.total - cheap.total)} more.</div></div>` : ""; })()}`;
    UI.tagTable($('[data-guide="qcmp"] .cmp'), ["expiring", ...Q.map(q => q.market)]);
    $$("[data-rec]").forEach(b => b.onclick = () => { S.recommend = b.dataset.rec; toast("Recommendation updated. Proposal rebuilt"); quotes(); save(); });
    $("#qCsv").onclick = () => { UI.download("BrazosValley_quote_comparison.csv", UI.toCSV([["", "Expiring", ...Q.map(q => q.market)], ["AL premium", expCov[0]?.premium, ...Q.map(q => q.al?.premium)], ["APD premium", expCov[1]?.premium, ...Q.map(q => q.apd?.premium)], ["Cargo premium", expCov[2]?.premium, ...Q.map(q => q.cargo?.premium)], ["Fees/taxes", 0, ...Q.map(q => q.fees)], ["Total", exp, ...Q.map(q => q.total)]])); toast("Comparison exported"); };
  }

  function proposal() {
    if (!S.quotes.length) { $("#aBody").innerHTML = `<div class="card"><div class="empty"><p><b>No quotes read yet.</b></p><a class="btn primary" href="#/accounts/brazos-valley/quotes">Go to quotes</a></div></div>`; return; }
    quotesIfNeeded(); credit("proposal"); const m = merged(); const rec = S.quotes.find(q => q.market === S.recommend) || S.quotes[0]; const exp = S.dec.total;
    $("#aBody").innerHTML = `<div class="row no-print" style="margin-bottom:14px"><span class="muted">Built from the quotes read and the recommendation. Change either and this updates.</span><span class="spacer"></span>
      <button class="btn" onclick="UI.toast('Sent to Carla Mendez for review')">${icon("send")}Send to client</button><button class="btn primary" onclick="UI.printOnly(document.querySelector('.report'))">${icon("printer")}Download PDF</button></div>
      <div class="report">
        <div class="rep-meta">${DATA.firm.toUpperCase()} · RENEWAL PROPOSAL</div><h1 style="margin-top:8px">${esc(m.insured)}</h1><div class="rep-meta">Commercial auto and cargo · effective November 1, 2026 · prepared September 16, 2026</div>
        <h2>What changed this year</h2>
        <p>We added the 2024 Kenworth W900 (${money(S.chg?.addVehicles[0]?.value)}), removed the sold 2019 Freightliner Cascadia, added driver ${esc(S.chg?.addDrivers[0]?.name || "")}, and rated your new Oklahoma and New Mexico runs. Your schedule is now ${m.vehicles.length} units worth ${money(m.stated)} with ${m.drivers.length} drivers.</p>
        <h2>Quotes</h2>
        <table class="t"><thead><tr><th>Market</th><th>Liability</th><th>PD deductible</th><th>Cargo</th><th class="num">Total</th><th class="num">vs expiring</th></tr></thead><tbody>
          <tr><td><b>${esc(S.dec.carrier)}</b><div class="muted" style="font-size:12px">Expiring</div></td><td>${esc(S.dec.coverages[0]?.limit)}</td><td>${esc(S.dec.coverages[1]?.deductible)}</td><td>${esc(S.dec.coverages[2]?.limit)}</td><td class="num">${money(exp)}</td><td class="num">—</td></tr>
          ${S.quotes.map(q => `<tr class="${q === rec ? "sel" : ""}"><td><b>${esc(q.market)}</b>${q === rec ? '<div style="font-size:12px;color:var(--ok);font-weight:600">Recommended</div>' : ""}</td><td>${esc(q.al?.limit)}</td><td>${esc(q.apd?.ded)}</td><td>${esc(q.cargo?.limit)}</td><td class="num">${money(q.total)}</td><td class="num">${pct((q.total / exp - 1) * 100)}</td></tr>`).join("")}
        </tbody></table>
        <h2>Our recommendation</h2>
        <p>Bind with <b>${esc(rec.market)}</b> at <b>${money(rec.total)}</b>. It keeps every driver on the policy, holds your physical damage deductible at ${esc(rec.apd?.ded)}, and ${rec.cargo?.limit !== S.dec.coverages[2]?.limit ? `raises cargo to ${esc(rec.cargo?.limit)}, which covers your highest-value oilfield loads` : `keeps cargo at ${esc(rec.cargo?.limit)}`}.</p>
        <h2>Before we bind</h2>
        <table class="t"><tbody>${rec.subjectivities.map(s => `<tr><td>${esc(s)}</td></tr>`).join("")}<tr><td>Signed applications and your FEIN</td></tr></tbody></table>
        <p class="muted" style="font-size:12px;margin-top:24px">Quotes are subject to each market's final underwriting. Sample document: all companies, drivers and figures are fictional.</p>
      </div>`;
  }
  const quotesIfNeeded = () => { if (!S.recommend && S.quotes.length) { const excl = q => q.subjectivities.some(s => /exclude driver/i.test(s)); S.recommend = [...S.quotes].filter(q => !excl(q)).sort((a, b) => a.total - b.total)[0]?.market; } };

  /* ================= certificates ================= */
  route("/certificates", () => coi(DATA.certificates[0].id));
  route("/certificates/:id", ({ id }) => coi(+id));
  const POLICIES = {
    "brazos-valley": { carrier: "Redline Transport Insurance Company", naic: "10492", al: ["RTI-CA-448812", "11/01/2025", "11/01/2026", 1000000], cargo: ["RTI-CA-448812", "11/01/2025", "11/01/2026", 100000], aiEndorsement: true },
    "gulf-coast": { carrier: "Atlas Truckers Program", naic: "23871", al: ["ATP-TR-10288", "12/01/2025", "12/01/2026", 1000000], cargo: ["ATP-TR-10288", "12/01/2025", "12/01/2026", 100000], aiEndorsement: true },
    "inland-empire": { carrier: "Northgate Specialty Insurance", naic: "31204", al: ["NGS-TR-18840", "10/15/2025", "10/15/2026", 1000000], cargo: ["NGS-TR-18840", "10/15/2025", "10/15/2026", 150000], aiEndorsement: true },
  };
  function coi(id) {
    const c = DATA.certificates.find(x => x.id === id) || DATA.certificates[0]; const a = A(c.account); const p = POLICIES[c.account]; const done = S.done.has("coi" + c.id);
    const alOk = p.al[3] >= c.alMin, cargoOk = p.cargo[3] >= c.cargoMin;
    setPage([["Certificates"]], `${head("Certificates", "Requests from brokers, shippers and customers matched to the policy, checked against their requirements, and issued.")}
      <div class="grid" style="grid-template-columns:minmax(250px,330px) minmax(0,1fr)">
        <div class="card" style="align-self:start">${DATA.certificates.map(x => { const ok = POLICIES[x.account].al[3] >= x.alMin && POLICIES[x.account].cargo[3] >= x.cargoMin;
          return `<a class="list-item" href="#/certificates/${x.id}" style="text-decoration:none;color:inherit;${x.id === c.id ? "background:var(--accent-w)" : ""}"><div class="li-ic ${S.done.has("coi" + x.id) ? "ok" : ok ? "info" : "warn"}">${icon(S.done.has("coi" + x.id) ? "check" : "shield")}</div>
            <div class="li-b"><b>${x.from}</b><p>${esc(A(x.account).name)}</p><div style="margin-top:4px">${S.done.has("coi" + x.id) ? '<span class="chip ok">Issued</span>' : ok ? '<span class="chip info">Ready to issue</span>' : '<span class="chip warn">Coverage gap</span>'}</div></div><div class="li-t">${x.time}</div></a>`; }).join("")}</div>
        <div class="stack">
          <div class="grid g2w">
            ${card("Request", `<dl class="kv"><dt>From</dt><dd>${c.from}<div class="muted" style="font-size:12px">${c.email}</div></dd><dt>Insured</dt><dd>${esc(a.name)}</dd><dt>Certificate holder</dt><dd>${esc(c.holder)}</dd><dt>${T("Additional insured", "The certificate holder is added to the policy's liability coverage, usually required by a shipper's contract")}</dt><dd>${c.ai ? "Requested" : "No"}</dd><dt>Their requirement</dt><dd>${esc(c.note)}</dd></dl>`)}
            ${card(`Checked against the policy ${I("The request's requirements compared with the insured's active policy before anything is issued")}`, `<div class="list-item" style="padding:6px 0"><div class="li-ic ${alOk ? "ok" : "crit"}">${icon(alOk ? "check" : "x")}</div><div class="li-b"><b>Auto liability ${money(p.al[3])}</b><p>Required ${money(c.alMin)}</p></div></div>
              <div class="list-item" style="padding:6px 0"><div class="li-ic ${cargoOk ? "ok" : "crit"}">${icon(cargoOk ? "check" : "x")}</div><div class="li-b"><b>Cargo ${money(p.cargo[3])}</b><p>Required ${c.cargoMin ? money(c.cargoMin) : "none"}</p></div></div>
              <div class="list-item" style="padding:6px 0"><div class="li-ic ok">${icon("check")}</div><div class="li-b"><b>Policy active</b><p>${p.al[0]} · expires ${p.al[2]}</p></div></div>
              ${c.ai ? `<div class="list-item" style="padding:6px 0"><div class="li-ic ok">${icon("check")}</div><div class="li-b"><b>Blanket additional insured endorsement on file</b><p>Holder can be named without a new endorsement</p></div></div>` : ""}`, { guide: "coi-check" })}
          </div>
          ${alOk && cargoOk ? `<div class="card" data-guide="coi-cert"><div class="card-h"><h3>Certificate of liability insurance</h3><div class="actions">${done ? '<span class="chip ok">Issued and emailed</span>' : `<button class="btn sm primary" id="issue">${icon("send")}Issue and send</button>`}</div></div>
            <div class="card-b" style="background:#e9ebef"><div class="form-sheet">
              <div class="fs-top"><div class="fs-logo">ACORD</div><div class="fs-title">Certificate of Liability Insurance</div><div class="fs-date">DATE (MM/DD/YYYY)<b>09/16/2026</b></div></div>
              <div class="fs-row" style="grid-template-columns:1fr 1fr"><div class="fs-cell"><label>Producer</label><div class="val">${DATA.firm}\n2200 Commerce Pkwy, Austin, TX 78701</div></div><div class="fs-cell"><label>Insurer A · NAIC</label><div class="val">${p.carrier} · ${p.naic}</div></div></div>
              <div class="fs-row" style="grid-template-columns:1fr"><div class="fs-cell"><label>Insured</label><div class="val">${esc(a.name)}\n${a.id === "brazos-valley" ? "4410 Franklin Ave, Waco, TX 76710" : esc(a.city)}</div></div></div>
              <div class="fs-sec">Coverages</div>
              <table class="fs-tbl"><thead><tr><th>Type of insurance</th><th>Addl insd</th><th>Policy number</th><th>Eff</th><th>Exp</th><th>Limits</th></tr></thead><tbody>
                <tr><td>Automobile liability · any auto</td><td>${c.ai ? "Y" : ""}</td><td>${p.al[0]}</td><td>${p.al[1]}</td><td>${p.al[2]}</td><td>Combined single limit ${money(p.al[3])}</td></tr>
                <tr><td>Motor truck cargo</td><td></td><td>${p.cargo[0]}</td><td>${p.cargo[1]}</td><td>${p.cargo[2]}</td><td>Limit ${money(p.cargo[3])}</td></tr></tbody></table>
              <div class="fs-row" style="grid-template-columns:1fr"><div class="fs-cell"><label>Description of operations / vehicles</label><div class="val">${c.ai ? "Certificate holder is included as additional insured with respect to auto liability as required by written contract." : "Evidence of coverage for carrier setup."}</div></div></div>
              <div class="fs-row" style="grid-template-columns:1fr 1fr"><div class="fs-cell"><label>Certificate holder</label><div class="val">${esc(c.holder)}</div></div><div class="fs-cell"><label>Authorized representative</label><div class="val">Carlos Ibarra</div></div></div>
            </div></div></div>`
          : `<div class="card" data-guide="coi-gap"><div class="card-b"><div class="alert warn">${icon("alert")}<div><b>Can't issue as requested.</b> ${!alOk ? `${esc(c.from)} requires ${money(c.alMin)} auto liability; ${esc(a.name)} carries ${money(p.al[3])} and has no umbrella.` : `${esc(c.from)} requires ${money(c.cargoMin)} cargo; ${esc(a.name)} carries ${money(p.cargo[3])}.`} A certificate showing higher limits than the policy carries isn't an option.</div></div>
              <div class="row" style="margin-top:14px"><button class="btn primary" id="gapQuote">${icon("send")}Get a quote to increase ${!alOk ? "to $2M (umbrella)" : "cargo to $250K"}</button><button class="btn" id="gapTell">${icon("mail")}Tell the insured</button></div></div></div>`}
        </div></div>`);
    const i = $("#issue"); if (i) i.onclick = () => { S.done.add("coi" + c.id); credit("coi", "coi" + c.id); toast(`Certificate emailed to ${c.from} and saved to the account`); render(); };
    const g1 = $("#gapQuote"); if (g1) g1.onclick = () => toast(`Endorsement request sent to ${p.carrier}; client told what it costs before it binds`);
    const g2 = $("#gapTell"); if (g2) g2.onclick = () => toast(`Email drafted to ${a.name} explaining the requirement`);
  }

  /* ================= requests ================= */
  route("/requests", () => req(DATA.requests[0].id));
  route("/requests/:id", ({ id }) => req(+id));
  function req(id) {
    const r = DATA.requests.find(x => x.id === id) || DATA.requests[0]; const done = S.done.has("req" + r.id);
    setPage([["Client requests"]], `${head("Client requests", "Driver and vehicle changes, supplementals and questions from insureds, read and turned into carrier requests.")}
      <div class="grid" style="grid-template-columns:minmax(250px,330px) minmax(0,1fr)">
        <div class="card" style="align-self:start">${DATA.requests.map(x => `<a class="list-item" href="#/requests/${x.id}" style="text-decoration:none;color:inherit;${x.id === r.id ? "background:var(--accent-w)" : ""}"><div class="avatar s" style="background:${S.done.has("req" + x.id) ? "var(--ok)" : "var(--accent)"}">${UI.initials(x.from)}</div><div class="li-b"><b>${x.from}</b><p>${x.subject}</p><div style="margin-top:4px">${S.done.has("req" + x.id) ? '<span class="chip ok">Sent to carrier</span>' : `<span class="chip accent plain">${x.intent}</span>`}</div></div><div class="li-t">${x.time}</div></a>`).join("")}</div>
        <div class="stack">
          <div class="card"><div class="card-h"><div class="avatar">${UI.initials(r.from)}</div><div><h3>${r.subject}</h3><div class="sub">${r.from} · ${r.org}</div></div><div class="actions"><span class="muted" style="font-size:12.5px">${r.time}</span></div></div><div class="card-b" style="white-space:pre-wrap">${esc(r.body)}</div></div>
          <div class="grid g2w">
            ${card(`${icon("spark")} Read as`, `<div class="row" style="margin-bottom:12px"><span class="chip accent">${r.intent}</span></div><dl class="kv">${r.fields.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl><div class="alert ok" style="margin-top:14px">${icon("zap")}<div>${r.action}</div></div>`, { guide: "req-read" })}
            ${card("Carrier request", `<textarea class="input" style="min-height:220px">Policy change request\n\nInsured: ${r.org}\n${r.fields.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nPlease endorse effective as listed and confirm any premium change.\n\nMia Chen\n${DATA.firm}</textarea>`, { foot: done ? '<span class="chip ok">Sent</span>' : `<button class="btn primary" id="rSend">${icon("send")}Send to carrier and confirm with client</button>` })}
          </div></div></div>`);
    const main = $$("#view .stack").pop(); if (main) main.dataset.guide = "req-main";
    const body = main?.querySelector(".card-b"); if (body) body.dataset.guide = "req-body";
    $$("#view dl.kv dd").forEach(dd => (dd.dataset.field = dd.previousElementSibling?.textContent.trim()));
    const b = $("#rSend"); if (b) b.onclick = () => { S.done.add("req" + r.id); credit("change", "req" + r.id); toast(`Sent to carrier · ${r.from} told it's in progress`); const n = DATA.requests.find(x => !S.done.has("req" + x.id)); go("#/requests/" + (n ? n.id : r.id)); };
  }

  /* ================= renewals ================= */
  route("/renewals", () => {
    const rows = [...DATA.accounts].sort((a, b) => a.xdate.localeCompare(b.xdate));
    const step = (a, n) => { const d = daysUntil(a.xdate); const done = d <= n; return `<td style="text-align:center">${done ? `<span style="color:var(--ok)">●</span>` : `<span class="muted">○</span>`}</td>`; };
    setPage([["Renewals"]], `${head("Renewals", "Every X-date worked back from: loss runs requested at 120 days, applications at 90, submissions at 60, proposal at 30.")}
      ${card("Renewal calendar", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Account</th><th>X-date</th><th class="num">Expiring</th><th style="text-align:center">Loss runs<br><small class="muted">120 d</small></th><th style="text-align:center">Applications<br><small class="muted">90 d</small></th><th style="text-align:center">Submitted<br><small class="muted">60 d</small></th><th style="text-align:center">Proposal<br><small class="muted">30 d</small></th><th>Stage</th></tr></thead><tbody>
        ${rows.map(a => `<tr class="click" onclick="location.hash='#/accounts/${a.id}'"><td><div class="cell-2"><b>${esc(a.name)}</b><small>${a.cls} · ${a.carrier}</small></div></td><td class="nowrap">${fdate(a.xdate)} ${daysChip(a.xdate)}</td><td class="num">${money(a.premium)}</td>${step(a, 120)}${step(a, 90)}${step(a, 60)}${step(a, 30)}<td><span class="chip ${a.kind}">${a.stage}</span></td></tr>`).join("")}
      </tbody></table></div>`, { tight: true, guide: "renewals" })}`);
  });

  /* shared with ops.js (risk review, supplementals, bind, inbox, claims, missing info, ask the file, time saved) */
  window.SD = { S, A, merged, marketCheck, setPage, head, card, next, save: () => save(), quotesIfNeeded: () => quotesIfNeeded() };

  /* ================= session: a refresh mid-demo keeps you signed in with everything loaded ================= */
  const SK = "sd:state";
  let saveT = null, frozen = false;
  function save() {
    if (!S.who || frozen) return;
    const payload = snapshot();
    try { sessionStorage.setItem(SK, JSON.stringify(payload)); } catch (e) { }
    clearTimeout(saveT); saveT = setTimeout(() => UI.api("PUT", "/api/state/fortis", payload), 400);
  }
  function snapshot() {
    return (JSON.parse(JSON.stringify({ who: S.who, packet: !!S.dec, quotes: S.quotes.length > 0, sent: [...S.sent], recommend: S.recommend, formTab: S.formTab, done: [...S.done], x: S.x })));
  }
  async function restore(st) {
    Object.assign(S, { sent: new Set(st.sent || []), recommend: st.recommend || null, formTab: st.formTab || "125", done: new Set(st.done || []), x: { ...(st.x || {}), binding: false } });
    if (st.packet) for (const fn of DATA.packet) {
      const f = await UI.fetchSample("samples/brazos-valley/" + encodeURIComponent(fn)); const ext = UI.ext(fn); let kind, fields = 0, pages = 0;
      if (ext === "pdf") { const doc = await UI.pdfLines(f); pages = doc.numPages; kind = Parsers.classify(doc.lines.join("\n"), fn);
        if (kind === "dec") { S.dec = Parsers.dec(doc); fields = S.dec.fields; } if (kind === "lossrun") { S.loss = Parsers.lossrun(doc); fields = S.loss.fields; } }
      else { const t = await f.text(); kind = "email"; S.chg = Parsers.email(t); fields = S.chg.fields; }
      S.docs.push({ name: fn, kind, fields, pages, ext });
    }
    if (st.quotes) for (const fn of DATA.quotes) { const f = await UI.fetchSample("samples/brazos-valley/" + encodeURIComponent(fn)); S.quotes.push(Parsers.quote(await UI.pdfLines(f), fn)); }
  }
  const navHook = h => { $("#nav").innerHTML = NAV.map(([sec, items]) => `<div class="nav-h">${sec}</div>` + items.map(([href, ic, label, cnt, hot]) => {
      const c = cnt ? cnt() : 0; const on = href === "#/accounts" ? h === "/accounts" : h.startsWith(href.slice(1));
      return `<a href="${href}" class="${on ? "on" : ""}">${icon(ic)}<span>${label}</span>${c ? `<span class="cnt ${hot ? "hot" : ""}">${c}</span>` : ""}</a>`;
    }).join("")).join(""); window.SD?.afterNav?.(h); save(); };
  UI.setOnNav(navHook);
  UI.setPalette(() => [
    ...NAV.flatMap(([sec, items]) => items.map(([href, ic, label]) => ({ label, sub: sec, href, icon: ic, kind: "Page", top: true }))),
    { label: "Brazos Valley: applications", sub: "ACORD 125, 127, 129 and cargo", href: "#/accounts/brazos-valley/forms", icon: "file", kind: "Renewal", top: true },
    { label: "Brazos Valley: quote comparison", sub: "3 markets vs expiring", href: "#/accounts/brazos-valley/quotes", icon: "columns", kind: "Renewal", top: true },
    { label: "Brazos Valley: risk review", sub: "FMCSA record, drivers, loss trend", href: "#/accounts/brazos-valley/risk", icon: "eye", kind: "Renewal" },
    { label: "Brazos Valley: supplementals", sub: "3 markets' supplementals from one set of answers", href: "#/accounts/brazos-valley/supp", icon: "table", kind: "Renewal" },
    { label: "Brazos Valley: bind & filings", sub: "Checklist, filings, issued policy check", href: "#/accounts/brazos-valley/bind", icon: "check", kind: "Renewal" },
    ...DATA.accounts.map(a => ({ label: a.name, sub: `${a.cls} · ${a.city} · X-date ${fdate(a.xdate)}`, href: "#/accounts/" + a.id, icon: a.icon, kind: "Account" })),
    ...DATA.certificates.map(c => ({ label: `Certificate for ${c.from}`, sub: A(c.account).name, href: "#/certificates/" + c.id, icon: "shield", kind: "Certificate" })),
    ...DATA.requests.map(r => ({ label: `${r.from}: ${r.subject}`, sub: r.org, href: "#/requests/" + r.id, icon: "mail", kind: "Request" })),
    ...DATA.markets.map(m => ({ label: m.name, sub: `${m.type} market · ${m.format}`, href: "#/accounts/brazos-valley/markets", icon: "send", kind: "Market" })),
  ]);

  /* ================= guided demo ================= */
  const F = name => "samples/brazos-valley/" + encodeURIComponent(name);
  Guide.init({
    app: "fortis", minutes: 8,
    intro: "A walkthrough of a commercial trucking renewal from packet to proposal, then the certificates and changes that fill the rest of the day. Where there's something to click, the tour waits for you.",
    chapterNotes: { "Morning view": "What was handled overnight", "Renewal packet": "Dec page, loss run and client email read", "Applications": "ACORD forms filled, gaps flagged",
      "Markets": "Appetite checked, submissions drafted", "Quotes & proposal": "Quotes compared, proposal, binding", "Service": "Inbox, certificates, changes, claims", "Results": "Hours and cost saved" },
    welcomeTitle: "Welcome to Submission Desk",
    welcomeBody: `<p style="margin-top:0">This is a working sample of a commercial trucking agency where the re-keying is automated: renewal packets read, applications filled, market appetite checked, quotes compared, and certificates issued.</p><p>It runs on real sample documents: a dec page, a loss run, a client's email and three market quotes, each in its own layout. All companies, drivers and figures are fictional.</p>`,
    doneTitle: "That's the walkthrough",
    doneBody: `<p style="margin-top:0">A renewal went from a packet of documents to filled applications, market submissions, a quote comparison and a client proposal, without re-typing a VIN or a driver's date of birth.</p><p>Everything stays clickable. Open <b>Guided demo</b> at the bottom left to replay any chapter.</p>`,
    reset: async () => { frozen = true; clearTimeout(saveT); const who = S.who; await UI.api("PUT", "/api/state/fortis", { who }); try { sessionStorage.clear(); sessionStorage.setItem(SK, JSON.stringify({ who })); sessionStorage.setItem("guide:fortis:welcomed", "1"); } catch (e) { } location.hash = "#/home"; location.reload(); },
    steps: [
      { chapter: "Morning view", route: "#/home", target: '[data-guide="activity"]', place: "right", title: "What the desk handled overnight",
        body: "A renewal packet read, quotes compared, 14 certificates issued, a driver change turned into an endorsement request, and loss runs chased.", why: "Producers start the day with finished work instead of a stack of PDFs." },
      { chapter: "Morning view", route: "#/home", target: '[data-guide="tasks"]', place: "left", title: "Only decisions reach a person",
        body: "The things that need judgment, like a shipper asking for more cargo limit than the policy carries, surface with their deadlines." },

      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/docs", target: "#dDrop", dropzone: "#dDrop", dropButton: "#dSample", doneWhen: '[data-guide="docs-read"]',
        files: [{ name: "Expiring dec page", url: F("Redline_CA_Dec_RTI-CA-448812.pdf"), note: "Redline Transport · 2 pages" }, { name: "Loss run", url: F("Redline_LossRun_BrazosValley_2026-09-01.pdf"), note: "5 years of claims" },
          { name: "Client's email", url: F("Brazos Valley - renewal changes (email).txt"), note: "What changed this year" }],
        title: "A hot shot and flatbed renewal", body: "Brazos Valley renews November 1. The packet is the expiring dec page, a five-year loss run and an email from the office manager. <b>Drag the files onto the drop area.</b>" },
      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/data", target: '[data-guide="vehicles"]', block: "start",
        marks: ['tr[data-vin="1XKWD49X0RJ123456"]', 'tr[data-removed]'],
        source: { type: "text", url: F("Brazos Valley - renewal changes (email).txt"), find: ["2024 Kenworth W900", "1XKWD49X0RJ123456", "$168,000", "2019 Freightliner Cascadia (unit 2)"], caption: "Email from Carla Mendez, office manager", legend: "<i></i> applied to the schedule" },
        title: "The client's email, applied", body: "Carla's email says they bought a Kenworth and sold the Freightliner. The new truck, VIN and value are added to the schedule, and unit 2 is marked removed. Nobody retyped a VIN." },
      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/data", target: '[data-guide="drivers"]', block: "start",
        marks: ['tr[data-driver="Dakota Mills"]', 'tr[data-driver="Luis Carrillo"]'],
        source: { type: "pdf", url: F("Redline_CA_Dec_RTI-CA-448812.pdf"), find: ["Dakota Mills", "05/30/2003"], caption: "Redline_CA_Dec_RTI-CA-448812.pdf · scheduled drivers", legend: "<i></i> flagged driver" },
        title: "Found on page 2 of the dec page", body: "Dakota Mills is 23 with one year of CDL experience. That's flagged before a market sees it. Luis Carrillo, the new driver from Carla's email, is added below." ,
        why: "Surprises from the underwriter are what slow a hard-to-place renewal down." },
      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/data", target: '[data-guide="loss"]', block: "center",
        marks: ['tr[data-claim="RT-26-04471"]'],
        source: { type: "pdf", url: F("Redline_LossRun_BrazosValley_2026-09-01.pdf"), find: ["RT-26-04471", "$31,000", "$45,500", "Open"], caption: "Redline_LossRun_BrazosValley_2026-09-01.pdf", legend: "<i></i> open claim" },
        title: "Every claim, including the open one", body: "Four claims in five years, one still open with $31,000 in reserve. The 28.5% loss ratio is calculated from the premium on each term." },
      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/risk", target: '[data-guide="dot"]', block: "start", wait: 15000,
        marks: ['tr[data-check="power-units"]', '[data-basic="hours-of-service-compliance"]'],
        title: "The DOT record, checked before an underwriter does", body: "The USDOT number from the dec page pulls the FMCSA record. It still counts the Freightliner Carla sold, and hours-of-service sits at the 71st percentile, over the 65% alert line. Both are flagged to fix or explain.",
        why: "Underwriters pull the same record. Explaining it first reads better than being asked." },
      { chapter: "Renewal packet", route: "#/accounts/brazos-valley/risk", target: '[data-guide="drv-review"]', block: "start",
        marks: ['tr[data-driver="Dakota Mills"]', 'tr[data-driver="Ray Holloway"]'],
        title: "Every driver scored the way markets will", body: "Dakota Mills is outside three of the five markets' guidelines, and it says which ones. Ray Holloway drives on a Class C license, so the hot shot weight question is answered up front." },

      { chapter: "Applications", route: "#/accounts/brazos-valley/forms", target: '[data-guide="form"]', block: "start",
        before: () => { const b = document.querySelector('#ft button[data-f="125"]'); if (b && !b.classList.contains("on")) b.click(); },
        marks: ['[data-field="policy-number"] .val', '[data-field="usdot-number"] .val', '[data-field="total-premium"] .val', '[data-field="fein"] .val'],
        source: { type: "pdf", url: F("Redline_CA_Dec_RTI-CA-448812.pdf"), find: ["RTI-CA-448812", "3190552", "$63,380.00"], caption: "Redline_CA_Dec_RTI-CA-448812.pdf", legend: "<i></i> filled into ACORD 125" },
        title: "The application fills itself", body: "The policy number, USDOT number and premium highlighted on the dec page are the ones filled on the ACORD 125. The FEIN wasn't in any document, so it's marked for the client." },
      { chapter: "Applications", route: "#/accounts/brazos-valley/forms", target: '#ft button[data-f="129"]', advance: "click", hint: "Click ACORD 129",
        title: "Open the vehicle schedule", body: "<b>Click ACORD 129</b> to see the vehicle schedule the market will get." },
      { chapter: "Applications", route: "#/accounts/brazos-valley/forms", target: '[data-guide="form"]', block: "start",
        marks: ['tr[data-vin="1XKWD49X0RJ123456"]'],
        source: { type: "text", url: F("Brazos Valley - renewal changes (email).txt"), find: ["2024 Kenworth W900", "1XKWD49X0RJ123456"], caption: "Email from Carla Mendez", legend: "<i></i> now on the ACORD 129" },
        title: "The new truck, already on the form", body: "The Kenworth from Carla's email is on the ACORD 129 with its VIN and value, and the sold Freightliner is gone." },
      { chapter: "Applications", route: "#/accounts/brazos-valley/supp", target: "#suppFill", advance: "click", hint: "Click Answer all 3 supplementals",
        title: "Each market's own supplemental", body: "Northgate, Frontier and Atlas ask the same things in their own words. <b>Click Answer all 3 supplementals.</b>" },
      { chapter: "Applications", route: "#/accounts/brazos-valley/supp", target: '[data-guide="supp"]', block: "start", marks: ["tr[data-need]"],
        title: "Answered from the documents, with the source", body: "13 of 17 answers came from the dec page, the loss run, Carla's email and the FMCSA record, each labeled with where it came from. The highlighted ones only Carla knows, so they go to her in one email." },

      { chapter: "Markets", route: "#/accounts/brazos-valley/markets", target: '[data-guide="markets"]', block: "start",
        marks: ['[data-market="Canyon Mutual Transport"]', '[data-market="Lone Pine Casualty"]'],
        title: "Appetite checked for every market", body: "Driver age and experience, radius, vehicle age, commodities and open losses, checked against each market's guidelines. The two highlighted markets would decline, so they aren't sent." },
      { chapter: "Markets", route: "#/accounts/brazos-valley/markets", target: "[data-sub]", advance: "click", hint: "Click Review submission",
        title: "Review a submission", body: "<b>Click Review submission</b> on Northgate Specialty." },
      { chapter: "Markets", target: ".modal", title: "Written and attached in the market's format",
        body: "The cover email summarizes the risk the way an underwriter reads it, with the applications and loss runs attached. Review and send." },

      { chapter: "Quotes & proposal", route: "#/accounts/brazos-valley/quotes", target: "#qDrop", dropzone: "#qDrop", dropButton: "#qSample", doneWhen: '[data-guide="qcmp"]',
        files: DATA.quotes.map((f, k) => ({ name: ["Northgate Specialty", "Frontier Commercial Auto", "Atlas Truckers Program"][k], url: F(f), note: ["E&S quote", "Admitted quote", "Program indication"][k] })),
        title: "Three quotes came back", body: "An E&S quote, an admitted quote and a program indication, each laid out differently. <b>Drag them onto the drop area.</b>" },
      { chapter: "Quotes & proposal", route: "#/accounts/brazos-valley/quotes", target: '[data-guide="qcmp"]', block: "start",
        marks: ['tr[data-sect="physical-damage"][data-row="deductible"] td[data-col="Frontier Commercial Auto"]', 'tr[data-row="subjectivities"] td[data-col="Frontier Commercial Auto"]', 'tr[data-row="total-cost"] td[data-col="Frontier Commercial Auto"]'],
        source: { type: "pdf", url: F("Frontier Commercial Auto quote FCA-77120.pdf"), find: ["Exclude driver Dakota Mills", "$5,000", "$60,620.00"], caption: "Frontier Commercial Auto quote FCA-77120.pdf", legend: "<i></i> the catch" },
        title: "The cheapest quote has a catch", body: "Frontier is lowest at $60,620, but its PDF excludes Dakota Mills and doubles the physical damage deductible. Those lines are highlighted in the comparison, so the catch is on screen instead of in the fine print.",
        why: "An excluded driver in an accident is an uncovered claim." },
      { chapter: "Quotes & proposal", route: "#/accounts/brazos-valley/proposal", target: ".report", block: "start",
        title: "The client proposal", body: "What changed, every option, the recommendation and what's needed to bind, ready to download or send." },
      { chapter: "Quotes & proposal", route: "#/accounts/brazos-valley/bind", target: "#bindRun", advance: "click", hint: "Click Start binding",
        title: "Carla signed. Bind it", body: "Binding is a checklist: signatures, down payment, subjectivities, the MCS-90, federal and Texas filings, certificates. <b>Click Start binding.</b>" },
      { chapter: "Quotes & proposal", route: "#/accounts/brazos-valley/bind", target: '[data-guide="bind-check"]', wait: 25000, block: "start", marks: ["tr[data-issue]"],
        title: "The issued policy has a typo", body: "When the policy comes back it's checked line by line against the quote. Two digits of the Kenworth's VIN are swapped, so the correction request is already written.",
        why: "A wrong VIN on the schedule can hold up a physical damage claim on that truck." },

      { chapter: "Service", route: "#/inbox", target: "#sortInbox", advance: "click", hint: "Click Sort inbox",
        title: "The shared inbox", body: "Seven emails came in overnight: a certificate request, a driver change, an accident, an underwriter question, a new lead, a billing question and loss runs. <b>Click Sort inbox.</b>" },
      { chapter: "Service", route: "#/inbox", target: '[data-guide="inbox"]', wait: 15000, block: "start", marks: [".mail-res .btn.primary"],
        title: "Read, sorted and routed", body: "Each email is typed, prioritized, matched to its account and its details pulled out. The highlighted buttons open the screen that finishes each one; replies are drafted and the loss runs are filed to Midnight Tow." },
      { chapter: "Service", route: "#/certificates/1", target: '[data-guide="coi-check"]', place: "left",
        title: "Certificate requests, checked", body: "A freight broker needs a certificate for carrier setup. Its requirements, $1M liability and $100K cargo, are checked against the active policy first." },
      { chapter: "Service", route: "#/certificates/1", target: "#issue", advance: "click", hint: "Click Issue and send",
        title: "Issue it", body: "The certificate below is already filled with the right holder and wording. <b>Click Issue and send.</b>" },
      { chapter: "Service", route: "#/certificates/2", target: '[data-guide="coi-gap"]',
        title: "It won't issue a wrong certificate", body: "This shipper wants $250,000 of cargo; the policy carries $100,000. Instead of a certificate, you get a quote request for the higher limit and a note to the insured." },
      { chapter: "Service", route: "#/requests/1", target: '[data-guide="req-main"]', block: "start",
        markText: [{ in: '[data-guide="req-body"]', find: ["Andre Wallace", "Monday 9/21", "DOB 2/11/98", "Texas license"] }],
        marks: ['dd[data-field="Driver"]', 'dd[data-field="DOB"]', 'dd[data-field="License"]', 'dd[data-field="Start date"]'],
        title: "A driver change from an email", body: "The highlighted words in Hector's email become the highlighted fields. The MVR is ordered and the endorsement request to Frontier is drafted." },
      { chapter: "Service", route: "#/claims", target: "#buildClaim", advance: "click", hint: "Click Build loss notice",
        title: "An accident at a tow scene", body: "Rosa at Midnight Tow emailed: the wrecker backed into a car this morning. <b>Click Build loss notice.</b>" },
      { chapter: "Service", route: "#/claims", target: '[data-guide="claim-notes"]', wait: 15000, block: "start", marks: ['[data-guide="claim-notes"] .alert.warn'],
        title: "The loss notice, and the catch", body: "The ACORD 2 is filled from Rosa's email and the policy, and the coverage questions are answered. It also notices the wrecker was bought yesterday and the request to add it hasn't gone to Frontier.",
        why: "Catching that today is the difference between a routine claim and a coverage fight." },
      { chapter: "Service", route: "#/renewals", target: '[data-guide="renewals"]', block: "start",
        title: "Every X-date worked backward", body: "Loss runs requested at 120 days, applications at 90, submissions at 60, proposals at 30, for every account." },
      { chapter: "Service", route: "#/missing/brazos-valley", target: '[data-guide="owed"]', block: "start",
        title: "Everything clients still owe, in one list", body: "The questions from the supplementals, Northgate's email and the claim land here. Each client gets one email saying why each item matters, and a reminder every 3 days until it's in." },
      { chapter: "Results", route: "#/savings", target: '[data-guide="savings"]', block: "start",
        title: "What it's worth each month", body: "Minutes by hand against minutes with the desk, times how often each task happens. Change the counts and hourly cost to match your office; the top bar shows what this session saved." },
    ],
  });

  /* ================= sign in ================= */
  function enter(u) {
    S.who = u; document.body.dataset.authed = "1"; $("#login").classList.add("hide"); $("#shell").classList.remove("hide");
    $("#me").innerHTML = `<div class="avatar s">${UI.initials(u.name)}</div><div>${u.name}<small>${u.role}</small></div><button id="out" data-tip="Sign out and clear this demo session">Sign out</button>`;
    $("#out").onclick = async () => { frozen = true; clearTimeout(saveT); await UI.api("POST", "/api/reset/fortis"); try { sessionStorage.clear(); } catch (e) { } location.hash = ""; location.reload(); };
  }
  let who = DATA.users[0];
  $("#users").innerHTML = DATA.users.map((u, i) => `<button type="button" class="user-opt" data-u="${i}" aria-pressed="${i === 0}"><div class="avatar s">${UI.initials(u.name)}</div><div><b>${u.name}</b><span>${u.role}</span></div></button>`).join("");
  $$("[data-u]").forEach(b => b.onclick = () => { who = DATA.users[+b.dataset.u]; $$("[data-u]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#email").value = who.email; });
  $("#loginForm").onsubmit = e => { e.preventDefault(); enter(who); if (!location.hash || location.hash === "#") location.hash = "#/home"; render(); Guide.afterLogin(); };
  (async () => {
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem(SK) || "null"); } catch (e) { }
  const remote = await UI.api("GET", "/api/state/fortis"); UI.setBackend(!!remote);
  if (!saved && remote && remote.who) saved = remote;
  if (saved && saved.who) {
    enter(saved.who); view().innerHTML = `<div class="empty" style="padding:80px">${icon("refresh")}<p><b>Restoring your session…</b></p></div>`;
    restore(saved).catch(() => toast("Some sample files could not be reloaded", "warn")).finally(() => { render(); Guide.afterLogin({ restored: true }); });
  }
  })();
})();
