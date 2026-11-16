import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
fs.mkdirSync(config.tempUploadDir, { recursive: true });
const diskStorage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, config.tempUploadDir),
    filename: (_req, file, callback) => {
        const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        callback(null, `${Date.now()}-${randomUUID()}-${safeName}`);
    },
});
function pdfFilter(_req, file, callback) {
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf)
        callback(null, true);
    else
        callback(new ApiError(400, "Only PDF files are accepted"));
}
function imageFilter(_req, file, callback) {
    if (file.mimetype.startsWith("image/"))
        callback(null, true);
    else
        callback(new ApiError(400, "Cover must be an image"));
}
export const pdfUpload = multer({
    storage: diskStorage,
    fileFilter: pdfFilter,
    limits: { fileSize: config.maxPdfBytes, files: 25 },
});
export const coverUpload = multer({
    storage: diskStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});
