import fs from "node:fs/promises";
import pLimit from "p-limit";
import { Chapter } from "../models/chapter.js";
import { Manhwa } from "../models/manhwa.js";
import { ReadingProgress } from "../models/reading-progress.js";
import { ApiError } from "../lib/errors.js";
import { createChapterUpload } from "../services/chapter-upload.js";
import { LOCAL_PDF_MARKER, deleteChapterAssets, deleteCover, signedOriginalPdfUrl, uploadCover } from "../services/storage.js";
import { localPdfViewUrl } from "./files.js";
import { enqueuePdfProcessing } from "../queue.js";
const allowedStatuses = new Set(["ongoing", "completed", "hiatus", "cancelled"]);
function parseGenres(value) {
    if (Array.isArray(value))
        return value.map(String).map((genre) => genre.trim()).filter(Boolean);
    if (typeof value !== "string")
        return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed))
            return parsed.map(String).map((genre) => genre.trim()).filter(Boolean);
    }
    catch {
        // A comma-separated field is friendly to ordinary multipart forms.
    }
    return value.split(",").map((genre) => genre.trim()).filter(Boolean);
}
function getManhwaFields(body) {
    const status = String(body.status ?? "ongoing");
    if (!allowedStatuses.has(status))
        throw new ApiError(400, "Invalid manhwa status");
    const fields = {
        title: String(body.title ?? "").trim(),
        description: String(body.description ?? "").trim(),
        author: String(body.author ?? "").trim(),
        artist: String(body.artist ?? "").trim(),
        genres: parseGenres(body.genres),
        status,
    };
    if (!fields.title || !fields.description || !fields.author || !fields.artist) {
        throw new ApiError(400, "Title, description, author, and artist are required");
    }
    return fields;
}
export async function listManhwa(_req, res) {
    const manhwa = await Manhwa.find().sort({ createdAt: -1 }).lean();
    res.json({ manhwa });
}
export async function createManhwa(req, res) {
    const file = req.file;
    if (!file)
        throw new ApiError(400, "A cover image is required");
    try {
        const cover = await uploadCover(file.path);
        try {
            const manhwa = await Manhwa.create({ ...getManhwaFields(req.body), coverImage: cover.secure_url, coverImagePublicId: cover.public_id });
            res.status(201).json({ manhwa });
        }
        catch (error) {
            await deleteCover(cover.public_id).catch(() => undefined);
            throw error;
        }
    }
    finally {
        await fs.unlink(file.path).catch(() => undefined);
    }
}
export async function updateManhwa(req, res) {
    const manhwa = await Manhwa.findById(req.params.id);
    if (!manhwa)
        throw new ApiError(404, "Manhwa not found");
    const oldCover = manhwa.coverImagePublicId;
    let replacementCover;
    const file = req.file;
    try {
        if (file)
            replacementCover = await uploadCover(file.path);
        Object.assign(manhwa, getManhwaFields(req.body));
        if (replacementCover) {
            manhwa.coverImage = replacementCover.secure_url;
            manhwa.coverImagePublicId = replacementCover.public_id;
        }
        await manhwa.save();
        if (replacementCover)
            await deleteCover(oldCover).catch(() => undefined);
        res.json({ manhwa });
    }
    catch (error) {
        if (replacementCover)
            await deleteCover(replacementCover.public_id).catch(() => undefined);
        throw error;
    }
    finally {
        if (file)
            await fs.unlink(file.path).catch(() => undefined);
    }
}
export async function removeManhwa(req, res) {
    const manhwa = await Manhwa.findById(req.params.id);
    if (!manhwa)
        throw new ApiError(404, "Manhwa not found");
    const chapters = await Chapter.find({ manhwaId: manhwa.id }).select("_id").lean();
    const manhwaId = manhwa.id;
    const coverPublicId = manhwa.coverImagePublicId;
    await Promise.all([
        Chapter.deleteMany({ manhwaId }),
        ReadingProgress.deleteMany({ manhwaId }),
        manhwa.deleteOne(),
    ]);
    res.status(204).end();
    // Cloudinary cleanup takes a while, so it runs after the response has been sent.
    const cleanup = await Promise.allSettled([
        ...chapters.map((chapter) => deleteChapterAssets(manhwaId, chapter._id.toString())),
        deleteCover(coverPublicId),
    ]);
    for (const result of cleanup) {
        if (result.status === "rejected")
            console.error("Cloudinary cleanup failed:", result.reason?.message ?? result.reason);
    }
}
export async function listAdminChapters(req, res) {
    const chapters = await Chapter.find({ manhwaId: req.params.id }).select("+processingError").sort({ chapterNumber: 1 }).lean();
    res.json({ chapters });
}
export async function uploadChapter(req, res) {
    if (!req.file)
        throw new ApiError(400, "A chapter PDF is required");
    const chapter = await createChapterUpload({
        manhwaId: String(req.body.manhwaId ?? ""),
        chapterNumber: Number(req.body.chapterNumber),
        title: String(req.body.title ?? ""),
        file: req.file,
    });
    res.status(202).json({ chapter, message: "PDF accepted and queued for processing" });
}
function parseBulkMetadata(value) {
    if (typeof value !== "string")
        throw new ApiError(400, "The chapters JSON field is required for bulk uploads");
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            throw new Error();
        return parsed;
    }
    catch {
        throw new ApiError(400, "chapters must be a JSON array matching the uploaded PDF order");
    }
}
export async function bulkUploadChapters(req, res) {
    const files = req.files ?? [];
    const metadata = parseBulkMetadata(req.body.chapters);
    const manhwaId = String(req.body.manhwaId ?? "");
    if (!files.length)
        throw new ApiError(400, "At least one chapter PDF is required");
    if (files.length !== metadata.length)
        throw new ApiError(400, "Every PDF must have matching chapter metadata");
    // Avoid saturating the Cloudinary connection pool with up to 25 large PDFs at once.
    const limit = pLimit(2);
    const results = await Promise.all(files.map((file, index) => limit(async () => {
        const details = metadata[index];
        try {
            const chapter = await createChapterUpload({
                manhwaId,
                chapterNumber: Number(details.chapterNumber),
                title: String(details.title || `Chapter ${details.chapterNumber}`),
                file,
            });
            return { ok: true, filename: file.originalname, chapter };
        }
        catch (error) {
            await fs.unlink(file.path).catch(() => undefined);
            return { ok: false, filename: file.originalname, error: error instanceof Error ? error.message : "Upload failed" };
        }
    })));
    res.status(results.every((result) => result.ok) ? 202 : 207).json({ results });
}
export async function chapterStatus(req, res) {
    const chapter = await Chapter.findById(req.params.id).select("+processingError").lean();
    if (!chapter)
        throw new ApiError(404, "Chapter not found");
    res.json({
        id: chapter._id,
        processingStatus: chapter.processingStatus,
        processingProgress: chapter.processingProgress,
        pageCount: chapter.pageCount,
        processingError: chapter.processingError,
        publishedAt: chapter.publishedAt,
    });
}
export async function chapterPdfPreview(req, res) {
    const chapter = await Chapter.findById(req.params.id).select("+originalPdfPublicId").lean();
    if (!chapter)
        throw new ApiError(404, "Chapter not found");
    if (chapter.originalPdfPublicId === LOCAL_PDF_MARKER) {
        res.json({ url: localPdfViewUrl(req, chapter._id.toString()) });
        return;
    }
    res.json({ url: signedOriginalPdfUrl(chapter.originalPdfPublicId) });
}
export async function updateChapter(req, res) {
    const update = {};
    if (req.body.title !== undefined)
        update.title = String(req.body.title).trim();
    if (req.body.chapterNumber !== undefined)
        update.chapterNumber = Number(req.body.chapterNumber);
    if (update.title === "" || (update.chapterNumber !== undefined && (!Number.isFinite(update.chapterNumber) || update.chapterNumber < 0))) {
        throw new ApiError(400, "Invalid chapter details");
    }
    const chapter = await Chapter.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!chapter)
        throw new ApiError(404, "Chapter not found");
    res.json({ chapter });
}
export async function retryChapter(req, res) {
    const chapter = await Chapter.findOneAndUpdate({ _id: req.params.id, processingStatus: "failed" }, { $set: { processingStatus: "pending", processingProgress: 0 }, $unset: { processingError: "" } }, { new: true });
    if (!chapter)
        throw new ApiError(409, "Only failed chapters can be retried");
    try {
        await enqueuePdfProcessing(chapter.id, true);
    }
    catch (error) {
        await Chapter.findByIdAndUpdate(chapter.id, { processingStatus: "failed", processingError: "Could not enqueue retry" });
        throw error;
    }
    res.status(202).json({ chapter });
}
export async function removeChapter(req, res) {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter)
        throw new ApiError(404, "Chapter not found");
    const manhwaId = chapter.manhwaId.toString();
    await Promise.all([chapter.deleteOne(), ReadingProgress.deleteMany({ chapterId: chapter.id })]);
    res.status(204).end();
    // Cloudinary cleanup takes a few seconds, so it runs after the response has been sent.
    deleteChapterAssets(manhwaId, chapter.id).catch((error) => console.error(`Cloudinary cleanup failed for chapter ${chapter.id}:`, error.message));
}
