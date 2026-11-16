import fs from "node:fs/promises";
import { Chapter } from "../models/chapter.js";
import { Manhwa } from "../models/manhwa.js";
import { ApiError } from "../lib/errors.js";
import { assertPdfSignature } from "./pdf.js";
import { LOCAL_PDF_MARKER, saveOriginalPdfLocally, deleteChapterAssets } from "./storage.js";
import { enqueuePdfProcessing } from "../queue.js";
export async function createChapterUpload(input) {
    const { manhwaId, chapterNumber, title, file } = input;
    if (!Number.isFinite(chapterNumber) || chapterNumber < 0) {
        throw new ApiError(400, "Chapter number must be zero or greater");
    }
    if (!title.trim())
        throw new ApiError(400, "Chapter title is required");
    if (!(await Manhwa.exists({ _id: manhwaId })))
        throw new ApiError(404, "Manhwa not found");
    try {
        await assertPdfSignature(file.path);
        // Creating the row first reserves the compound unique chapter number and provides its storage folder.
        const chapter = await Chapter.create({
            manhwaId,
            chapterNumber,
            title: title.trim(),
            originalPdfUrl: LOCAL_PDF_MARKER,
            originalPdfPublicId: LOCAL_PDF_MARKER,
            processingStatus: "pending",
            processingProgress: 0,
        });
        try {
            // The original PDF stays on this server; only the converted pages go to Cloudinary.
            await saveOriginalPdfLocally(file.path, chapter.id);
            await enqueuePdfProcessing(chapter.id);
            return chapter;
        }
        catch (error) {
            await chapter.deleteOne();
            await deleteChapterAssets(manhwaId, chapter.id).catch(() => undefined);
            throw error;
        }
    }
    finally {
        await fs.unlink(file.path).catch(() => undefined);
    }
}
