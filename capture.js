const puppeteer = require("puppeteer");

async function shoot(page, url, prefix, viewport) {
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.screenshot({
    path: `${prefix}.png`,
    fullPage: true,
  });
}

async function run() {
  const urls = process.argv.slice(2);
  if (!urls.length) {
    console.error("Usage: node capture.js <url1> <url2> ...");
    process.exit(1);
  }

  const browser = await puppeteer.launch();

  for (const url of urls) {
    const page = await browser.newPage();
    const slug = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]/gi, "_");

    await shoot(page, url, `${slug}_desktop`, {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
    });

    await shoot(page, url, `${slug}_mobile`, {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
    });

    await page.close();
  }

  await browser.close();
}

run();
