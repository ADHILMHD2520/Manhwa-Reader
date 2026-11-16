import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ApiError } from "../lib/errors.js";
import { config } from "../config.js";
const execFileAsync = promisify(execFile);
export async function assertPdfSignature(filePath) {
    const file = await fs.open(filePath, "r");
    try {
        const bytes = Buffer.alloc(5);
        await file.read(bytes, 0, 5, 0);
        if (bytes.toString("ascii") !== "%PDF-")
            throw new ApiError(400, "The uploaded file is not a valid PDF");
    }
    finally {
        await file.close();
    }
}
export async function getPdfPageCount(filePath) {
    let output;
    try {
        ({ stdout: output } = await execFileAsync("pdfinfo", [filePath], { maxBuffer: 1024 * 1024 }));
    }
    catch {
        throw new Error("Poppler could not inspect this PDF. Ensure pdfinfo is installed and the PDF is readable.");
    }
    const pages = Number(output.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);
    if (!Number.isInteger(pages) || pages < 1)
        throw new Error("The PDF contains no readable pages");
    if (pages > config.maxPdfPages)
        throw new Error(`PDF has ${pages} pages; maximum is ${config.maxPdfPages}`);
    return pages;
}
export async function rasterizePdf(sourcePath, outputPrefix, pages) {
    try {
        await execFileAsync("pdftoppm", ["-f", "1", "-l", String(pages), "-jpeg", "-jpegopt", "quality=88,optimize=y", "-r", "150", sourcePath, outputPrefix], { maxBuffer: 1024 * 1024 });
    }
    catch {
        throw new Error("Poppler could not render this PDF");
    }
}

/**
 * pdftoppm zero-pads page numbers based on the PDF's total page count
 * (page-1.jpg for 1-9 pages, page-01.jpg for 10-99, page-001.jpg for 100-999),
 * so never build the filename by hand. Returns Map<pageNumber, absolutePath>.
 */
export async function listRenderedPages(directory, prefix = "page") {
    const pattern = new RegExp(`^${prefix}-(\\d+)\\.jpg$`);
    const pages = new Map();
    for (const name of await fs.readdir(directory)) {
        const match = name.match(pattern);
        if (match)
            pages.set(Number(match[1]), `${directory}/${name}`);
    }
    return pages;
}
