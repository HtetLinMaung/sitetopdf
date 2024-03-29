#!/usr/bin/env node

import { program } from "commander";
import puppeteer, { PDFOptions } from "puppeteer";
import path from "path";
import fs from "fs/promises";

const formatDimensions: any = {
  A4: { width: 794, height: 1123 }, // Dimensions for A4 at 96 DPI
  Letter: { width: 816, height: 1056 }, // Dimensions for Letter at 96 DPI
};

program
  .version("1.0.0")
  .description("Convert a website to PDF")
  .option("-u, --url <url>", "URL of the website to convert")
  .option("-o, --output <output>", "Output PDF file path", "output.pdf")
  .option("-f, --format <format>", "Paper format ('A4', 'Letter', etc.)", "A4")
  .option("-l, --landscape", "Whether to set the PDF in landscape mode")
  .option("-s, --scale <scale>", "Scale of the webpage rendering", "1")
  .option("-m, --margin-top <margin-top>", "Top margin of the PDF file", "0")
  .option(
    "-b, --margin-bottom <margin-bottom>",
    "Bottom margin of the PDF file",
    "0"
  )
  .option(
    "-r, --margin-right <margin-right>",
    "Right margin of the PDF file",
    "0"
  )
  .option("-e, --margin-left <margin-left>", "Left margin of the PDF file", "0")
  .option(
    "-h, --header-template <header-template>",
    "HTML template for the header of the PDF file"
  )
  .option(
    "-t, --footer-template <footer-template>",
    "HTML template for the footer of the PDF file"
  )
  .option(
    "-n, --display-header-footer",
    "Whether to display the header and footer of the PDF file"
  )
  //   .option(
  //     "-pb, --print-background",
  //     "Whether to print the background graphics of the PDF file"
  //   )
  .option(
    "-c, --prefer-css-page-size",
    "Whether to prefer the CSS page size over the viewport size"
  )
  .option(
    "-d, --page-ranges <page-ranges>",
    "Page ranges to print, e.g., '1-5, 8, 11-13'"
  )
  .option(
    "-a, --ignore-http-errors",
    "Whether to ignore any HTTP errors that occur during the navigation"
  )
  .option(
    "-g, --wait-until <wait-until>",
    "When to consider the navigation succeeded, e.g., 'networkidle0', 'load', etc.",
    "load"
  )
  .option(
    "-k, --timeout <timeout>",
    "Maximum navigation time in milliseconds",
    "30000"
  )
  .option("-v, --verbose", "Display detailed information during execution")
  .option("-x, --content <content>", "HTML content to set on the page")
  .option(
    "--content-type <type>",
    "Type of content ('string' or 'file')",
    "string"
  )
  .option("-i, --image", "Generate an image instead of a PDF")
  .option(
    "-p, --image-output <image-output>",
    "Output image file path",
    "output.png"
  );

program.parse(process.argv);

(async () => {
  const options = program.opts();
  const pdfOptions: PDFOptions = {
    format: options.format,
    path: path.isAbsolute(options.output)
      ? options.output
      : path.join(process.cwd(), options.output),
    landscape: options.landscape,
    scale: +options.scale,
    margin: {
      top: options.marginTop,
      bottom: options.marginBottom,
      left: options.marginLeft,
      right: options.marginRight,
    },
    displayHeaderFooter: options.displayHeaderFooter,
    headerTemplate: options.headerTemplate,
    footerTemplate: options.footerTemplate,
    printBackground: true,
    preferCSSPageSize: options.preferCssPageSize,
    pageRanges: options.pageRanges,
  };

  if (options.verbose) {
    console.log(`options: `);
    console.log(options);
    console.log(`pdf options: `);
    console.log(pdfOptions);
  }

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    headless: "new",
  });
  const page = await browser.newPage();

  let content = options.content;

  if (options.contentType === "file") {
    content = await fs.readFile(options.content, "utf-8");
  }
  if (content) {
    await page.setContent(content, {
      waitUntil: options.waitUntil,
      timeout: +options.timeout,
    });
  } else {
    await page.goto(options.url, {
      waitUntil: options.waitUntil,
      timeout: +options.timeout,
    });
  }
  if (options.image) {
    const selectedFormat =
      formatDimensions[options.format] || formatDimensions.A4; // Default to A4 if format not recognized

    await page.setViewport({
      width: selectedFormat.width,
      height: selectedFormat.height,
    });

    const imagePath = options.imageOutput
      ? path.isAbsolute(options.imageOutput)
        ? options.imageOutput
        : path.join(process.cwd(), options.imageOutput)
      : "output.png"; // Default image path

    await page.screenshot({ path: imagePath, fullPage: true });
  } else {
    await page.emulateMediaType("screen");
    await page.pdf(pdfOptions);
  }
  await browser.close();
})();
