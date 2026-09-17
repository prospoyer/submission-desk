# Submission Desk demo

A working sample of a commercial trucking agency where the re-keying is handled for the team: renewal packets
read, FMCSA record and drivers reviewed, ACORD applications and carrier supplementals filled, market appetite
checked, quotes compared, binding and filings, certificates, client changes, claims intake, missing information,
and a guided tour. All companies, drivers, carriers and figures are fictional.

## Run locally

```
python3 server.py
```

Open http://127.0.0.1:8400/desk/

## Layout

- `desk/` the app (`app.js`, `ops.js`, `data.js`, `parsers.js`) and the sample documents it reads
- `shared/` design system (`app.css`), UI helpers (`core.js`) and the guided tour engine (`guide.js`)
- `server.py` static files plus a small per-visitor progress API, standard library only

## Deploy

Railway runs `python3 server.py` (see `railway.json`); the server binds to `$PORT`. Saved progress lives in
`.data/`, keyed by a session cookie, so each visitor has their own demo. It resets on redeploy.
