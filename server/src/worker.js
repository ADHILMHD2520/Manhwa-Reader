import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import axios from "axios";
import { Worker } from "bullmq";
import pLimit from "p-limit";
import sharp from "sharp";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { Chapter } from "./models/chapter.js";
import { assertPdfSignature, getPdfPageCount, listRenderedPages, rasterizePdf } from "./services/pdf.js";
import { LOCAL_PDF_MARKER, deleteChapterImages, localOriginalPath, signedOriginalPdfUrl, uploadChapterPage } from "./services/storage.js";
import { connection, PDF_PROCESSING_QUEUE } from "./queue.js";
async function processPdf(job) {
    const chapter = await Chapter.findById(job.data.chapterId).select("+originalPdfPublicId");
    if (!chapter)
        return;
    console.log(`Processing chapter ${chapter.id}; original PDF is read from ${chapter.originalPdfPublicId === LOCAL_PDF_MARKER ? "this computer" : "Cloudinary (older upload)"}`);
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "manhwa-pdf-"));
    try {
        await Chapter.findByIdAndUpdate(chapter.id, {
            $set: { processingStatus: "processing", processingProgress: 1, pages: [] },
            // Mongoose drops `undefined` values from updates, so clear fields explicitly.
            $unset: { processingError: "", publishedAt: "" },
        });
        await deleteChapterImages(chapter.manhwaId.toString(), chapter.id);
        const sourcePath = path.join(temporaryDirectory, "source.pdf");
        if (chapter.originalPdfPublicId === LOCAL_PDF_MARKER) {
            // Original is on this machine's disk (worker and API must run on the same computer).
            await fs.copyFile(localOriginalPath(chapter.id), sourcePath).catch(() => {
                throw new Error("The original PDF is missing on this server. Delete the chapter and upload it again.");
            });
        }
        else {
            // Chapters uploaded before this change still have their PDF on Cloudinary.
            const response = await axios.get(signedOriginalPdfUrl(chapter.originalPdfPublicId), {
                responseType: "stream",
                timeout: 120_000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            await pipeline(response.data, createWriteStream(sourcePath));
        }
        await assertPdfSignature(sourcePath);
        const pageCount = await getPdfPageCount(sourcePath);
        await Chapter.findByIdAndUpdate(chapter.id, { pageCount, processingProgress: 5 });
        await rasterizePdf(sourcePath, path.join(temporaryDirectory, "page"), pageCount);
        const renderedPages = await listRenderedPages(temporaryDirectory);
        const limit = pLimit(2);
        let completed = 0;
        const pages = await Promise.all(Array.from({ length: pageCount }, (_, index) => limit(async () => {
            const pageNumber = index + 1;
            const rasterPath = renderedPages.get(pageNumber);
            if (!rasterPath)
                throw new Error(`Page ${pageNumber} was not rendered from the PDF`);
            const webp = await sharp(rasterPath, { limitInputPixels: 80_000_000 })
                // WebP cannot encode images larger than 16383px in either direction.
                .resize({ width: 16383, height: 16383, fit: "inside", withoutEnlargement: true })
                .webp({ quality: 82, effort: 4 })
                .toBuffer();
            const stored = await uploadChapterPage(webp, chapter.manhwaId.toString(), chapter.id, pageNumber);
            completed += 1;
            const progress = 5 + Math.floor((completed / pageCount) * 94);
            await Promise.all([job.updateProgress(progress), Chapter.findByIdAndUpdate(chapter.id, { processingProgress: progress })]);
            return { pageNumber, imageUrl: stored.secure_url, imagePublicId: stored.public_id };
        })));
        pages.sort((left, right) => left.pageNumber - right.pageNumber);
        await Chapter.findByIdAndUpdate(chapter.id, {
            $set: { pages, pageCount, processingStatus: "completed", processingProgress: 100, publishedAt: new Date() },
            $unset: { processingError: "" },
        });
        await job.updateProgress(100);
    }
    catch (error) {
        const attempts = Number(job.opts.attempts ?? 1);
        const isFinalAttempt = job.attemptsMade + 1 >= attempts;
        await Chapter.findByIdAndUpdate(chapter.id, {
            processingStatus: isFinalAttempt ? "failed" : "pending",
            processingProgress: 0,
            processingError: error instanceof Error ? error.message.slice(0, 1_000) : "PDF processing failed",
        });
        await deleteChapterImages(chapter.manhwaId.toString(), chapter.id).catch(() => undefined);
        throw error;
    }
    finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
}
async function main() {
    await connectDatabase();
    const worker = new Worker(PDF_PROCESSING_QUEUE, processPdf, {
        connection,
        concurrency: 1,
    });
    worker.on("completed", (job) => console.log(`Completed PDF job ${job.id}`));
    worker.on("failed", (job, error) => console.error(`PDF job ${job?.id} failed:`, error.message));
    console.log("PDF worker is listening for jobs");
    console.log(`Worker build: local-original-pdfs | running from: ${process.cwd()} | originals folder: ${config.originalsDir}`);
    const stop = async () => {
        await worker.close();
        await connection.quit();
        process.exit(0);
    };
    process.on("SIGINT", () => void stop());
    process.on("SIGTERM", () => void stop());
}
void main().catch((error) => {
    console.error("Unable to start worker", error);
    process.exit(1);
});
