const { devices } = require("playwright");

const DESKTOP_PRESET = {
  browser: "chromium",
  viewport: { width: 1440, height: 1200 },
  deviceScaleFactor: 2,
  isMobile: false,
  hasTouch: false,
  defaultFullPage: false,
};

const MOBILE_PRESET = {
  browser: "webkit",
  device: devices["iPhone 13"],
  defaultFullPage: false,
};

const TWEET_PRESET = {
  browser: "chromium",
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
  isMobile: false,
  hasTouch: false,
  defaultFullPage: false,
};

const PRESETS = {
  desktop: DESKTOP_PRESET,
  mobile: MOBILE_PRESET,
  tweet: TWEET_PRESET,
};

function getPreset(name = "desktop") {
  return PRESETS[name] || PRESETS.desktop;
}

module.exports = {
  PRESETS,
  getPreset,
};
