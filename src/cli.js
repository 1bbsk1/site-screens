#!/usr/bin/env node

const path = require("path");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(__dirname, "..", ".playwright");

const { matchSiteRule, readConfig } = require("./config");
const { runAuth, runShot } = require("./capture");
const {
  cleanDir,
  parseArgs,
  print,
  printError,
  readLines,
  relativeOrAbsolute,
} = require("./utils");

const HELP_TEXT = `
site-screens

Usage:
  site-screens shot <url> [--preset tweet] [--selector .card]
  site-screens batch <file> [--preset desktop]
  site-screens auth <url> [--storage-state .auth/x.json]

Common flags:
  --preset desktop|mobile|tweet
  --browser chromium|firefox|webkit
  --channel chrome
  --selector <css>
  --wait-for <css>
  --delay <ms>
  --full-page
  --format png|jpeg
  --quality <1-100>
  --out <dir>
  --storage-state <path>
  --hide <css[,css]>
  --remove <css[,css]>
  --block-cookie-banners
  --clean

Config:
  site-screens.config.json in the repo root is loaded automatically.
`.trim();

function configRuleFactory(config) {
  return (inputUrl) => matchSiteRule(inputUrl, config.sites || {});
}

async function main() {
  const cwd = process.cwd();
  const argv = process.argv.slice(2);

  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    print(HELP_TEXT);
    return;
  }

  const [command, ...rest] = argv;
  const { positional, options } = parseArgs(rest);
  const { config } = readConfig(cwd);
  const configDefaults = config.defaults || {};
  const siteRuleForUrl = configRuleFactory(config);

  if (command === "shot") {
    if (!positional.length) {
      throw new Error("shot requires a URL");
    }

    if (options.clean) {
      cleanDir(relativeOrAbsolute(cwd, options.out || "screens"));
    }

    const outputPaths = await runShot({
      cliOptions: options,
      configDefaults,
      cwd,
      siteRuleForUrl,
      urls: [positional[0]],
    });

    for (const outputPath of outputPaths) {
      print(outputPath);
    }
    return;
  }

  if (command === "batch") {
    if (!positional.length) {
      throw new Error("batch requires a file path");
    }

    const inputFile = relativeOrAbsolute(cwd, positional[0]);
    const urls = readLines(inputFile);
    if (!urls.length) {
      throw new Error(`No URLs found in ${inputFile}`);
    }

    if (options.clean) {
      cleanDir(relativeOrAbsolute(cwd, options.out || "screens"));
    }

    const outputPaths = await runShot({
      cliOptions: options,
      configDefaults,
      cwd,
      siteRuleForUrl,
      urls,
    });

    for (const outputPath of outputPaths) {
      print(outputPath);
    }
    return;
  }

  if (command === "auth") {
    if (!positional.length) {
      throw new Error("auth requires a URL");
    }

    const storageStatePath = await runAuth({
      cliOptions: options,
      cwd,
      inputUrl: positional[0],
    });
    print(storageStatePath);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  printError(error.stack || error.message || String(error));
  process.exit(1);
});
