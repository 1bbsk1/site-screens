const path = require("path");
const { chromium, firefox, webkit } = require("playwright");
const { getPreset } = require("./presets");
const {
  defaultStorageStatePath,
  ensureDir,
  fileExists,
  prompt,
  relativeOrAbsolute,
  slugifyUrl,
  timestamp,
  toBoolean,
  toList,
  toNumber,
} = require("./utils");

const BROWSERS = {
  chromium,
  firefox,
  webkit,
};

function browserEngine(name) {
  return BROWSERS[name] || BROWSERS.chromium;
}

function pickDefined(...sources) {
  const result = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source || {})) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}

function hostFor(inputUrl) {
  try {
    return new URL(inputUrl).hostname;
  } catch (error) {
    return "";
  }
}

function builtInSiteDefaults(inputUrl) {
  const host = hostFor(inputUrl);

  if (host === "x.com" || host === "www.x.com" || host === "twitter.com" || host === "www.twitter.com") {
    return {
      remove: [
        "[data-testid='BottomBar']",
      ],
    };
  }

  return {};
}

function mergeListOptions(...values) {
  return Array.from(
    new Set(
      values.flatMap((value) => toList(value))
    )
  );
}

function normalizeOptions({ cwd, inputUrl, configDefaults, siteRule, cliOptions }) {
  const builtIns = builtInSiteDefaults(inputUrl);
  const merged = pickDefined(builtIns, configDefaults, siteRule, cliOptions);
  const presetName = merged.preset || "desktop";
  const preset = getPreset(presetName);
  const browser = merged.browser || preset.browser || "chromium";

  const outputDir = relativeOrAbsolute(cwd, merged.out || "screens");
  const format = merged.format || "png";
  const selector = merged.selector;
  const waitFor = merged["wait-for"] || merged.waitFor;
  const storageState = relativeOrAbsolute(
    cwd,
    merged["storage-state"] || merged.storageState
  );

  return {
    inputUrl,
    blockCookieBanners: toBoolean(
      merged["block-cookie-banners"] || merged.blockCookieBanners,
      false
    ),
    browser,
    channel: merged.channel || preset.channel,
    delay: toNumber(merged.delay, 0),
    format,
    freezeAnimations: !toBoolean(
      merged["allow-motion"] || merged.allowMotion,
      false
    ),
    fullPage: toBoolean(
      merged["full-page"] || merged.fullPage,
      preset.defaultFullPage || false
    ),
    hide: mergeListOptions(builtIns.hide, configDefaults.hide, siteRule.hide, cliOptions.hide),
    outputDir,
    preset,
    presetName,
    quality: toNumber(merged.quality, 90),
    remove: mergeListOptions(
      builtIns.remove,
      configDefaults.remove,
      siteRule.remove,
      cliOptions.remove
    ),
    scroll: toBoolean(merged.scroll, true),
    selector,
    storageState,
    timeout: toNumber(merged.timeout, 45000),
    waitFor,
  };
}

async function createContext(playwrightBrowser, options) {
  const { preset } = options;
  const contextOptions = {};

  if (preset.device) {
    Object.assign(contextOptions, preset.device);
  } else {
    contextOptions.viewport = preset.viewport;
    contextOptions.deviceScaleFactor = preset.deviceScaleFactor;
    contextOptions.isMobile = preset.isMobile;
    contextOptions.hasTouch = preset.hasTouch;
  }

  if (options.storageState && fileExists(options.storageState)) {
    contextOptions.storageState = options.storageState;
  }

  return playwrightBrowser.newContext(contextOptions);
}

