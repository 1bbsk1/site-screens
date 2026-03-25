const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const outputDir = path.join(repoRoot, "tmp-smoke");
const fixtureUrl = `file://${path.join(repoRoot, "fixtures", "smoke.html")}`;

fs.rmSync(outputDir, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, "src", "cli.js"),
    "shot",
    fixtureUrl,
    "--selector",
    "#card",
    "--wait-for",
    "#card",
    "--out",
    outputDir,
    "--preset",
    "tweet",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  }
);

if (result.status !== 0) {
  process.stderr.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status || 1);
}

const files = fs
  .readdirSync(outputDir)
  .filter((fileName) => fileName.endsWith(".png"));

if (files.length !== 1) {
  throw new Error(`Expected exactly one PNG in ${outputDir}, found ${files.length}`);
}

process.stdout.write(`${path.join(outputDir, files[0])}\n`);
