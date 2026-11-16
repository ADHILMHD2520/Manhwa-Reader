import { Schema, model } from "mongoose";
const chapterPageSchema = new Schema({
    pageNumber: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true },
}, { _id: false });
const chapterSchema = new Schema({
    manhwaId: { type: Schema.Types.ObjectId, ref: "Manhwa", required: true, index: true },
    chapterNumber: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    originalPdfUrl: { type: String, required: true, select: false },
    originalPdfPublicId: { type: String, required: true, select: false },
    pages: { type: [chapterPageSchema], default: [] },
    processingStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed"],
        default: "pending",
        index: true,
    },
    processingProgress: { type: Number, default: 0, min: 0, max: 100 },
    pageCount: { type: Number, min: 1 },
    processingError: { type: String, select: false },
    publishedAt: { type: Date },
}, { timestamps: true });
chapterSchema.index({ manhwaId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ manhwaId: 1, processingStatus: 1, chapterNumber: 1 });
export const Chapter = model("Chapter", chapterSchema);
