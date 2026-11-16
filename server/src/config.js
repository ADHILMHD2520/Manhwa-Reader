import "dotenv/config";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
function positiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export const config = {
    port: Number(process.env.PORT ?? 4000),
    mongoUri: required("MONGODB_URI"),
    redisUrl: required("REDIS_URL"),
    jwtSecret: required("JWT_SECRET"),
    adminEmail: required("ADMIN_EMAIL"),
    adminPassword: required("ADMIN_PASSWORD"),
    adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? "8h",
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    maxPdfBytes: Number(process.env.MAX_PDF_BYTES ?? 250 * 1024 * 1024),
    maxPdfPages: Number(process.env.MAX_PDF_PAGES ?? 300),
    tempUploadDir: path.join(os.tmpdir(), "manhwa-uploads"),
    // Original chapter PDFs are kept on this machine (Cloudinary's free plan rejects raw files over 10 MB).
    originalsDir: process.env.ORIGINALS_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "storage", "originals"),
    cloudinary: {
        cloudName: required("CLOUDINARY_CLOUD_NAME"),
        apiKey: required("CLOUDINARY_API_KEY"),
        apiSecret: required("CLOUDINARY_API_SECRET"),
        uploadTimeoutMs: positiveNumber(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS, 300_000),
        uploadChunkBytes: Math.max(5 * 1024 * 1024, positiveNumber(process.env.CLOUDINARY_UPLOAD_CHUNK_BYTES, 6 * 1024 * 1024)),
    },
};
