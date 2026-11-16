import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { config } from "./config.js";
export const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
export const PDF_PROCESSING_QUEUE = "pdf-processing";
export const pdfQueue = new Queue(PDF_PROCESSING_QUEUE, { connection });
export async function enqueuePdfProcessing(chapterId, isManualRetry = false) {
    await pdfQueue.add("process-chapter-pdf", { chapterId }, {
        jobId: isManualRetry ? `chapter-${chapterId}-retry-${Date.now()}` : `chapter-${chapterId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60 },
        removeOnFail: false,
    });
}
