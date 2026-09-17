/* Sample book for Submission Desk. Every company, person, carrier, market, VIN and figure is fictional. */
const DATA = {
  firm: "Ironline Commercial Insurance",
  users: [
    { name: "Dana Whitaker", role: "Principal", email: "dana@ironline.example" },
    { name: "Carlos Ibarra", role: "Account Executive", email: "carlos@ironline.example" },
    { name: "Mia Chen", role: "Account Manager", email: "mia@ironline.example" },
  ],
  accounts: [
    { id: "brazos-valley", name: "Brazos Valley Hot Shot & Flatbed LLC", cls: "Hot shot / flatbed", icon: "truck", city: "Waco, TX", units: 6, xdate: "2026-11-01", premium: 63380, carrier: "Redline Transport", stage: "Documents in", kind: "info", ae: "Carlos Ibarra" },
    { id: "inland-empire", name: "Inland Empire Dump & Haul Inc", cls: "Dump trucks", icon: "truck", city: "Fontana, CA", units: 9, xdate: "2026-10-15", premium: 118400, carrier: "Northgate Specialty", stage: "Quotes in (3)", kind: "ok", ae: "Carlos Ibarra" },
    { id: "rusty-anchor", name: "Rusty Anchor Bar & Grill", cls: "Bar / restaurant", icon: "building", city: "Long Beach, CA", units: 0, xdate: "2026-10-28", premium: 21950, carrier: "Harbor Specialty", stage: "Supplemental with client", kind: "warn", ae: "Mia Chen" },
    { id: "midnight-tow", name: "Midnight Tow & Recovery", cls: "Tow / recovery", icon: "truck", city: "San Antonio, TX", units: 6, xdate: "2026-11-20", premium: 71200, carrier: "Frontier Commercial Auto", stage: "Loss runs requested", kind: "warn", ae: "Mia Chen" },
    { id: "gulf-coast", name: "Gulf Coast Reefer Lines LLC", cls: "Refrigerated freight", icon: "truck", city: "Tampa, FL", units: 14, xdate: "2026-12-01", premium: 204600, carrier: "Atlas Truckers Program", stage: "Submitted to 4 markets", kind: "info", ae: "Carlos Ibarra" },
    { id: "sunset-motors", name: "Sunset Motors Auto Sales", cls: "Car dealership", icon: "building", city: "Austin, TX", units: 0, xdate: "2026-12-15", premium: 38400, carrier: "Lone Pine Casualty", stage: "Renewal in 90 days", kind: "", ae: "Mia Chen" },
    { id: "canyon-leaf", name: "Canyon Leaf Dispensary", cls: "Cannabis retail", icon: "building", city: "Santa Ana, CA", units: 0, xdate: "2027-01-05", premium: 46800, carrier: "Greenline E&S", stage: "Renewal in 111 days", kind: "", ae: "Dana Whitaker" },
    { id: "lone-star-couriers", name: "Lone Star Couriers", cls: "Delivery vans", icon: "truck", city: "Houston, TX", units: 11, xdate: "2027-02-01", premium: 88300, carrier: "Frontier Commercial Auto", stage: "On track", kind: "ok", ae: "Carlos Ibarra" },
  ],
  activity: [
    { t: "7:48 AM", icon: "file", kind: "info", title: "Renewal packet read for Brazos Valley Hot Shot", body: "Dec page, 5-year loss run and the client's change email. 6 units, 5 drivers, 1 open claim, 1 driver under 2 years CDL.", link: "#/accounts/brazos-valley" },
    { t: "7:31 AM", icon: "columns", kind: "ok", title: "3 quotes compared for Inland Empire Dump & Haul", body: "Best option is 6.2% under expiring with the same $1M liability limit.", link: "#/accounts" },
    { t: "7:05 AM", icon: "shield", kind: "ok", title: "14 certificates issued overnight", body: "Freight brokers and shippers requested COIs for 5 accounts. All matched to active policies and sent.", link: "#/certificates" },
    { t: "6:40 AM", icon: "alert", kind: "warn", title: "Driver added mid-term on Lone Star Couriers", body: "Endorsement request drafted for Frontier Commercial Auto. MVR requested.", link: "#/requests" },
    { t: "Yesterday", icon: "clock", kind: "info", title: "Loss runs requested for 4 renewals inside 90 days", body: "Midnight Tow, Gulf Coast Reefer, Sunset Motors, Canyon Leaf. Carriers chased automatically.", link: "#/renewals" },
  ],
  markets: [
    { name: "Northgate Specialty Insurance", type: "E&S", minAge: 23, minExp: 1, radius: 1000, maxVehAge: 20, excludes: [], openLimit: 75000, format: "ACORD 125 · 127 · 129 + loss runs", email: "trucking@northgate.example" },
    { name: "Frontier Commercial Auto", type: "Admitted", minAge: 21, minExp: 2, radius: 500, maxVehAge: 15, excludes: [], openLimit: 60000, format: "ACORD 125 · 127 · 129 + MVRs", email: "submissions@frontierca.example", conditional: true },
    { name: "Atlas Truckers Program", type: "Program", minAge: 21, minExp: 1, radius: 750, maxVehAge: 20, excludes: [], openLimit: 75000, format: "Program application + loss runs", email: "newbiz@atlastruckers.example" },
    { name: "Canyon Mutual Transport", type: "Admitted", minAge: 25, minExp: 3, radius: 500, maxVehAge: 12, excludes: [], openLimit: 25000, format: "Carrier portal", email: "portal" },
    { name: "Lone Pine Casualty", type: "Admitted", minAge: 23, minExp: 2, radius: 300, maxVehAge: 15, excludes: ["Oilfield equipment"], openLimit: 50000, format: "ACORD 125 · 127 · 129", email: "underwriting@lonepine.example" },
  ],
  quotes: ["Northgate Specialty - quote NGS-TR-20931.pdf", "Frontier Commercial Auto quote FCA-77120.pdf", "Atlas Truckers Program - indication ATP-5518.pdf"],
  packet: ["Redline_CA_Dec_RTI-CA-448812.pdf", "Redline_LossRun_BrazosValley_2026-09-01.pdf", "Brazos Valley - renewal changes (email).txt"],
  certificates: [
    { id: 1, from: "Pinnacle Freight Brokerage", email: "carriersetup@pinnaclefreight.example", time: "8:02 AM", account: "brazos-valley", holder: "Pinnacle Freight Brokerage LLC, 900 Commerce St, Dallas, TX 75202", ai: false, cargoMin: 100000, alMin: 1000000, note: "Carrier setup: $1M auto liability and $100K cargo required", status: "ready" },
    { id: 2, from: "BlueLine Logistics", email: "compliance@bluelinelogistics.example", time: "7:44 AM", account: "gulf-coast", holder: "BlueLine Logistics Inc, 4500 Harbor Blvd, Tampa, FL 33602", ai: true, cargoMin: 250000, alMin: 1000000, note: "Requests $250K reefer cargo with reefer breakdown", status: "gap" },
    { id: 3, from: "Hill Country Steel Supply", email: "ap@hcsteel.example", time: "Yesterday", account: "brazos-valley", holder: "Hill Country Steel Supply, 120 Industrial Dr, Temple, TX 76501", ai: true, cargoMin: 50000, alMin: 1000000, note: "Shipper wants to be additional insured", status: "ready" },
    { id: 4, from: "Coastal Aggregates Co", email: "vendors@coastalagg.example", time: "Yesterday", account: "inland-empire", holder: "Coastal Aggregates Co, 18 Quarry Rd, Rialto, CA 92376", ai: true, cargoMin: 0, alMin: 2000000, note: "Requires $2M auto liability (umbrella acceptable)", status: "gap" },
  ],
  requests: [
    { id: 1, from: "Hector Salinas", org: "Lone Star Couriers", time: "6:38 AM", subject: "Adding a driver Monday", intent: "Add driver", fields: [["Driver", "Andre Wallace"], ["DOB", "02/11/1998"], ["License", "TX Class C"], ["Start date", "09/21/2026"], ["Policy", "Frontier FCA-60412"]],
      body: "Hi team, we hired Andre Wallace to start driving Monday 9/21. DOB 2/11/98, Texas license. Please add him to the policy.\n\nHector", action: "MVR ordered · endorsement request drafted for Frontier", status: "Drafted" },
    { id: 2, from: "Rosa Delgado", org: "Midnight Tow & Recovery", time: "Yesterday", subject: "New tow truck", intent: "Add vehicle", fields: [["Vehicle", "2023 Ford F-550 wrecker"], ["VIN", "1FDUF5HT3PDA12345"], ["Stated value", "$118,000"], ["Garaging", "San Antonio, TX"], ["Policy", "Frontier FCA-58821"]],
      body: "We picked up a 2023 F-550 wrecker yesterday, VIN 1FDUF5HT3PDA12345, $118k. Need it on the policy with physical damage and on-hook.\n\nRosa", action: "Endorsement request drafted · physical damage and on-hook added", status: "Drafted" },
    { id: 3, from: "Tom Keller", org: "Rusty Anchor Bar & Grill", time: "Yesterday", subject: "RE: liquor liability supplemental", intent: "Supplemental returned", fields: [["Liquor sales", "38% of revenue"], ["Closing time", "1:00 AM"], ["Security", "2 on weekends"], ["Live entertainment", "Fridays"]],
      body: "Attached is the filled out supplemental. We close at 1am, have 2 security on weekends, live band Fridays.\n\nTom", action: "Supplemental read · submission to 3 markets ready", status: "Ready" },
  ],
};
