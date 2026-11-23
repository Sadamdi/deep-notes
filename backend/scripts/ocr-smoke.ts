/** Live check of the scanned-PDF path: extracts nothing from the text layer, then reads the page with the vision model. */
import fs from "node:fs";
import { getAi } from "../src/ai/index.js";
import { extractPdf } from "../src/modules/sources/extract.js";

const file = process.argv[2];
if (!file) throw new Error("usage: tsx scripts/ocr-smoke.ts <scanned.pdf>");
const buf = fs.readFileSync(file);
console.info("text layer pages:", (await extractPdf(buf)).length);
const pages = await getAi().ocr(buf, "application/pdf");
console.info("ocr pages:", pages.length);
for (const p of pages) console.info(`--- page ${p.page}\n${p.text}`);
