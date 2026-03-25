const fs = require("fs");
const path = require("path");
const readline = require("readline");

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const isValue = next && !next.startsWith("--");

    if (isValue) {
      const value = next;
      index += 1;

      if (options[key] === undefined) {
        options[key] = value;
      } else if (Array.isArray(options[key])) {
        options[key].push(value);
      } else {
        options[key] = [options[key], value];
      }
      continue;
    }

    options[key] = true;
  }

  return { positional, options };
}

function print(message) {
  process.stdout.write(`${message}\n`);
}

function printError(message) {
  process.stderr.write(`${message}\n`);
}

function ensureDir(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function cleanDir(directoryPath) {
  fs.rmSync(directoryPath, { recursive: true, force: true });
  fs.mkdirSync(directoryPath, { recursive: true });
}

function readLines(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function slugifyUrl(input) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch (error) {
    return input
      .replace(/^file:\/\//, "file-")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  const host = parsed.hostname.replace(/\./g, "_");
  const route = parsed.pathname === "/"
    ? "root"
    : parsed.pathname.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");

  return [host, route].filter(Boolean).join("--").slice(0, 100);
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function toNumber(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value) {
  if (value === undefined) {
    return [];
  }

  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function defaultStorageStatePath(cwd, inputUrl) {
  const host = (() => {
    try {
      return new URL(inputUrl).hostname.replace(/\./g, "_");
    } catch (error) {
      return "session";
    }
  })();

  return path.join(cwd, ".auth", `${host}.json`);
}

function prompt(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function relativeOrAbsolute(cwd, inputPath) {
  if (!inputPath) {
    return inputPath;
  }

  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.join(cwd, inputPath);
}

module.exports = {
  cleanDir,
  defaultStorageStatePath,
  ensureDir,
  fileExists,
  parseArgs,
  print,
  printError,
  prompt,
  readLines,
  relativeOrAbsolute,
  slugifyUrl,
  timestamp,
  toBoolean,
  toList,
  toNumber,
};
