const fs = require("fs");
const path = require("path");

function readConfig(cwd) {
  const configPath = path.join(cwd, "site-screens.config.json");
  if (!fs.existsSync(configPath)) {
    return { path: configPath, config: {} };
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return { path: configPath, config: JSON.parse(raw) };
}

function hostnameFor(inputUrl) {
  try {
    return new URL(inputUrl).hostname;
  } catch (error) {
    return "";
  }
}

function matchSiteRule(inputUrl, sites = {}) {
  const hostname = hostnameFor(inputUrl);
  if (!hostname) {
    return {};
  }

  if (sites[hostname]) {
    return sites[hostname];
  }

  for (const [pattern, value] of Object.entries(sites)) {
    if (!pattern.startsWith("*.")) {
      continue;
    }

    const suffix = pattern.slice(1);
    if (hostname.endsWith(suffix)) {
      return value;
    }
  }

  return {};
}

module.exports = {
  matchSiteRule,
  readConfig,
};
