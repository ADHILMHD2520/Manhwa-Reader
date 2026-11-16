import { isValidObjectId } from "mongoose";
import { Chapter } from "../models/chapter.js";
import { Manhwa } from "../models/manhwa.js";
import { ReadingProgress } from "../models/reading-progress.js";
import { ApiError } from "../lib/errors.js";
function assertObjectId(value, label) {
    if (!isValidObjectId(value))
        throw new ApiError(404, `${label} not found`);
}
function pathId(req) {
    const value = req.params.id;
    if (typeof value !== "string")
        throw new ApiError(404, "Resource not found");
    return value;
}
export async function listPublicManhwa(_req, res) {
    const manhwa = await Manhwa.find()
        .select("title description coverImage author artist genres status createdAt")
        .sort({ createdAt: -1 })
        .lean();
    res.json({ manhwa });
}
export async function getPublicManhwa(req, res) {
    const id = pathId(req);
    assertObjectId(id, "Manhwa");
    const manhwa = await Manhwa.findById(id)
        .select("title description coverImage author artist genres status createdAt")
        .lean();
    if (!manhwa)
        throw new ApiError(404, "Manhwa not found");
    res.json({ manhwa });
}
export async function listPublishedChapters(req, res) {
    const id = pathId(req);
    assertObjectId(id, "Manhwa");
    const chapters = await Chapter.find({
        manhwaId: id,
        processingStatus: "completed",
        publishedAt: { $exists: true },
    })
        .sort({ chapterNumber: 1 })
        .select("manhwaId chapterNumber title pageCount publishedAt createdAt")
        .lean();
    res.json({ chapters });
}
async function publishedChapter(id) {
    assertObjectId(id, "Chapter");
    const chapter = await Chapter.findOne({ _id: id, processingStatus: "completed", publishedAt: { $exists: true } }).lean();
    if (!chapter)
        throw new ApiError(404, "Published chapter not found");
    return chapter;
}
export async function getChapter(req, res) {
    const chapter = await publishedChapter(pathId(req));
    res.json({
        chapter: {
            id: chapter._id,
            manhwaId: chapter.manhwaId,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            pageCount: chapter.pageCount,
            publishedAt: chapter.publishedAt,
        },
    });
}
export async function getChapterPages(req, res) {
    const chapter = await publishedChapter(pathId(req));
    res.json({
        chapterId: chapter._id,
        pages: [...chapter.pages]
            .sort((a, b) => a.pageNumber - b.pageNumber)
            .map(({ pageNumber, imageUrl }) => ({ pageNumber, imageUrl })),
    });
}
function readerId(req) {
    const value = req.header("x-reader-id");
    if (!value || value.length > 128)
        throw new ApiError(400, "A valid reader identifier is required");
    return value;
}
export async function getReadingProgress(req, res) {
    const chapter = await publishedChapter(pathId(req));
    const progress = await ReadingProgress.findOne({ readerId: readerId(req), chapterId: chapter._id }).lean();
    res.json({ pageNumber: progress?.pageNumber ?? 1 });
}
export async function saveReadingProgress(req, res) {
    const chapter = await publishedChapter(pathId(req));
    const pageNumber = Number(req.body.pageNumber);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > chapter.pages.length) {
        throw new ApiError(400, "Page number is outside this chapter");
    }
    await ReadingProgress.findOneAndUpdate({ readerId: readerId(req), chapterId: chapter._id }, { manhwaId: chapter.manhwaId, pageNumber }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(204).end();
}
