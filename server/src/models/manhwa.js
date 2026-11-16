import { Schema, model } from "mongoose";
const manhwaSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 180, index: true },
    description: { type: String, required: true, trim: true, maxlength: 10_000 },
    coverImage: { type: String, required: true },
    coverImagePublicId: { type: String },
    author: { type: String, required: true, trim: true, maxlength: 180 },
    artist: { type: String, required: true, trim: true, maxlength: 180 },
    genres: { type: [String], default: [] },
    status: {
        type: String,
        enum: ["ongoing", "completed", "hiatus", "cancelled"],
        default: "ongoing",
    },
}, { timestamps: true });
export const Manhwa = model("Manhwa", manhwaSchema);
