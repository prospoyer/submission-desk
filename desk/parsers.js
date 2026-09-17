/* Document readers for Submission Desk: commercial auto declarations, loss runs, a client's change email,
   and market quotes. Real parsing of the files handed in. */
const Parsers = (() => {
  const EFFECTIVE = new Date("2026-11-01T12:00:00");
  const split = line => line.includes(" | ") ? line.split(" | ").map(s => s.trim()) : [line];
  const ageAt = dob => { const [m, d, y] = dob.split("/").map(Number); let a = EFFECTIVE.getFullYear() - y; if (EFFECTIVE < new Date(EFFECTIVE.getFullYear(), m - 1, d)) a--; return a; };

  function classify(text, name) {
    if (/^From:/m.test(text) && /^Subject:/m.test(text)) return "email";
    if (/loss run/i.test(text)) return "lossrun";
    if (/declarations/i.test(text)) return "dec";
    if (/quote|indication/i.test(text)) return "quote";
    return "unknown";
  }

  function dec(doc) {
    const kv = {}, coverages = [], commodities = [], vehicles = [], drivers = []; let fields = 0;
    for (const line of doc.lines) {
      const c = split(line); if (c.length < 2) continue;
      if (/^\d$/.test(c[0]) && /^\d{4}$/.test(c[1]) && c.length >= 6) { vehicles.push({ unit: +c[0], year: +c[1], make: c[2], vin: c[3], type: c[4], value: UI.parseMoney(c[5]) }); fields += 6; continue; }
      if (c.length >= 6 && /^\d{2}\/\d{2}\/\d{4}$/.test(c[1])) { drivers.push({ name: c[0], dob: c[1], state: c[2], cls: c[3], exp: +c[4], hired: c[5], age: ageAt(c[1]) }); fields += 6; continue; }
      if (c.length === 4 && /premium|coverage/i.test(c[3] + c[0]) === false && /\$[\d,]+\.\d{2}/.test(c[3])) { coverages.push({ name: c[0], limit: c[1], deductible: c[2], premium: UI.parseMoney(c[3]) }); fields += 4; continue; }
      if (c.length === 3 && /%$/.test(c[1])) { commodities.push({ name: c[0], pct: parseFloat(c[1]), maxLoad: UI.parseMoney(c[2]) }); fields += 3; continue; }
      if (c.length === 2) { kv[c[0]] = c[1]; fields++; }
    }
    const total = coverages.find(c => /total/i.test(c.name)) || (kv["Total Policy Premium"] ? { premium: UI.parseMoney(kv["Total Policy Premium"]) } : null);
    return { carrier: titleCase(doc.lines[0]), policy: kv["Policy Number"], insured: kv["Named Insured"], address: kv["Mailing Address"], period: kv["Policy Period"],
      dot: kv["USDOT Number"], mc: kv["MC Number"], operations: kv["Operations"], radius: kv["Radius of Operation"], garaging: kv["Garaging Location"],
      since: kv["Years in Business"], coverages: coverages.filter(c => !/total/i.test(c.name)), total: total ? total.premium : null, commodities, vehicles, drivers, fields };
  }

  function lossrun(doc) {
    const claims = [], terms = []; let valued = null, fields = 0;
    for (const line of doc.lines) {
      const c = split(line);
      if (c[0] === "Valued As Of") valued = c[1];
      if (c.length === 8 && /^\d{2}\/\d{2}\/\d{4}$/.test(c[1])) { claims.push({ no: c[0], date: c[1], coverage: c[2], desc: c[3], paid: UI.parseMoney(c[4]), reserve: UI.parseMoney(c[5]), incurred: UI.parseMoney(c[6]), status: c[7] }); fields += 8; }
      if (c.length === 4 && /^\d{4}-\d{4}$/.test(c[0])) { terms.push({ term: c[0], premium: UI.parseMoney(c[1]), claims: +c[2], incurred: UI.parseMoney(c[3]) }); fields += 4; }
    }
    const prem = terms.reduce((s, t) => s + t.premium, 0), inc = claims.reduce((s, c) => s + c.incurred, 0);
    return { valued, claims, terms, premium: prem, incurred: inc, lossRatio: prem ? inc / prem : 0, open: claims.filter(c => /open/i.test(c.status)), fields };
  }

  function email(text) {
    const out = { from: (text.match(/^From:\s*(.+)$/m) || [])[1], date: (text.match(/^Date:\s*(.+)$/m) || [])[1], subject: (text.match(/^Subject:\s*(.+)$/m) || [])[1],
      addVehicles: [], removeUnits: [], addDrivers: [], states: [], statesPct: null };
    let m;
    const flat = text.replace(/\s+/g, " ");
    if ((m = flat.match(/bought a (\d{4}) ([A-Z][\w ]+?), VIN ([A-HJ-NPR-Z0-9]{17}), paid \$([\d,]+)/)))
      out.addVehicles.push({ year: +m[1], make: m[2], vin: m[3], value: UI.parseMoney(m[4]), type: /kenworth|peterbilt|freightliner|mack|volvo|international/i.test(m[2]) ? "Tractor" : "Truck" });
    if ((m = flat.match(/replaces the (\d{4}) ([A-Z][\w ]+?) \(unit (\d+)\)/))) out.removeUnits.push({ unit: +m[3], desc: `${m[1]} ${m[2]}` });
    if ((m = flat.match(/New driver starting (\d{1,2}\/\d{1,2}): ([A-Z][a-z]+ [A-Z][a-z]+), DOB (\d{2}\/\d{2}\/\d{4}), (CDL-[A-C]|Class [A-C]), (\d+) years experience, (\w+) license/)))
      out.addDrivers.push({ name: m[2], dob: m[3], cls: m[4], exp: +m[5], state: m[6] === "Texas" ? "TX" : m[6], hired: m[1] + "/2026", age: ageAt(m[3]) });
    if ((m = flat.match(/loads into ([A-Z][a-z]+(?: [A-Z][a-z]+)?) and ([A-Z][a-z]+(?: [A-Z][a-z]+)?), maybe (\d+)% of our runs/))) { out.states = [m[1], m[2]]; out.statesPct = +m[3]; }
    out.fields = out.addVehicles.length * 4 + out.removeUnits.length + out.addDrivers.length * 5 + out.states.length + 3;
    return out;
  }

  function quote(doc, name) {
    const rows = {}; const subj = []; let fees = 0, total = null, fields = 0;
    for (const line of doc.lines) {
      if (/^[-•] /.test(line)) { subj.push(line.replace(/^[-•] /, "")); continue; }
      if (subj.length && !line.includes(" | ") && !/^Quote valid/i.test(line) && /^[a-z]/.test(line)) { subj[subj.length - 1] += " " + line; continue; }
      const c = split(line);
      if (c.length === 2 && /^\$[\d,]+\.\d{2}$/.test(c[1])) { fields += 2; if (/^total$/i.test(c[0])) total = UI.parseMoney(c[1]); else fees += UI.parseMoney(c[1]); continue; }
      if (c.length !== 4 || !/\$[\d,]+\.\d{2}/.test(c[3])) continue;
      fields += 4;
      if (/auto liability/i.test(c[0])) rows.al = { limit: c[1], ded: c[2], premium: UI.parseMoney(c[3]) };
      else if (/physical damage/i.test(c[0])) rows.apd = { limit: c[1], ded: c[2], premium: UI.parseMoney(c[3]) };
      else if (/cargo/i.test(c[0])) rows.cargo = { limit: c[1], ded: c[2], premium: UI.parseMoney(c[3]) };
      else if (/^total$/i.test(c[0])) total = UI.parseMoney(c[3]);
      else fees += UI.parseMoney(c[3]);
    }
    return { market: doc.lines[0], ref: (doc.lines[1] || "").replace(/^.*?(\w+-[\w-]+)$/, "$1"), filename: name, ...rows, fees, total, subjectivities: subj, fields,
      type: /specialty/i.test(doc.lines[0]) ? "E&S" : /program/i.test(doc.lines[0]) ? "Program" : "Admitted" };
  }

  const titleCase = s => s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : s;
  return { classify, dec, lossrun, email, quote, ageAt };
})();
