import { readdir, readFile, mkdir } from "fs/promises";
import { join, relative } from "path";
import { buildPrintHTML } from "../src/shared/buildPrintHTML";

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...await findMarkdownFiles(fullPath));
    } else if (item.name.endsWith(".md") || item.name.endsWith(".markdown")) {
      results.push(fullPath);
    }
  }
  return results;
}

const inputDir = process.argv[2];
if (!inputDir) {
  console.error("Usage: bun run scripts/batch-pdf.ts <folder>");
  process.exit(1);
}

const outputDir = join(inputDir, "pdf_output");
await mkdir(outputDir, { recursive: true });

const files = await findMarkdownFiles(inputDir);
console.log(`Found ${files.length} markdown files. Converting to PDF with native Bun.WebView...`);

const WebView = (Bun as any).WebView;
const view = new WebView({ backend: "chrome" });

for (const filePath of files) {
  const relPath = relative(inputDir, filePath);
  const pdfName = relPath.replace(/\.md$/i, ".pdf").replace(/\.markdown$/i, ".pdf");
  const pdfPath = join(outputDir, pdfName);
  const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf("\\"));
  if (pdfDir) await mkdir(pdfDir, { recursive: true });

  const content = await readFile(filePath, "utf-8");
  const html = await buildPrintHTML(content, {
    pageSize: "a4",
    orientation: "portrait",
    margins: "normal",
    lineNumbers: false,
    tableOfContents: false,
  });

  await view.navigate("data:text/html," + encodeURIComponent(html));
  const result = await view.cdp("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
  });
  await Bun.write(pdfPath, Buffer.from((result as any).data, "base64"));
  console.log(`  ✓ ${pdfName}`);
}

view.close();
console.log(`\nDone! ${files.length} PDFs saved to: ${outputDir}`);
