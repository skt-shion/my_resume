const fs = require("fs/promises");
const path = require("path");
const MarkdownIt = require("markdown-it");
const puppeteer = require("puppeteer");

async function main() {
  const [, , inputArg, outputArg, styleArg] = process.argv;

  if (!inputArg || !outputArg || !styleArg) {
    console.error(
      "Usage: node scripts/generate-pdf.js <input.md> <output.pdf> <style.css>",
    );
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(outputArg);
  const stylePath = path.resolve(styleArg);

  const [markdown, css] = await Promise.all([
    fs.readFile(inputPath, "utf8"),
    fs.readFile(stylePath, "utf8"),
  ]);

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });

  const bodyHtml = md.render(markdown);
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Resume</title>
  <style>${css}</style>
</head>
<body class="markdown-body">
  ${bodyHtml}
</body>
</html>`;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    await page.emulateMediaType("screen");

    await page.pdf({
      path: outputPath,
      format: "A4",
      margin: {
        top: "30mm",
        right: "20mm",
        bottom: "30mm",
        left: "20mm",
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate:
        "<style>section { margin: 0 auto; font-size: 9px; }</style><section></section>",
      footerTemplate:
        '<style>section { width: 100%; font-size: 9px; text-align: center; }</style><section><span class="pageNumber"></span> / <span class="totalPages"></span></section>',
    });
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
