import { Schema, model } from "mongoose";
const readingProgressSchema = new Schema({
    readerId: { type: String, required: true, maxlength: 128 },
    manhwaId: { type: Schema.Types.ObjectId, ref: "Manhwa", required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", required: true },
    pageNumber: { type: Number, required: true, min: 1 },
}, { timestamps: { createdAt: false, updatedAt: true } });
readingProgressSchema.index({ readerId: 1, chapterId: 1 }, { unique: true });
export const ReadingProgress = model("ReadingProgress", readingProgressSchema);
