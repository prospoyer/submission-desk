/* Submission Desk, part 2: risk review, supplementals, bind and filings, the shared inbox, submissions tracker,
   claims intake, missing information, ask the file and time saved. Uses the account state app.js shares on window.SD. */
(() => {
  const { $, $$, esc, money, pct, icon, toast, route, go, render, sleep } = UI;
  const SD = window.SD, S = SD.S, T = UI.tip, I = UI.info;
  const X = () => S.x;
  const { card, head, setPage } = SD;
  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const slug = UI.slug;
  const short = n => n.replace(/ (Specialty Insurance|Specialty|Commercial Auto|Truckers Program|Transport|Casualty|Insurance)$/, "");
  const LVL = { ok: "Clear", info: "Note", warn: "Review", crit: "Exclude" };

  /* ---------- writing helpers ---------- */
  const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split("\n").map(l => /^- /.test(l) ? `<li>${l.slice(2)}</li>` : l.trim() ? `<p>${l}</p>` : "").join("").replace(/(<li>.*?<\/li>)+/g, s => `<ul>${s}</ul>`);
  async function typeOut(el, text) {
    if (!el) return; el.classList.add("typing"); const parts = text.split(/(\s+)/); let out = "";
    for (let i = 0; i < parts.length; i++) { out += parts[i]; if (i % 6 === 0) { el.innerHTML = md(out); await sleep(12); } }
    el.innerHTML = md(text); el.classList.remove("typing");
  }
  const draftBox = (id, key, text, empty) => `<div class="draft" id="${id}">${X().notes?.[key] ? md(text) : `<p class="muted" style="margin:0">${empty}</p>`}</div>`;
  async function writeNote(id, key, text) { (X().notes ||= {})[key] = true; SD.save(); await typeOut($("#" + id), text); }

  /* ================= time saved ================= */
  const TASKS = [
    ["packet", "Read a renewal packet into the file", 95, 4, 20],
    ["risk", "DOT record, driver and loss review", 45, 4, 20],
    ["forms", "Fill ACORD 125, 127, 129 and cargo", 60, 5, 20],
    ["supp", "Answer carrier supplementals", 75, 6, 20],
    ["submit", "Write and send a market submission", 25, 3, 60],
    ["quotes", "Spread and compare quotes", 45, 4, 20],
    ["proposal", "Write the client proposal", 45, 5, 15],
    ["bind", "Bind, filings and issued-policy check", 40, 8, 12],
    ["coi", "Issue a certificate", 12, 1, 150],
    ["change", "Turn a change email into a carrier request", 20, 3, 50],
    ["claim", "Build a loss notice", 30, 4, 6],
    ["inbox", "Sort and route an email", 3, 0.3, 600],
    ["chase", "Chase missing information", 15, 1, 40],
    ["ask", "Look up an answer in a client file", 8, 0.5, 60],
  ];
  const fmtM = m => m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")} m`;
  function credit(id, key = id, times = 1) {
    const t = TASKS.find(x => x[0] === id); if (!t) return;
    const c = (X().credited ||= {}); if (c[key]) return; c[key] = { id, times, at: now() };
    X().saved = (X().saved || 0) + (t[2] - t[3]) * times; pill(true); SD.save();
  }
  function pill(bump) {
    if (!document.body.dataset.authed) return;
    let el = $("#savedPill");
    if (!el) { const s = $(".topbar .search"); if (!s) return; el = document.createElement("a"); el.id = "savedPill"; el.className = "saved-pill"; el.href = "#/savings";
      el.dataset.tip = "Time the desk saved in this session, from how long each task takes by hand. Click for the monthly view."; s.before(el); }
    const m = Math.round(X().saved || 0);
    el.innerHTML = `${icon("clock")}<b>${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m</b><span>saved this session</span>`;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  SD.credit = credit; SD.afterNav = () => pill();

  route("/savings", () => {
    const counts = X().roi || {}, hourly = X().hourly ?? 32;
    const rows = TASKS.map(t => { const f = counts[t[0]] ?? t[4]; return { t, f, saved: (t[2] - t[3]) * f }; });
    const min = rows.reduce((s, r) => s + r.saved, 0), hrs = min / 60, max = Math.max(...rows.map(r => r.saved));
    const cr = Object.values(X().credited || {});
    setPage([["Time & cost saved"]], `${head("Time & cost saved", "Minutes each task takes by hand against minutes with the desk, times how often it happens in a month.")}
      <div class="grid g4" style="margin-bottom:16px" data-guide="savings-kpi">
        <div class="card kpi"><div class="l">${icon("clock")} Hours saved each month</div><div class="v">${Math.round(hrs).toLocaleString()}</div><div class="d">about ${(hrs / 160).toFixed(1)} full-time staff</div></div>
        <div class="card kpi"><div class="l">${icon("dollar")} Staff cost saved each month</div><div class="v">${money(hrs * hourly)}</div><div class="d">at ${money(hourly)} an hour</div></div>
        <div class="card kpi"><div class="l">${icon("chart")} Staff cost saved each year</div><div class="v">${money(hrs * hourly * 12)}</div><div class="d">same team, more accounts</div></div>
        <div class="card kpi"><div class="l">${icon("zap")} Saved in this session</div><div class="v">${fmtM(X().saved || 0)}</div><div class="d">${cr.length} task${cr.length === 1 ? "" : "s"} done in the demo</div></div>
      </div>
      <div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 300px">
        <div data-guide="savings">${card("Per task", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Task</th><th class="num">By hand</th><th class="num">With the desk</th><th class="num">${T("Times a month", "Change these to match the office")}</th><th class="num">Hours saved</th><th style="width:80px"></th></tr></thead><tbody>
          ${rows.map(r => `<tr><td style="min-width:220px">${r.t[1]}</td><td class="num">${fmtM(r.t[2])}</td><td class="num">${r.t[3] < 1 ? Math.round(r.t[3] * 60) + " sec" : fmtM(r.t[3])}</td><td class="num"><input class="input num" style="width:78px;padding:4px 8px" type="number" min="0" data-cnt="${r.t[0]}" value="${r.f}" aria-label="${r.t[1]} per month"></td><td class="num strong">${(r.saved / 60).toFixed(1)}</td><td><div class="progress ok"><i style="width:${max ? r.saved / max * 100 : 0}%"></i></div></td></tr>`).join("")}
          </tbody><tfoot><tr><td>Total</td><td></td><td></td><td></td><td class="num">${hrs.toFixed(1)}</td><td></td></tr></tfoot></table></div>`, { tight: true, sub: "starting estimates for a trucking agency" })}</div>
        <div class="stack">
          ${card("Your numbers", `<div class="field"><label>Loaded staff cost per hour ($)</label><input class="input" type="number" min="1" id="hourly" value="${hourly}"></div><p class="muted" style="font-size:12.5px;margin:0">Change the monthly counts in the table too. Everything recalculates.</p>`)}
          ${card("This session", cr.length ? cr.map(c => { const t = TASKS.find(x => x[0] === c.id); return `<div class="list-item" style="padding:9px 14px"><div class="li-ic ok">${icon("check")}</div><div class="li-b"><b>${t[1]}</b><p>${fmtM((t[2] - t[3]) * c.times)} saved</p></div><div class="li-t">${c.at}</div></div>`; }).join("") : `<div class="empty" style="padding:22px">${icon("clock")}<p>Nothing done yet. Work through a renewal and it adds up here.</p></div>`, { tight: true })}
        </div></div>`);
    $$("[data-cnt]").forEach(inp => inp.onchange = () => { (X().roi ||= {})[inp.dataset.cnt] = Math.max(0, +inp.value || 0); SD.save(); render(); });
    $("#hourly").onchange = e => { X().hourly = Math.max(1, +e.target.value || 1); SD.save(); render(); };
  });

  /* ================= risk review: FMCSA record, drivers, losses ================= */
  const FMCSA = { status: "Authorized for property", mcs150: "02/08/2025", mileage: "412,000 (2024)", units: 4, drivers: 5, rating: "Not rated",
    inspections: 14, vehOOS: 18.6, vehNat: 22.3, drvOOS: 4.1, drvNat: 6.7,
    basics: [["Unsafe driving", 38, 65], ["Hours-of-service compliance", 71, 65], ["Vehicle maintenance", 44, 80], ["Controlled substances / alcohol", 0, 80], ["Driver fitness", 0, 80]] };
  const MVR = { "Tyler Brandt": ["1 minor: speeding 6 to 10 over (03/2025)", "info"], "Dakota Mills": ["Clean, licensed 1 year", "ok"] };
  function dotRows(m) {
    const pu = m.vehicles.filter(v => !/trailer/i.test(v.type)).length;
    return [
      ["operating-status", "Operating status", "For-hire carrier", FMCSA.status, "ok", "Interstate authority already covers the new Oklahoma and New Mexico runs."],
      ["power-units", "Power units", `${pu} on the renewal schedule`, `${FMCSA.units} on the MCS-150`, pu === FMCSA.units ? "ok" : "warn", "FMCSA still counts the Freightliner sold 9/5. Update the MCS-150 so it matches the schedule underwriters see."],
      ["drivers", "Drivers", `${m.drivers.length} on the renewal`, `${FMCSA.drivers} on the MCS-150`, m.drivers.length === FMCSA.drivers ? "ok" : "info", "Luis Carrillo starts 10/1. Add him in the same MCS-150 update."],
      ["mcs-150", "MCS-150 last filed", "Every 2 years", `${FMCSA.mcs150} · ${FMCSA.mileage} miles`, "ok", "Next biennial update is due February 2027 (USDOT ends in 52: odd years, February)."],
      ["insurance-filing", "Liability filing", "$750,000 required", "$1,000,000 on file (BMC-91X)", "ok", "The new carrier files its own BMC-91X at binding."],
      ["safety-rating", "Safety rating", "", FMCSA.rating, "info", "No compliance review on record. Most markets treat this as neutral."],
      ["out-of-service", "Out-of-service rates, 24 months", `${FMCSA.inspections} inspections`, `Vehicle ${FMCSA.vehOOS}% · driver ${FMCSA.drvOOS}%`, "ok", `Both under the national averages (${FMCSA.vehNat}% and ${FMCSA.drvNat}%). Worth saying in the submission.`],
    ];
  }
  function driverReview(m) {
    return m.drivers.map(d => {
      const outside = DATA.markets.filter(mk => d.age < mk.minAge || d.exp < mk.minExp);
      const mv = X().mvr ? (MVR[d.name] || ["Clean", "ok"]) : null;
      const notes = []; let lvl = "ok";
      const up = l => { const r = { ok: 0, info: 1, warn: 2, crit: 3 }; if (r[l] > r[lvl]) lvl = l; };
      if (outside.length) { notes.push(`${outside.map(mk => `${short(mk.name)} ${mk.conditional ? "would exclude" : "declines"}`).join(", ")} (age ${d.age}, ${d.exp} yr CDL)`); up(outside.length >= 2 ? "warn" : "info"); }
      if (/class c/i.test(d.cls)) { notes.push("Non-CDL: confirm he only drives hot shot combinations under 26,001 lb"); up("info"); }
      if (d.isNew) { notes.push(`New hire, starts ${d.hired}`); up("info"); }
      if (mv && mv[1] !== "ok") up(mv[1]);
      return { d, lvl, notes, mv };
    });
  }
  function risk() {
    const m = SD.merged(), L = S.loss, dr = driverReview(m);
    if (!X().dot) {
      $("#aBody").innerHTML = `<div class="card"><div class="card-h"><h3>Checking USDOT ${esc(m.dot)}</h3></div><div class="card-b"><div id="dotRun"></div></div></div>`;
      UI.runSteps($("#dotRun"), [[`Pulling the FMCSA record for USDOT ${esc(m.dot)}`, async () => ({ detail: "SAFER and SMS" })], ["Comparing units and drivers with the renewal schedule", async () => ({ detail: `${m.vehicles.length} units · ${m.drivers.length} drivers` })],
        ["Reading BASIC percentiles and out-of-service rates", async () => ({ detail: "5 BASICs" })], ["Scoring drivers against each market's guidelines", async () => ({ detail: `${DATA.markets.length} markets` })]], 420)
        .then(() => { X().dot = true; credit("risk"); SD.save(); if (location.hash.endsWith("/risk")) risk(); });
      return;
    }
    const rows = dotRows(m), fix = rows.filter(r => r[4] === "warn").length + FMCSA.basics.filter(b => b[1] >= b[2]).length;
    const terms = L?.terms || [], maxT = Math.max(1, ...terms.map(t => Math.max(t.premium, t.incurred)));
    const last3 = terms.slice(-3), lr3 = last3.reduce((s, t) => s + t.incurred, 0) / Math.max(1, last3.reduce((s, t) => s + t.premium, 0));
    const prior = terms.slice(0, -1), lrPrior = prior.reduce((s, t) => s + t.incurred, 0) / Math.max(1, prior.reduce((s, t) => s + t.premium, 0));
    $("#aBody").innerHTML = `
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><div class="l">${icon("alert")} FMCSA items to fix or explain</div><div class="v">${fix}</div><div class="d">before the submission goes out</div></div>
        <div class="card kpi"><div class="l">${icon("users")} Drivers to review</div><div class="v">${dr.filter(x => x.lvl === "warn" || x.lvl === "crit").length}</div><div class="d">${dr.filter(x => x.lvl === "info").length} with a note</div></div>
        <div class="card kpi"><div class="l">5-year loss ratio ${I("Incurred losses divided by earned premium, all five terms on the loss run")}</div><div class="v">${L ? (L.lossRatio * 100).toFixed(1) + "%" : "—"}</div><div class="d">${L ? `${L.claims.length} claims · ${money(L.incurred)} incurred` : ""}</div></div>
        <div class="card kpi"><div class="l">3-year loss ratio ${I("The last three terms. Many markets weight these most.")}</div><div class="v">${(lr3 * 100).toFixed(1)}%</div><div class="d">prior 4 terms ${(lrPrior * 100).toFixed(1)}%</div></div>
      </div>
      <div class="grid g-main-l" style="margin-bottom:16px" data-guide="dot">
        ${card(`FMCSA record · USDOT ${esc(m.dot)}`, `<div class="tbl-wrap"><table class="t"><thead><tr><th>Check</th><th>Renewal</th><th>FMCSA record</th><th>Result</th></tr></thead><tbody>
          ${rows.map(r => `<tr data-check="${r[0]}" class="${r[4] === "warn" ? "bad" : ""}"><td><b>${r[1]}</b><div class="muted" style="font-size:12px;white-space:normal;max-width:340px">${esc(r[5])}</div></td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td><span class="chip ${r[4]}">${{ ok: "Matches", warn: "Fix", info: "Note" }[r[4]]}</span></td></tr>`).join("")}
          </tbody></table></div>`, { tight: true, sub: "sample record for this demo; live version reads SAFER and SMS" })}
        ${card(`BASIC percentiles ${I("FMCSA's Safety Measurement System. At or over the threshold, FMCSA marks the carrier for intervention and underwriters ask about it.")}`, FMCSA.basics.map(([n, v, th]) => `<div data-basic="${slug(n)}" style="padding:8px 0;border-bottom:1px solid var(--line-2)"><div class="row"><b style="font-size:13px">${n}</b><span class="spacer"></span>${v >= th ? `<span class="chip crit">Alert · ${v}%</span>` : `<span class="muted" style="font-size:12.5px">${v}%</span>`}</div>
            <div class="basic-bar"><i style="width:${v}%" class="${v >= th ? "over" : ""}"></i><s style="left:${th}%" title="Threshold ${th}%"></s></div><div class="muted" style="font-size:11.5px">threshold ${th}%</div></div>`).join("") +
          `<div class="alert warn" style="margin-top:12px">${icon("alert")}<div><b>Hours-of-service is over the line.</b> Put the ELD provider and the logbook audit process in the submission before an underwriter asks.</div></div>`)}
      </div>
      <div data-guide="drv-review" style="margin-bottom:16px">${card("Drivers, scored the way markets will", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Driver</th><th class="num">Age</th><th class="num">Yrs CDL</th><th>License</th><th>${T("MVR", "Motor vehicle record from the state. Ordered with the driver's consent.")}</th><th>What underwriters will see</th><th>Result</th></tr></thead><tbody>
          ${dr.map(x => `<tr data-driver="${esc(x.d.name)}" class="${x.lvl === "warn" || x.lvl === "crit" ? "bad" : ""}"><td class="nowrap"><b>${esc(x.d.name)}</b>${x.d.isNew ? ' <span class="chip accent plain">New</span>' : ""}</td><td class="num">${x.d.age}</td><td class="num">${x.d.exp}</td><td class="nowrap">${x.d.state} ${esc(x.d.cls)}</td><td class="nowrap">${x.mv ? `<span class="chip ${x.mv[1]} plain">${esc(x.mv[0])}</span>` : '<span class="muted">Not ordered</span>'}</td><td style="white-space:normal;min-width:220px;font-size:13px">${x.notes.length ? x.notes.map(esc).join("<br>") : '<span class="muted">Inside every market\'s guidelines</span>'}</td><td><span class="chip ${x.lvl}">${LVL[x.lvl]}</span></td></tr>`).join("")}
          </tbody></table></div>`, { tight: true, actions: X().mvr ? '<span class="chip ok">MVRs in</span>' : `<button class="btn sm" id="mvrRun">${icon("search")}Order MVRs</button>`,
          foot: `<button class="btn sm primary" id="drvNote">${icon("spark")}Write driver note for underwriters</button><span class="muted" style="font-size:12.5px">Goes in every submission</span>` })}
          <div id="mvrSteps" style="margin-top:10px"></div></div>
      <div class="grid g2" style="margin-bottom:16px;align-items:start">
        ${card("Driver note", draftBox("drvOut", "drv", driverNote(m, dr), "A short note on each flagged driver, written for the underwriter."))}
        ${card("Loss trend", `${terms.map(t => `<div style="margin-bottom:10px"><div class="row" style="font-size:12.5px"><b>${t.term}</b><span class="spacer"></span><span class="muted">${money(t.incurred)} of ${money(t.premium)} · ${(t.incurred / t.premium * 100).toFixed(1)}%</span></div>
            <div class="progress" style="margin-top:3px"><i style="width:${t.premium / maxT * 100}%"></i></div><div class="progress crit" style="margin-top:2px"><i style="width:${t.incurred / maxT * 100}%"></i></div></div>`).join("")}
          <p class="muted" style="font-size:12px;margin:4px 0 0">Blue is earned premium, red is incurred. Open reserves ${money(L ? L.open.reduce((s, c) => s + c.reserve, 0) : 0)}.</p>`,
          { foot: `<button class="btn sm primary" id="lossNote">${icon("spark")}Write loss summary</button>` })}
      
      </div>
      ${card("Loss summary for underwriters", draftBox("lossOut", "loss", lossNote(m, L, lrPrior), "Each claim in one line, the open reserve, and how the trend reads without the open claim."))}`;
    $("#drvNote").onclick = () => writeNote("drvOut", "drv", driverNote(m, driverReview(m)));
    $("#lossNote").onclick = () => writeNote("lossOut", "loss", lossNote(m, L, lrPrior));
    const mb = $("#mvrRun"); if (mb) mb.onclick = async () => { mb.disabled = true;
      await UI.runSteps($("#mvrSteps"), m.drivers.map(d => [`MVR for ${esc(d.name)} (${d.state})`, async () => ({ detail: (MVR[d.name] || ["Clean"])[0] })]), 260);
      X().mvr = true; SD.save(); toast(`${m.drivers.length} MVRs in · 1 minor violation`); risk(); };
  }
  const driverNote = (m, dr) => `**Drivers, ${m.insured}**\n` + dr.filter(x => x.lvl !== "ok").map(x => `- **${x.d.name}** (${x.d.age}, ${x.d.exp} yr ${x.d.cls}): ${[...x.notes, ...(x.mv && x.mv[1] !== "ok" ? [`MVR shows ${x.mv[0]}`] : [])].join("; ")}.`).join("\n") +
    `\n- The other ${dr.filter(x => x.lvl === "ok").length} drivers average ${Math.round(dr.filter(x => x.lvl === "ok").reduce((s, x) => s + x.d.exp, 0) / Math.max(1, dr.filter(x => x.lvl === "ok").length))} years of experience${X().mvr ? " with clean MVRs" : ""}.\n\nPlease quote with every driver listed. If a named exclusion is a condition, quote it both ways so the insured can choose.`;
  const lossNote = (m, L, lrPrior) => !L ? "" : `**Loss history, ${m.insured}**\nFive-year loss ratio **${(L.lossRatio * 100).toFixed(1)}%** on ${money(L.premium)} earned premium, ${L.claims.length} claims, valued ${L.valued}.\n` +
    L.claims.map(c => `- ${c.date}, ${c.coverage.toLowerCase()}: ${c.desc}. ${money(c.incurred)} incurred${c.reserve ? ` (${money(c.paid)} paid, ${money(c.reserve)} reserve)` : ""}, ${c.status.toLowerCase()}.`).join("\n") +
    `\n\nWithout the open I-35 claim, the four prior terms ran ${(lrPrior * 100).toFixed(1)}%. No cargo losses since the 2024 load shift. We're confirming with the insured what changed after the sideswipe and will send it before you quote.`;

  /* ================= carrier supplementals ================= */
  const SUPP = [
    ["radius", ["Radius of operations (% by band)", "What percentage of miles are local, intermediate and long haul?", "Operating radius"], m => `${m.radius}; about ${S.chg?.statesPct || 0}% of runs go into ${(S.chg?.states || []).join(" and ")}`, "Dec page + Carla's email"],
    ["states", ["States of operation", "List every state you travel in", "States entered in the last 12 months"], m => m.states.join(", "), "Carla's email"],
    ["commodities", ["Commodities hauled (% of loads)", "Describe all cargo hauled, with percentages", "Commodity breakdown"], m => m.commodities.map(c => `${c.name} ${c.pct}%`).join(", "), "Dec page"],
    ["max-load", ["Maximum value on any one load", "Highest-value load in the past year", "Max load value"], m => { const c = [...m.commodities].sort((a, b) => b.maxLoad - a.maxLoad)[0]; return `${money(c.maxLoad)} (${c.name.toLowerCase()})`; }, "Dec page"],
    ["trailers", ["Trailer types and count", "List all trailers pulled", "Trailer schedule"], m => Object.entries(m.vehicles.filter(v => /trailer/i.test(v.type)).reduce((o, v) => (o[v.type] = (o[v.type] || 0) + 1, o), {})).map(([k, n]) => `${n} ${k.toLowerCase()}${n > 1 ? "s" : ""}`).join(", "), "Dec page schedule"],
    ["hazmat", ["Any hazardous materials?", "Do you haul placarded loads?", "Hazmat hauled (Y/N)"], () => "No. No hazardous commodities listed", "Dec page"],
    ["owner-operators", ["Owner-operators or leased units?", "Do you use leased-on owner-operators?", "Independent contractors"], m => `None. All ${m.vehicles.filter(v => !/trailer/i.test(v.type)).length} power units are owned and scheduled`, "Dec page"],
    ["drivers", ["Number of drivers and youngest driver", "Driver count and minimum experience", "Driver roster summary"], m => { const y = [...m.drivers].sort((a, b) => a.age - b.age)[0]; return `${m.drivers.length} drivers; youngest ${y.age} with ${y.exp} year of CDL experience`; }, "Dec page + Carla's email"],
    ["non-cdl", ["Non-CDL drivers operating hot shot units?", "Any drivers without a CDL?", "Class C drivers"], m => m.drivers.filter(d => /class c/i.test(d.cls)).map(d => `Yes: ${d.name} (Class C, ${d.exp} years)`).join("; ") || "No", "Dec page"],
    ["losses", ["Losses, last 5 years", "Describe all claims in the last 5 years", "Prior losses"], () => S.loss ? `${S.loss.claims.length} claims, ${money(S.loss.incurred)} incurred, ${S.loss.open.length} open` : "", "Loss run"],
    ["basics", ["Current CSA BASIC percentiles", "Any BASIC over the intervention threshold?", "SMS scores"], () => "Hours-of-service 71st percentile (over the 65% threshold); all others under", "FMCSA record"],
    ["out-of-service", ["Out-of-service rates", "Roadside inspection results, last 24 months", "OOS % vs national"], () => `Vehicle ${FMCSA.vehOOS}%, driver ${FMCSA.drvOOS}% (national ${FMCSA.vehNat}% and ${FMCSA.drvNat}%)`, "FMCSA record"],
    ["years", ["Years in business", "Date operating authority was granted", "Years under current ownership"], m => m.since, "Dec page"],
    ["securement", ["Cargo securement method", "How are loads secured (chains, straps, edge protection)?", "Securement procedure"], null, ""],
    ["eld", ["ELD provider", "Electronic logging device in use", "Telematics / ELD vendor"], () => X().owed?.["brazos-valley"]?.cameras === "received" ? "Motive, all power units" : null, "Carla's reply"],
    ["cameras", ["Dash cameras installed?", "Forward-facing or driver-facing cameras?", "In-cab video"], () => X().owed?.["brazos-valley"]?.cameras === "received" ? "Forward-facing on both tractors" : null, "Carla's reply"],
    ["safety-program", ["Written safety program?", "Describe safety meetings and driver training", "Safety program details"], null, ""],
  ];
  function supp() {
    const m = SD.merged();
    const mk = DATA.markets.map(x => ({ x, r: SD.marketCheck(x, m) })).filter(o => o.r.status !== "Declines").map(o => o.x.name);
    const cur = mk.includes(X().suppMkt) ? X().suppMkt : mk[0], vi = Math.max(0, mk.indexOf(cur)) % 3, done = !!X().supp;
    const ans = SUPP.map(q => ({ q, v: q[2] ? q[2](m) : null }));
    const need = ans.filter(a => !a.v).length;
    $("#aBody").innerHTML = `<div class="row" style="margin-bottom:14px"><div class="seg" id="suppSeg">${mk.map(n => `<button data-m="${esc(n)}" class="${n === cur ? "on" : ""}">${esc(short(n))}</button>`).join("")}</div>
        <span class="muted" style="font-size:12.5px">${mk.length} markets in appetite · each words its questions differently</span><span class="spacer"></span>
        <button class="btn ${done ? "" : "primary"}" id="suppFill">${icon("spark")}${done ? "Answer again" : `Answer all ${mk.length} supplementals`}</button></div>
      <div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 300px">
        <div data-guide="supp">${card(`${esc(cur)} · trucking supplemental`, `<div class="tbl-wrap"><table class="t ${X().suppAnim ? "fill-in" : ""}"><thead><tr><th>#</th><th>Their question</th><th>Answer</th><th>From</th></tr></thead><tbody>
          ${ans.map((a, i) => `<tr ${done && !a.v ? "data-need" : ""} class="${done && !a.v ? "bad" : ""}"><td class="muted">${i + 1}</td><td style="white-space:normal;min-width:200px">${a.q[1][vi]}</td>
            <td class="ans" style="white-space:normal;animation-delay:${i * 45}ms">${!done ? '<span class="muted">—</span>' : a.v ? esc(a.v) : '<span class="chip warn">Needs Carla</span>'}</td><td class="ans" style="animation-delay:${i * 45}ms">${done ? (a.v ? `<span class="src" style="margin:0">${a.q[3]}</span>` : '<span class="muted" style="font-size:12px">Added to missing info</span>') : ""}</td></tr>`).join("")}
          </tbody></table></div>`, { tight: true })}</div>
        <div class="stack">
          ${card("Status", done ? `<div class="kpi" style="padding:0"><div class="v">${SUPP.length - need} of ${SUPP.length}</div><div class="d">answered on all ${mk.length} supplementals</div></div><div class="progress ${need ? "warn" : "ok"}" style="margin:12px 0"><i style="width:${(SUPP.length - need) / SUPP.length * 100}%"></i></div>
            <p class="muted" style="font-size:12.5px;margin:0">${need ? `${need} answers only the client has. They go to Carla in one email.` : "Every question answered."}</p>` : `<p class="muted" style="margin:0">Not answered yet. One set of answers fills every market's version.</p>`,
            { foot: done && need ? `<a class="btn sm primary" href="#/missing/brazos-valley">${icon("mail")}Ask Carla for ${need}</a>` : "" })}
          ${card("Where answers come from", `<div class="steps">${["Dec page: operations, units, drivers, commodities", "Loss run: claims and reserves", "Carla's email: new states, the new truck and driver", "FMCSA record: BASICs and inspections", "Client replies, once they come in"].map(t => `<div class="step done"><span class="s-ic"></span><span>${t}</span></div>`).join("")}</div>`)}
          <a class="btn primary" style="justify-content:center" href="#/accounts/brazos-valley/markets">${icon("arrow")}Choose markets</a>
        </div></div>`;
    X().suppAnim = false;
    $$("#suppSeg button").forEach(b => b.onclick = () => { X().suppMkt = b.dataset.m; SD.save(); supp(); });
    $("#suppFill").onclick = () => { X().supp = true; X().suppAnim = true; credit("supp", "supp", 1); SD.save(); toast(`${mk.length} supplementals answered · ${need} questions for Carla`); supp(); };
  }

  /* ================= bind & filings ================= */
  function bind() {
    if (!S.quotes.length) { $("#aBody").innerHTML = `<div class="card"><div class="empty">${icon("check")}<p><b>Binding opens once quotes are in and one is recommended.</b></p><a class="btn primary" href="#/accounts/brazos-valley/quotes">Go to quotes</a></div></div>`; return; }
    SD.quotesIfNeeded();
    const m = SD.merged(), rec = S.quotes.find(q => q.market === S.recommend) || S.quotes[0], es = rec.type === "E&S";
    const declined = DATA.markets.filter(mk => SD.marketCheck(mk, m).status === "Declines").map(mk => short(mk.name));
    const items = [
      ["Applications signed and FEIN received from Carla Mendez", "client"], [`Down payment received: ${money(Math.round(rec.total * 0.25))} (25%)`, "client"],
      ...rec.subjectivities.map(s => [`Quote condition confirmed: ${s.replace(/\.$/, "")}`, "auto"]),
      [`Binder issued by ${rec.market} and sent to Carla`, "auto"], ["MCS-90 endorsement on the auto policy", "auto"], [`BMC-91X federal filing made by ${short(rec.market)}`, "auto"], ["Texas intrastate insurance filing (Form E) updated", "auto"],
      ...(es ? [["Surplus lines tax and stamping fee reported in Texas", "auto"], [`Declinations saved to the file (${declined.join(", ")})`, "auto"]] : []),
      ["Certificates reissued to the 2 holders on file", "auto"], ["Issued policy checked against the bound quote", "auto"],
    ];
    const step = X().bind || 0, running = X().binding, done = step >= items.length;
    const vin = S.chg?.addVehicles?.[0]?.vin || "1XKWD49X0RJ123456", bad = vin.slice(0, -2) + vin.slice(-1) + vin.slice(-2, -1);
    const checks = [["Named insured", m.insured, m.insured], ["Policy period", "11/01/2026 to 11/01/2027", "11/01/2026 to 11/01/2027"], ["Auto liability", rec.al?.limit, rec.al?.limit],
      ["Physical damage deductible", rec.apd?.ded, rec.apd?.ded], ["Cargo limit", rec.cargo?.limit, rec.cargo?.limit], ["Total premium", money(rec.total), money(rec.total)],
      ["Drivers scheduled", `${m.drivers.length}, including Dakota Mills`, `${m.drivers.length}, including Dakota Mills`], ["Units scheduled", `${m.vehicles.length}`, `${m.vehicles.length}`],
      ["Unit 7 VIN (2024 Kenworth W900)", vin, bad, true]];
    $("#aBody").innerHTML = `<div class="grid g-main-l" style="grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)">
      ${card(`Bind with ${esc(rec.market)}`, `<div class="steps bind-list">${items.map(([t, who], i) => { const st = i < step ? "done" : i === step && running ? "run" : "";
          return `<div class="step ${st}"><span class="s-ic"></span><span>${esc(t)}</span><small>${i < step ? (who === "client" ? (i === 0 ? "e-signed" : "received") : "done") : i === step && running ? (i === 0 ? "sent for e-signature" : "working") : who === "client" ? "client" : ""}</small></div>`; }).join("")}</div>`,
        { sub: `${money(rec.total)} · ${rec.type}`, actions: done ? `<span class="chip ok">Bound</span><button class="btn sm ghost" id="bindRun">Run again</button>` : `<button class="btn sm primary" id="bindRun" ${running ? "disabled" : ""}>${icon("check")}${running ? "Binding…" : "Start binding"}</button>` })}
      <div class="stack">
        ${done ? card("Issued policy vs bound quote", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Item</th><th>Bound quote</th><th>Issued policy</th><th></th></tr></thead><tbody>
            ${checks.map(c => `<tr ${c[3] ? "data-issue" : ""} class="${c[3] ? "bad" : ""}"><td>${c[0]}</td><td class="${c[3] ? "mono" : ""}">${esc(c[1])}</td><td class="${c[3] ? "mono" : ""}">${c[3] ? esc(c[2]).replace(/(..)$/, '<b style="color:var(--crit);text-decoration:underline">$1</b>') : esc(c[2])}</td><td>${c[3] ? (X().bindFixed ? '<span class="chip warn">Correction requested</span>' : '<span class="chip crit">Wrong</span>') : '<span class="chip ok">Match</span>'}</td></tr>`).join("")}
          </tbody></table></div>`, { tight: true, guide: "bind-check", sub: "read from the policy PDF when it arrives" }) +
          card("Correction request", `<textarea class="input" style="min-height:150px">Hello,\n\nThe issued policy for ${m.insured} lists unit 7, the 2024 Kenworth W900, as VIN ${bad}. The title and the bound submission read ${vin}. Please endorse to correct the VIN effective 11/01/2026 and send the revised schedule.\n\nCarlos Ibarra\n${DATA.firm}</textarea>`,
            { foot: X().bindFixed ? '<span class="chip ok">Sent</span>' : `<button class="btn primary" id="bindFix">${icon("send")}Send correction to ${esc(short(rec.market))}</button>` })
        : card("Issued policy check", `<div class="empty" style="padding:26px">${icon("file")}<p>When the policy arrives it's compared line by line with the quote you bound.</p></div>`)}
      </div></div>`;
    const b = $("#bindRun"); if (b) b.onclick = async () => {
      X().binding = true; X().bind = 0; X().bindFixed = false; bind();
      for (let i = 1; i <= items.length; i++) { await sleep(i === 1 ? 900 : 380); X().bind = i; if (i === 1) toast("Carla Mendez signed the applications"); if (location.hash.endsWith("/bind")) bind(); }
      X().binding = false; credit("bind"); SD.save(); toast("Bound. The issued policy has one mismatch", "warn"); if (location.hash.endsWith("/bind")) bind();
    };
    const f = $("#bindFix"); if (f) f.onclick = () => { X().bindFixed = true; SD.save(); toast(`Correction request sent to ${rec.market}`); bind(); };
  }
  SD.tabs = { risk, supp, bind };

  /* ================= inbox ================= */
  const INBOX = [
    { id: "coi", from: "Pinnacle Freight Brokerage", addr: "carriersetup@pinnaclefreight.example", time: "8:02 AM", subject: "COI for carrier setup: Brazos Valley Hot Shot",
      body: "Hello,\n\nPlease send a certificate for Brazos Valley Hot Shot & Flatbed LLC (MC-1102233) so we can finish carrier setup today. We require $1,000,000 auto liability and $100,000 cargo.\n\nCertificate holder: Pinnacle Freight Brokerage LLC, 900 Commerce St, Dallas, TX 75202\n\nCarrier Setup Team",
      type: "Certificate request", urg: "High", account: "Brazos Valley Hot Shot & Flatbed", summary: "A freight broker needs a certificate today to finish carrier setup.",
      details: [["Holder", "Pinnacle Freight Brokerage LLC, Dallas, TX"], ["Requires", "$1M auto liability, $100K cargo"], ["Due", "Today"]], act: ["Open certificate", "#/certificates/1"] },
    { id: "driver", from: "Hector Salinas", addr: "hector@lonestarcouriers.example", time: "6:38 AM", subject: "Adding a driver Monday",
      body: "Hi team, we hired Andre Wallace to start driving Monday 9/21. DOB 2/11/98, Texas license. Please add him to the policy.\n\nHector",
      type: "Policy change", urg: "High", account: "Lone Star Couriers", summary: "Add a new driver starting Monday.", details: [["Change", "Add driver Andre Wallace"], ["DOB", "02/11/1998"], ["Effective", "Monday 09/21/2026"], ["Policy", "Frontier FCA-60412"]], act: ["Prepare change", "#/requests/1"] },
    { id: "loss", from: "Rosa Delgado", addr: "rosa@midnighttow.example", time: "7:10 AM", subject: "Accident at a tow scene this morning",
      body: "Hi, our driver Eddie Pruitt was hooking up a disabled car on I-410 near exit 17 around 6:15 this morning. While backing our new 2023 F-550 wrecker he hit a 2019 Honda Accord stopped behind the scene. Nobody was hurt. San Antonio PD came out, report 26-0916-0412. 3 photos attached.\n\nRosa",
      type: "Claim", urg: "High", account: "Midnight Tow & Recovery", summary: "The wrecker backed into a third-party car at a scene. No injuries.", details: [["Date of loss", "09/16/2026, about 6:15 AM"], ["Vehicle", "2023 Ford F-550 wrecker"], ["Police report", "San Antonio PD 26-0916-0412"], ["Injuries", "None"]], act: ["Build loss notice", "#/claims"] },
    { id: "uw", from: "Karen Obi, Northgate Specialty", addr: "trucking@northgate.example", time: "10:12 AM", subject: "RE: Brazos Valley Hot Shot & Flatbed submission",
      body: "Thanks for the submission. Before we can quote we need a 3-year MVR on Dakota Mills and confirmation of whether the tractors have dash cameras.\n\nKaren Obi\nNorthgate Specialty Insurance",
      type: "Underwriter question", urg: "Medium", account: "Brazos Valley Hot Shot & Flatbed", summary: "Northgate needs two things before it quotes.", details: [["Market", "Northgate Specialty"], ["Needs", "3-year MVR for Dakota Mills; dash camera confirmation"]], act: ["Add to missing info", "#/missing/brazos-valley"] },
    { id: "lead", from: "Jesse Ruiz", addr: "jesse@ruizhotshot.example", time: "9:20 AM", subject: "Quote for 2 hot shot trucks",
      body: "Got your name from Marcus at Brazos Valley. I run 2 hot shot trucks out of Killeen and my carrier is non-renewing me October 31. 4 years under my own authority. Can you help?\n\nJesse Ruiz",
      type: "New business", urg: "High", account: "New: Ruiz Hot Shot", summary: "Referral with 2 hot shot trucks, non-renewed October 31.", details: [["Units", "2 hot shot trucks"], ["Garaging", "Killeen, TX"], ["Authority", "4 years"], ["Deadline", "Coverage ends 10/31/2026"], ["Referred by", "Marcus Reyes, Brazos Valley"]],
      reply: "Hi Jesse,\n\nThanks for reaching out, and glad Marcus sent you our way. To get quotes started before October 31, please send your current dec page, 5 years of loss runs, your USDOT number, and your driver and truck list. I'll have markets lined up this week.\n\nCarlos Ibarra\nIronline Commercial Insurance" },
    { id: "bill", from: "Linda Ortega, Sunset Motors", addr: "office@sunsetmotorsatx.example", time: "9:03 AM", subject: "Payment question",
      body: "When is our next installment due, and can we pay by ACH this time?\n\nLinda", type: "Billing question", urg: "Low", account: "Sunset Motors Auto Sales", summary: "Asks for the next due date and whether ACH is accepted.", details: [["Policy", "Lone Pine Casualty"], ["Next installment", "$3,200 due October 1"]],
      reply: "Hi Linda,\n\nYour next installment of $3,200 is due October 1. Lone Pine accepts ACH through its payment portal; I'll send you the link now.\n\nMia Chen\nIronline Commercial Insurance" },
    { id: "runs", from: "Frontier Commercial Auto", addr: "lossruns@frontierca.example", time: "5:52 AM", subject: "Loss runs: Midnight Tow & Recovery",
      body: "Attached are currently valued loss runs for policy FCA-58821, valued 09/15/2026.\n\nFrontier Commercial Auto\n[attachment: FCA-58821_lossruns_2026-09-15.pdf]",
      type: "Document received", urg: "Low", account: "Midnight Tow & Recovery", summary: "Loss runs the renewal was waiting on.", details: [["Document", "Loss runs valued 09/15/2026"], ["Filed to", "Midnight Tow & Recovery · renewal documents"]], filed: true },
  ];
  const URG = { High: "crit", Medium: "warn", Low: "" };
  route("/inbox", () => {
    const sorted = !!X().inbox, dn = X().inboxDone || {};
    setPage([["Inbox"]], `${head("Inbox", "The shared service inbox: each email typed, matched to the account, its details pulled out and routed to the screen that finishes it.",
        `<button class="btn ${sorted ? "" : "primary"}" id="sortInbox">${icon("spark")}${sorted ? "Sort again" : "Sort inbox"}</button>`)}
      ${sorted ? `<div class="grid g4" style="margin-bottom:16px"><div class="card kpi"><div class="l">High priority</div><div class="v">${INBOX.filter(e => e.urg === "High").length}</div></div><div class="card kpi"><div class="l">Routed to a screen</div><div class="v">${INBOX.filter(e => e.act).length}</div></div><div class="card kpi"><div class="l">Replies drafted</div><div class="v">${INBOX.filter(e => e.reply).length}</div></div><div class="card kpi"><div class="l">Filed automatically</div><div class="v">${INBOX.filter(e => e.filed).length}</div></div></div>` : ""}
      <div id="inRun"></div>
      <div class="stack" data-guide="${sorted ? "inbox" : "inbox-unsorted"}">${INBOX.map(e => `<div class="card mail"><div class="card-h"><div class="avatar">${UI.initials(e.from)}</div><div style="min-width:0"><h3>${esc(e.subject)}</h3><div class="sub">${esc(e.from)} · ${esc(e.addr)}</div></div><div class="actions"><span class="muted" style="font-size:12.5px">${e.time}</span></div></div>
        <div class="card-b"><div style="white-space:pre-wrap;font-size:13.5px;color:var(--ink-2)">${esc(e.body)}</div>
        ${sorted ? `<div class="mail-res"><div class="row"><span class="chip accent">${e.type}</span><span class="chip ${URG[e.urg]} plain">${e.urg} priority</span><span class="muted" style="font-size:12.5px">${esc(e.account)}</span></div>
          <p style="margin:8px 0 6px;font-weight:600">${esc(e.summary)}</p><dl class="kv">${e.details.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
          ${e.reply ? `<div class="draft" style="margin-top:10px"><p style="margin:0 0 6px"><b>Reply drafted</b></p>${md(e.reply)}</div>` : ""}
          <div class="row" style="margin-top:10px">${e.act ? `<a class="btn sm primary" data-route href="${e.act[1]}">${icon("arrow")}${e.act[0]}</a>` : e.reply ? (dn[e.id] ? '<span class="chip ok">Reply sent</span>' : `<button class="btn sm primary" data-reply="${e.id}">${icon("send")}Send reply</button>`) : '<span class="chip ok">Filed</span>'}</div></div>` : ""}
        </div></div>`).join("")}</div>`);
    $("#sortInbox").onclick = async e => { e.target.disabled = true;
      await UI.runSteps($("#inRun"), INBOX.map(m => [`Reading "${esc(m.subject)}"`, async () => ({ detail: `${m.type} · ${m.urg}` })]), 230);
      X().inbox = true; credit("inbox", "inbox", INBOX.length); SD.save(); toast(`${INBOX.length} emails sorted · ${INBOX.filter(x => x.act).length} routed`); render(); };
    $$("[data-reply]").forEach(b => b.onclick = () => { (X().inboxDone ||= {})[b.dataset.reply] = true; SD.save(); toast(`Reply sent to ${INBOX.find(x => x.id === b.dataset.reply).from}`); render(); });
  });

  /* ================= submissions tracker ================= */
  route("/submissions", () => {
    const m = S.dec ? SD.merged() : null;
    const bv = DATA.markets.filter(mk => S.sent.has(mk.name)).map(mk => { const q = S.quotes.find(x => x.market.split(" ")[0] === mk.name.split(" ")[0]);
      const st = q ? ["ok", `Quoted ${money(q.total)}`] : /Northgate/.test(mk.name) && X().inbox ? ["warn", "Info requested"] : ["info", "Awaiting quote"];
      return ["brazos-valley", "Brazos Valley Hot Shot & Flatbed", mk.name, "Today", st, q ? "Compare quotes" : st[1] === "Info requested" ? "Send MVR and camera answer" : "Follow up in 3 days", q ? "#/accounts/brazos-valley/quotes" : st[1] === "Info requested" ? "#/missing/brazos-valley" : "#/accounts/brazos-valley/markets"]; });
    const rows = [...bv,
      ["gulf-coast", "Gulf Coast Reefer Lines", "Atlas Truckers Program", "Sep 8", ["ok", "Quoted $198,400"], "Compare quotes", "#/accounts/gulf-coast"],
      ["gulf-coast", "Gulf Coast Reefer Lines", "Northgate Specialty Insurance", "Sep 8", ["warn", "8 days, no answer"], "Chased Sep 14 · chase again", "#/submissions"],
      ["gulf-coast", "Gulf Coast Reefer Lines", "Frontier Commercial Auto", "Sep 8", ["crit", "Declined: reefer losses"], "Declination saved", "#/accounts/gulf-coast"],
      ["gulf-coast", "Gulf Coast Reefer Lines", "Lone Pine Casualty", "Sep 8", ["crit", "Declined: radius"], "Declination saved", "#/accounts/gulf-coast"],
      ["inland-empire", "Inland Empire Dump & Haul", "Northgate Specialty Insurance", "Aug 28", ["ok", "Quoted $111,060"], "Best option, 6.2% under", "#/accounts/inland-empire"],
      ["inland-empire", "Inland Empire Dump & Haul", "Canyon Mutual Transport", "Aug 28", ["ok", "Quoted $118,900"], "Compare quotes", "#/accounts/inland-empire"],
      ["inland-empire", "Inland Empire Dump & Haul", "Atlas Truckers Program", "Aug 28", ["ok", "Quoted $121,300"], "Compare quotes", "#/accounts/inland-empire"],
    ];
    const cnt = k => rows.filter(r => r[4][0] === k).length;
    setPage([["Submissions"]], `${head("Submissions", "Every submission out to every market, with its status and the next follow-up.", `<button class="btn" id="chase">${icon("send")}Chase overdue markets</button>`)}
      <div class="grid g4" style="margin-bottom:16px"><div class="card kpi"><div class="l">${icon("send")} Out with markets</div><div class="v">${rows.length}</div><div class="d">3 accounts</div></div><div class="card kpi"><div class="l">${icon("check")} Quotes back</div><div class="v">${cnt("ok")}</div></div><div class="card kpi"><div class="l">${icon("clock")} Waiting or asked for info</div><div class="v">${cnt("info") + cnt("warn")}</div></div><div class="card kpi"><div class="l">${icon("x")} Declined</div><div class="v">${cnt("crit")}</div><div class="d">declinations kept for the file</div></div></div>
      ${!bv.length ? `<div class="alert" style="margin-bottom:16px">${icon("layers")}<div><b>Brazos Valley hasn't gone to markets yet.</b> <a href="#/accounts/brazos-valley/markets">Choose markets</a> and each submission shows up here.</div></div>` : ""}
      ${card("All submissions", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Account</th><th>Market</th><th>Sent</th><th>Status</th><th>Next</th></tr></thead><tbody>
        ${rows.map(r => `<tr class="click" onclick="location.hash='${r[6]}'"><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td><td>${r[3]}</td><td><span class="chip ${r[4][0]}">${esc(r[4][1])}</span></td><td class="muted">${esc(r[5])}</td></tr>`).join("")}</tbody></table></div>`, { tight: true })}`);
    $("#chase").onclick = () => toast("Follow-up sent to Northgate Specialty on Gulf Coast Reefer (8 days out)");
  });

  /* ================= claims intake ================= */
  const CLAIM = { insured: "Midnight Tow & Recovery", policy: "FCA-58821", carrier: "Frontier Commercial Auto", contact: "Rosa Delgado, (210) 555-0144", date: "09/16/2026", time: "About 6:15 AM",
    location: "I-410 near exit 17, San Antonio, TX", police: "San Antonio PD · report 26-0916-0412", driver: "Eddie Pruitt · on the driver list since 2024", vehicle: "2023 Ford F-550 wrecker · VIN 1FDUF5HT3PDA12345",
    vDamage: "Boom and rear lights", other: "Denise Park, (210) 555-0187 · 2019 Honda Accord", oDamage: "Front bumper and headlight", injuries: "None reported", desc: "While backing the wrecker to hook up a disabled car, the insured's driver struck a Honda Accord stopped behind the scene." };
  const CLAIM_EMAIL = "Hi, our driver Eddie Pruitt was hooking up a disabled car on I-410 near exit 17 around 6:15 this morning. While backing our new 2023 F-550 wrecker he hit a 2019 Honda Accord stopped behind the scene. Nobody was hurt. San Antonio PD came out, report 26-0916-0412. The Honda belongs to Denise Park, (210) 555-0187; her front bumper and headlight are smashed. Our boom and rear lights are damaged. 3 photos attached.\n\nRosa";
  route("/claims", () => {
    const c = X().claim || {}, reqSent = S.done.has("req2");
    const cell = (l, v, span = 1) => `<div class="fs-cell" style="grid-column:span ${span}"><label>${l}</label><div class="val">${esc(v)}</div></div>`;
    setPage([["Claims"]], `${head("Claims", "A client's report of a loss turned into a carrier-ready loss notice, with the coverage questions answered first.")}
      <div class="grid g-main-l" style="grid-template-columns:minmax(0,1fr) minmax(0,1.25fr)">
        <div class="stack">
          ${card("Accident at a tow scene this morning", `<div class="row" style="margin-bottom:10px"><div class="avatar s">RD</div><b style="font-size:13px">Rosa Delgado</b><span class="muted" style="font-size:12.5px">Midnight Tow & Recovery · 7:10 AM</span></div><div style="white-space:pre-wrap;font-size:13.5px" data-guide="claim-email">${esc(CLAIM_EMAIL)}</div>
            <div class="file-row" style="padding:10px 0 0;border:0"><div class="file-ic eml">IMG</div><div class="meta"><b>3 photos</b><small>scene, Honda front, wrecker boom</small></div></div>`,
            { foot: c.built ? `<span class="chip ok">Loss notice built</span><button class="btn sm ghost" id="buildClaim">Rebuild</button>` : `<button class="btn primary" id="buildClaim">${icon("spark")}Build loss notice</button>` })}
          <div id="clRun"></div>
          ${c.built ? card("Claims log", (c.sent ? `<div class="list-item"><div class="li-ic ok">${icon("check")}</div><div class="li-b"><b>Midnight Tow & Recovery · auto liability and physical damage</b><p>Sent to Frontier claims ${c.sent} · follow-up in 7 days</p></div></div>` : "") +
            `<div class="list-item"><div class="li-ic info">${icon("clock")}</div><div class="li-b"><b>Brazos Valley · RT-26-04471 (I-35 sideswipe)</b><p>Open with $31,000 reserve · status check due Sep 30</p></div></div>`, { tight: true }) : ""}
        </div>
        <div class="stack">${c.built ? `
          <div class="card"><div class="card-h"><h3>Automobile loss notice</h3><span class="sub">ACORD 2 layout</span><div class="actions"><button class="btn sm" onclick="UI.printOnly(document.querySelector('#clForm'))">${icon("printer")}PDF</button></div></div><div class="card-b" style="background:#e9ebef" id="clForm"><div class="form-sheet">
            <div class="fs-top"><div class="fs-logo">ACORD</div><div class="fs-title">Automobile Loss Notice</div><div class="fs-date">DATE (MM/DD/YYYY)<b>09/16/2026</b></div></div>
            <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr">${cell("Agency", DATA.firm)}${cell("Carrier", CLAIM.carrier)}${cell("Policy number", CLAIM.policy)}</div>
            <div class="fs-row" style="grid-template-columns:1fr 1fr 1fr">${cell("Insured", CLAIM.insured)}${cell("Contact", CLAIM.contact)}${cell("Date / time of loss", CLAIM.date + " · " + CLAIM.time)}</div>
            <div class="fs-row" style="grid-template-columns:1fr 1fr">${cell("Location of loss", CLAIM.location)}${cell("Reported to police", CLAIM.police)}</div>
            <div class="fs-row" style="grid-template-columns:1fr">${cell("Description of accident", CLAIM.desc)}</div>
            <div class="fs-sec">Insured vehicle</div><div class="fs-row" style="grid-template-columns:1.4fr 1fr 1fr">${cell("Vehicle", CLAIM.vehicle)}${cell("Driver", CLAIM.driver)}${cell("Damage", CLAIM.vDamage)}</div>
            <div class="fs-sec">Other vehicle / property</div><div class="fs-row" style="grid-template-columns:1.4fr 1fr 1fr">${cell("Owner and vehicle", CLAIM.other)}${cell("Damage", CLAIM.oDamage)}${cell("Injuries", CLAIM.injuries)}</div>
            <div class="fs-foot"><span>ACORD 2 layout · filled from the client's email and the policy</span><span>Page 1 of 1</span></div></div></div></div>
          ${card("Coverage notes", `<div class="stack" style="gap:8px">
            <div class="alert">${icon("shield")}<div>Damage to Denise Park's Honda is third-party property damage under <b>auto liability</b>.</div></div>
            <div class="alert">${icon("truck")}<div>The wrecker's boom and lights fall under <b>physical damage</b>, subject to the deductible. The car on the hook wasn't damaged, so on-hook coverage isn't involved.</div></div>
            ${reqSent ? `<div class="alert ok">${icon("check")}<div>The request to add the F-550 already went to Frontier. It's referenced on the notice.</div></div>` : `<div class="alert warn">${icon("alert")}<div><b>The F-550 was bought yesterday and the request to add it hasn't gone to Frontier.</b> Send it with this notice today. Whether a newly bought truck is covered before it's added depends on the policy form and prompt reporting. <a href="#/requests/2">Open the vehicle change</a></div></div>`}</div>`, { guide: "claim-notes" })}
          ${card("Collected for the adjuster", [["Police report number", true], ["Other party's name and phone", true], ["Photos (3)", true], ["Eddie Pruitt's statement", false], ["Repair estimate for the boom", false]].map(([t, ok]) => `<div class="list-item" style="padding:8px 14px"><div class="li-ic ${ok ? "ok" : "warn"}">${icon(ok ? "check" : "clock")}</div><div class="li-b"><b>${t}</b>${ok ? "" : "<p>Asked from Rosa · on the missing info list</p>"}</div></div>`).join(""),
            { tight: true, foot: c.sent ? '<span class="chip ok">Sent to Frontier claims</span>' : `<button class="btn primary" id="sendClaim">${icon("send")}Send to Frontier and set 7-day follow-up</button>` })}`
          : `<div class="card"><div class="empty" style="padding:60px 30px">${icon("file")}<p><b>The loss notice appears here.</b></p><p>Built from Rosa's email, the Frontier policy, the vehicle change request and the driver list.</p></div></div>`}
        </div></div>`);
    const b = $("#buildClaim"); if (b) b.onclick = async () => { b.disabled = true;
      await UI.runSteps($("#clRun"), [["Reading Rosa's email", async () => ({ detail: "date, place, vehicles, police report" })], ["Matching the policy", async () => ({ detail: "Frontier FCA-58821" })], ["Matching the wrecker", async () => ({ detail: "vehicle change request from 9/15" })], ["Matching the driver", async () => ({ detail: "Eddie Pruitt, on the driver list" })], ["Filling the ACORD 2 loss notice", async () => ({ detail: "14 fields" })]], 380);
      X().claim = { built: true, sent: X().claim?.sent }; credit("claim"); SD.save(); render(); };
    const sc = $("#sendClaim"); if (sc) sc.onclick = () => { X().claim.sent = now(); SD.save(); toast("Loss notice sent to Frontier claims · follow-up set for Sep 23"); render(); };
  });

  /* ================= missing information ================= */
  const OWED = [
    ["brazos-valley", "Carla Mendez", "Office Manager", [["fein", "FEIN", "Required on the ACORD 125; not in any document received", "Applications"], ["cameras", "Dash cameras and ELD provider", "Northgate asked, and it's on all 3 supplementals", "Underwriter + supplementals"],
      ["safety", "Written safety program", "Asked on all 3 supplementals", "Supplementals"], ["securement", "How loads are secured", "Underwriters will ask after the 2024 load-shift cargo claim", "Supplementals"],
      ["i35", "What changed after the I-35 sideswipe", "The claim is still open with a $31,000 reserve", "Loss review"], ["license", "Dakota Mills's driver's license number", "To order the 3-year MVR Northgate asked for", "Underwriter"]]],
    ["midnight-tow", "Rosa Delgado", "Owner", [["statement", "Eddie Pruitt's statement about the 9/16 accident", "Frontier asks for it with the loss notice", "Claim"], ["estimate", "Repair estimate for the wrecker's boom", "Needed to settle the physical damage part", "Claim"]]],
    ["rusty-anchor", "Tom Keller", "Owner", [["guards", "Security company contract", "Liquor markets want the hold-harmless and the guard company's insurance", "Supplemental"]]],
    ["gulf-coast", "Nadia Brooks", "Safety Director", [["reefer", "Reefer unit maintenance logs", "Needed for reefer breakdown cargo coverage", "Submission"]]],
    ["canyon-leaf", "Owen Tran", "Owner", [["state-license", "Current state cannabis license", "Markets won't quote without a copy", "Renewal"], ["photos", "Updated security camera photos", "Asked on the property supplemental", "Renewal"]]],
  ];
  route("/missing", () => owed("brazos-valley"));
  route("/missing/:id", ({ id }) => owed(id));
  function owed(id) {
    const cur = OWED.find(o => o[0] === id) || OWED[0], a = SD.A(cur[0]), st = (X().owed ||= {}), mine = (st[cur[0]] ||= {});
    const status = (acct, k) => (st[acct] || {})[k];
    const open = cur[3].filter(i => status(cur[0], i[0]) !== "received");
    const all = OWED.flatMap(o => o[3].map(i => ({ o, i })));
    const mail = `Subject: A few items for your ${a.name} ${cur[0] === "midnight-tow" ? "claim" : "renewal"}\n\nHi ${cur[1].split(" ")[0]},\n\nTo ${cur[0] === "midnight-tow" ? "keep the claim moving with Frontier" : "get you the best quotes"}, I still need:\n${open.map(i => `- **${i[1]}**: ${i[2].charAt(0).toLowerCase() + i[2].slice(1)}`).join("\n")}\n\nJust reply to this email with the answers or files attached and I'll take it from there.\n\nThanks,\n${a.ae}`;
    setPage([["Missing info"]], `${head("Missing information", "Everything clients still owe, from the applications, supplementals, underwriter questions and claims, chased until it arrives.", `<button class="btn" id="chaseAll">${icon("send")}Send to every client</button>`)}
      <div class="grid g-main-l">
        <div data-guide="owed">${card("Still owed", `<div class="tbl-wrap"><table class="t"><thead><tr><th>Account</th><th>Item</th><th>Why it matters</th><th>Status</th></tr></thead><tbody>
          ${all.map(({ o, i }, k) => { const s = status(o[0], i[0]), first = !k || all[k - 1].o !== o; return `<tr class="click ${o[0] === cur[0] ? "sel" : ""}" onclick="location.hash='#/missing/${o[0]}'"><td class="nowrap" style="${first ? "" : "border-top-color:transparent"}">${first ? `<b>${esc(SD.A(o[0]).name.replace(/ (LLC|Inc)$/, ""))}</b><div class="muted" style="font-size:11.5px">${esc(o[1])}</div>` : ""}</td><td>${esc(i[1])}<div class="muted" style="font-size:11.5px">${i[3]}</div></td><td style="white-space:normal;font-size:12.5px;color:var(--ink-2)">${esc(i[2])}</td><td class="nowrap">${s === "received" ? '<span class="chip ok">Received</span>' : s ? `<span class="chip info">Asked ${esc(s)}</span>` : '<span class="chip warn">Not asked</span>'}</td></tr>`; }).join("")}
          </tbody></table></div>`, { tight: true, sub: `${all.filter(x => status(x.o[0], x.i[0]) !== "received").length} open across ${OWED.length} accounts` })}</div>
        <div class="stack">
          ${card(`Email to ${esc(cur[1])}`, open.length ? `<div class="muted" style="font-size:12.5px;margin-bottom:8px">${esc(cur[2])} · ${esc(a.name)}</div><div class="draft">${md(mail)}</div>` : `<div class="alert ok">${icon("check")}<div>Everything from ${esc(cur[1])} is in.</div></div>`,
            { foot: open.length ? `<button class="btn primary" id="chaseOne">${icon("send")}${open.some(i => mine[i[0]]) ? "Send again" : "Send now"}</button><label class="row" style="font-size:12.5px;margin-left:6px"><input type="checkbox" id="remind" ${mine._remind === false ? "" : "checked"}> Remind every 3 days until it's all in</label>` : "" })}
          ${card("How it closes", `<div class="steps">${["One email per client, with why each item matters", "Reminder every 3 days until everything arrives", "Replies read: answers and attachments filed to the account", "The application, supplemental or claim updates itself"].map(t => `<div class="step done"><span class="s-ic"></span><span>${t}</span></div>`).join("")}</div>`)}
        </div></div>`);
    const send = acct => { const o = OWED.find(x => x[0] === acct), s = (st[acct] ||= {}); o[3].forEach(i => { if (s[i[0]] !== "received") s[i[0]] = now(); }); };
    const one = $("#chaseOne"); if (one) one.onclick = () => { send(cur[0]); credit("chase", "chase:" + cur[0]); SD.save(); toast(`Sent to ${cur[1]}`); render();
      if (cur[0] === "brazos-valley" && !X().fein) setTimeout(() => { mine.fein = "received"; mine.cameras = "received"; X().fein = "74-2918365"; SD.save(); toast("Carla replied: FEIN, ELD and cameras filed. ACORD 125 and supplementals updated"); if (location.hash.startsWith("#/missing")) render(); }, 3200); };
    const rm = $("#remind"); if (rm) rm.onchange = () => { mine._remind = rm.checked; SD.save(); toast(rm.checked ? `Reminders on for ${cur[1]}` : "Reminders off"); };
    $("#chaseAll").onclick = () => { OWED.forEach(o => send(o[0])); credit("chase", "chase:all", OWED.length); SD.save(); toast(`Sent to ${OWED.length} clients`); render(); };
  }

  /* ================= ask the file ================= */
  const CHIPS = ["Which drivers will underwriters push back on?", "What's still missing before we submit?", "How have premium and losses moved over 5 years?", "Summarize this account for an underwriter in 3 lines", "What do they haul, and what's the most valuable load?", "Which markets decline, and why?"];
  function answer(q) {
    if (!S.dec) return { text: "The Brazos Valley renewal packet isn't loaded yet, so there's nothing to answer from. Load it on the Documents tab and ask again.", src: [], link: ["Open documents", "#/accounts/brazos-valley/docs"] };
    const m = SD.merged(), L = S.loss, l = q.toLowerCase();
    if (/driver|mvr|young|cdl/.test(l)) { const dr = driverReview(m).filter(x => x.lvl !== "ok"); return { text: dr.map(x => `- **${x.d.name}**: ${[...x.notes, ...(x.mv && x.mv[1] !== "ok" ? [`MVR shows ${x.mv[0]}`] : [])].join("; ")}`).join("\n") + "\n\nThe driver note on the Risk review tab explains each one for the submission.", src: ["Dec page p2", "Carla's email", "Market guidelines"] }; }
    if (/missing|owe|need|before we submit/.test(l)) { const o = OWED[0][3].filter(i => (X().owed?.["brazos-valley"] || {})[i[0]] !== "received"); return { text: `Still needed from Carla Mendez:\n${o.map(i => `- **${i[1]}**: ${i[2]}`).join("\n")}`, src: ["ACORD 125", "Supplementals", "Northgate's email"], link: ["Open missing info", "#/missing/brazos-valley"] }; }
    if (/premium|loss|trend|ratio|claim/.test(l)) return { text: (L?.terms || []).map(t => `- **${t.term}**: ${money(t.premium)} premium, ${money(t.incurred)} incurred (${(t.incurred / t.premium * 100).toFixed(1)}%)`).join("\n") + `\n\nPremium rose ${((L.terms.at(-1).premium / L.terms[0].premium - 1) * 100).toFixed(0)}% over five terms. The last term's jump is the open I-35 claim with a ${money(L.open[0]?.reserve)} reserve.`, src: ["Loss run valued " + L.valued] };
    if (/haul|commod|load|cargo/.test(l)) { const top = [...m.commodities].sort((a, b) => b.maxLoad - a.maxLoad)[0]; return { text: m.commodities.map(c => `- ${c.name}: ${c.pct}% of loads, up to ${money(c.maxLoad)}`).join("\n") + `\n\nThe most valuable load is **${top.name.toLowerCase()} at ${money(top.maxLoad)}**, just under the ${S.dec.coverages[2]?.limit} cargo limit.`, src: ["Dec page p1"] }; }
    if (/market|declin|appetite|carrier/.test(l)) { const r = DATA.markets.map(mk => ({ mk, r: SD.marketCheck(mk, m) })); return { text: r.map(({ mk, r }) => `- **${mk.name}**: ${r.status}${r.fails.length ? `. ${r.fails.join("; ")}` : r.conditions.length ? `. ${r.conditions.join("; ")}` : ""}`).join("\n"), src: ["Market guidelines", "Account data"], link: ["Open markets", "#/accounts/brazos-valley/markets"] }; }
    return { text: `${m.insured}: for-hire hot shot and flatbed out of Waco since 2016, ${m.vehicles.length} units (${money(m.stated)} stated) and ${m.drivers.length} drivers running TX, OK and NM within 500 miles.\nExpiring ${money(m.total)} with ${m.carrier}; 5-year loss ratio ${(L.lossRatio * 100).toFixed(1)}% on ${L.claims.length} claims, one open auto liability claim with a ${money(L.open[0]?.reserve)} reserve.\nWatch items: Dakota Mills (23, 1 year CDL) and hours-of-service at the 71st percentile.`, src: ["Dec page", "Loss run", "Carla's email", "FMCSA record"] };
  }
  route("/ask", () => {
    const chat = (X().chat ||= []);
    setPage([["Ask the file"]], `${head("Ask the file", "Questions about an account, answered from its dec page, loss run, emails and FMCSA record, with the source for each answer.")}
      <div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 300px">
        <div class="card" data-guide="ask"><div class="card-h"><h3>Brazos Valley Hot Shot & Flatbed</h3><span class="sub">${S.dec ? "renewal packet loaded" : "packet not loaded yet"}</span>${chat.length ? `<div class="actions"><button class="btn sm ghost" id="askClear">Clear</button></div>` : ""}</div>
          <div class="card-b"><div class="chat" id="chat">${chat.length ? chat.map((c, i) => c.role === "me" ? `<div class="bub me">${esc(c.text)}</div>` : `<div class="bub ai" data-i="${i}"><div class="bub-t">${md(c.text)}</div>${c.src?.length ? `<div class="bub-src">${c.src.map(s => `<span class="src" style="margin:0 4px 0 0">${esc(s)}</span>`).join("")}</div>` : ""}${c.link ? `<a class="btn sm" style="margin-top:8px" href="${c.link[1]}">${icon("arrow")}${c.link[0]}</a>` : ""}</div>`).join("") : `<div class="empty" style="padding:30px">${icon("search")}<p>Ask anything about this account, or pick a question.</p></div>`}</div>
          <div class="row" style="margin-top:12px;flex-wrap:nowrap"><input class="input" id="askIn" placeholder="e.g. Which drivers will underwriters push back on?"><button class="btn primary" id="askGo">${icon("send")}Ask</button></div></div></div>
        ${card("Try asking", `<div class="stack" style="gap:6px">${CHIPS.map(c => `<button class="btn sm ask-chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>`)}
      </div>`);
    const box = $("#chat"); box.scrollTop = box.scrollHeight;
    const ask = async q => { q = (q || "").trim(); if (!q) return; const a = answer(q); chat.push({ role: "me", text: q }, { role: "ai", ...a }); credit("ask", "ask:" + chat.length); SD.save(); render();
      const el = $(`#chat .bub.ai[data-i="${chat.length - 1}"] .bub-t`); if (el) { el.innerHTML = ""; await typeOut(el, a.text); const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight; } };
    $("#askGo").onclick = () => ask($("#askIn").value); $("#askIn").onkeydown = e => { if (e.key === "Enter") ask(e.target.value); };
    $$(".ask-chip").forEach(b => b.onclick = () => ask(b.dataset.q));
    const cl = $("#askClear"); if (cl) cl.onclick = () => { X().chat = []; SD.save(); render(); };
  });
})();
