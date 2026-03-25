# site-screens

Small Playwright CLI for fast, good-looking website screenshots.

## Why this repo exists

This is not a test suite and not a crawler. It is a focused capture tool for:

- one-off screenshots while researching
- polished screenshots for social posts
- logged-in page capture with saved session state
- batch capture from a text file

## Install

```bash
npm install
npm run install:browsers
```

Browsers are installed into the repo-local `.playwright/` directory for deterministic runs.

## Commands

```bash
site-screens shot https://example.com
site-screens shot https://example.com --preset tweet
site-screens shot https://example.com --selector ".hero" --wait-for ".hero"
site-screens shot https://example.com --full-page --out screens/research
site-screens batch urls.txt --preset desktop --clean
site-screens auth https://x.com --storage-state .auth/x_com.json
```

## Useful flags

- `--preset desktop|mobile|tweet`
- `--browser chromium|firefox|webkit`
- `--channel chrome`
- `--selector <css>`
- `--wait-for <css>`
- `--delay <ms>`
- `--full-page`
- `--format png|jpeg`
- `--quality <1-100>`
- `--out <dir>`
- `--storage-state <path>`
- `--hide <css[,css]>`
- `--remove <css[,css]>`
- `--block-cookie-banners`
- `--clean`

## Presets

- `desktop`: 1440x1200 Chromium context for general site capture
- `mobile`: iPhone 13 device emulation in WebKit
- `tweet`: 1600x900 Chromium context for social-post-ready compositions

## Session workflow

Use `auth` once for a site that needs login:

```bash
site-screens auth https://x.com --storage-state .auth/x_com.json
```

Log in manually in the opened browser, then press Enter in the terminal. Later captures can reuse that saved state:

```bash
site-screens shot https://x.com/OpenAI --storage-state .auth/x_com.json --wait-for main
```

## Config file

Create `site-screens.config.json` from `site-screens.config.json.example`.

Example:

```json
{
  "defaults": {
    "preset": "desktop",
    "format": "png",
    "fullPage": false,
    "scroll": true,
    "blockCookieBanners": true
  },
  "sites": {
    "x.com": {
      "preset": "tweet",
      "waitFor": "main",
      "storageState": ".auth/x_com.json",
      "hide": ["[data-testid='BottomBar']"]
    }
  }
}
```

Precedence is: CLI flags > matching site rule > config defaults.

## Output behavior

- output defaults to `screens/`
- filenames include timestamp, URL slug, and preset
- screenshots are preserved by default
- use `--clean` only when you want to wipe the target directory first
- browser binaries resolve from `.playwright/` when the CLI is used

## Notes

- Prefer `--selector` for clean social-post shots. Full-page output is usually worse for presentation.
- Prefer `--wait-for` over arbitrary delays.
- The built-in cookie-banner removal is best-effort only.
- X/Twitter captures remove the logged-out `BottomBar` prompt by default.
- This repo includes a local smoke test so the core flow can be verified without internet access.