async function freezeAnimations(page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

async function hideSelectors(page, selectors) {
  if (!selectors.length) {
    return;
  }

  const rules = selectors
    .map((selector) => `${selector} { visibility: hidden !important; }`)
    .join("\n");

  await page.addStyleTag({ content: rules });
}

async function removeSelectors(page, selectors) {
  if (!selectors.length) {
    return;
  }

  await page.evaluate((items) => {
    for (const selector of items) {
      for (const node of document.querySelectorAll(selector)) {
        node.remove();
      }
    }
  }, selectors);
}

async function dismissCookieBanners(page) {
  const selectors = [
    "#onetrust-banner-sdk",
    "#CybotCookiebotDialog",
    ".cookie-banner",
    ".cookie-consent",
    "[aria-label*='cookie' i]",
    "[class*='cookie' i]",
    "[id*='cookie' i]",
  ];

  await removeSelectors(page, selectors);
}

async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let offset = 0;
      const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
      const timer = setInterval(() => {
        offset += step;
        window.scrollTo(0, offset);

        if (offset >= document.body.scrollHeight + window.innerHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
}

async function waitForReady(page, options) {
  await page.waitForLoadState("domcontentloaded", { timeout: options.timeout });

  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch (error) {
    // Some sites keep live connections open forever. This is best-effort only.
  }

  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, { timeout: options.timeout });
  }

  if (options.delay > 0) {
    await page.waitForTimeout(options.delay);
  }
}

async function buildScreenshotOptions(page, options, outputPath) {
  const screenshotOptions = {
    path: outputPath,
    type: options.format,
    animations: "disabled",
  };

  if (options.format === "jpeg") {
    screenshotOptions.quality = options.quality;
  }

  if (options.selector) {
    const locator = page.locator(options.selector).first();
    await locator.waitFor({ state: "visible", timeout: options.timeout });
    return { target: locator, screenshotOptions };
  }

  screenshotOptions.fullPage = options.fullPage;
  return { target: page, screenshotOptions };
}

function outputPathFor(options) {
  const base = [timestamp(), slugifyUrl(options.inputUrl), options.presetName]
    .filter(Boolean)
    .join("--");
  return path.join(options.outputDir, `${base}.${options.format}`);
}

async function captureUrl(playwrightBrowser, rawOptions) {
  const context = await createContext(playwrightBrowser, rawOptions);
  const page = await context.newPage();

  await page.goto(rawOptions.inputUrl, {
    waitUntil: "domcontentloaded",
    timeout: rawOptions.timeout,
  });

  await waitForReady(page, rawOptions);

  if (rawOptions.scroll && rawOptions.fullPage && !rawOptions.selector) {
    await scrollPage(page);
  }

  if (rawOptions.freezeAnimations) {
    await freezeAnimations(page);
  }

  if (rawOptions.blockCookieBanners) {
    await dismissCookieBanners(page);
  }

  await hideSelectors(page, rawOptions.hide);
  await removeSelectors(page, rawOptions.remove);

  const outputPath = outputPathFor(rawOptions);
  ensureDir(rawOptions.outputDir);

  const { target, screenshotOptions } = await buildScreenshotOptions(
    page,
    rawOptions,
    outputPath
  );

  await target.screenshot(screenshotOptions);
  await context.close();

  return outputPath;
}

async function runShot({ urls, configDefaults, siteRuleForUrl, cliOptions, cwd }) {
  const browsers = new Map();
  const outputPaths = [];

  try {
    for (const inputUrl of urls) {
      const options = normalizeOptions({
        cliOptions,
        configDefaults,
        cwd,
        inputUrl,
        siteRule: siteRuleForUrl(inputUrl),
      });

      const browserKey = `${options.browser}:${options.channel || ""}`;

      if (!browsers.has(browserKey)) {
        const launch = browserEngine(options.browser);
        browsers.set(
          browserKey,
          await launch.launch({
            channel: options.channel,
            headless: true,
          })
        );
      }

      const outputPath = await captureUrl(browsers.get(browserKey), options);
      outputPaths.push(outputPath);
    }
  } finally {
    for (const browser of browsers.values()) {
      await browser.close();
    }
  }

  return outputPaths;
}

async function runAuth({ cliOptions, cwd, inputUrl }) {
  const preset = getPreset(cliOptions.preset || "desktop");
  const browserName = cliOptions.browser || preset.browser || "chromium";
  const launch = browserEngine(browserName);
  const storageStatePath = relativeOrAbsolute(
    cwd,
    cliOptions["storage-state"] ||
      cliOptions.storageState ||
      defaultStorageStatePath(cwd, inputUrl)
  );

  ensureDir(path.dirname(storageStatePath));

  const browser = await launch.launch({
    channel: cliOptions.channel || preset.channel,
    headless: false,
  });
  const contextOptions = preset.device
    ? { ...preset.device }
    : {
        viewport: preset.viewport,
        deviceScaleFactor: preset.deviceScaleFactor,
        isMobile: preset.isMobile,
        hasTouch: preset.hasTouch,
      };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(inputUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

  await prompt(
    `Finish login in the browser, then press Enter here to save session to ${storageStatePath} `
  );

  await context.storageState({ path: storageStatePath });
  await browser.close();

  return storageStatePath;
}

module.exports = {
  normalizeOptions,
  runAuth,
  runShot,
};
