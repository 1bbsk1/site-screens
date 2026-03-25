# AGENTS.md

## Repo purpose

This repo is a small Playwright screenshot CLI. Keep it focused on:

- one-off capture
- batch capture
- saved auth/session state
- per-site screenshot config

Do not expand it into a crawler, scraper platform, or browser testing framework unless the user explicitly asks for that.

## Fast orientation

Read only these files first:

1. `package.json`
2. `src/cli.js`
3. `src/capture.js`
4. `site-screens.config.json.example`
5. `README.md`

Avoid reading `package-lock.json` unless dependency work is involved.

## File map

- `src/cli.js`: command parsing and command dispatch
- `src/capture.js`: browser launch, auth flow, capture pipeline
- `src/presets.js`: named viewport/device presets
- `src/config.js`: loading and matching `site-screens.config.json`
- `src/utils.js`: small helpers
- `scripts/smoke-test.js`: local verification
- `fixtures/smoke.html`: no-network test fixture

## Commands

Install:

```bash
npm install
npm run install:browsers
```

The CLI resolves Playwright browsers from the repo-local `.playwright/` directory.

Verify:

```bash
npm test
```

Help:

```bash
node src/cli.js --help
```

Common manual runs:

```bash
node src/cli.js shot https://example.com --preset tweet
node src/cli.js batch urls.txt --preset desktop
node src/cli.js auth https://x.com --storage-state .auth/x_com.json
```

## Working rules for future sessions

- Prefer editing only `src/cli.js`, `src/capture.js`, and `README.md` unless the change clearly belongs elsewhere.
- Keep dependencies minimal. `playwright` is the only required runtime dependency.
- Prefer CLI flags and shallow JSON config over adding more code paths.
- Prefer `--wait-for` and selector-based capture over fixed delays.
- X/Twitter captures already strip the `BottomBar` login prompt in code; preserve that behavior unless the user asks otherwise.
- Do not commit `browser_profile/`, `.auth/`, `screens/`, or other runtime output.
- If changing CLI behavior, update both `README.md` and this file in the same pass.
- Use the smoke test before claiming the tool works.

## Minimal-token workflow

When a new session needs context, do this:

1. Read `AGENTS.md`.
2. Read `src/cli.js`.
3. Read only the specific module relevant to the requested change.
4. Run `node src/cli.js --help` or `npm test` if behavior needs confirmation.

That is usually enough. Avoid broad repo scans unless the user asks for deeper analysis.
