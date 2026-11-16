import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";
cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
});
function uploadFromStream(stream, 
// The Cloudinary package has overloads that do not preserve resource-type combinations.
options) {
    return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream({
            timeout: config.cloudinary.uploadTimeoutMs,
            ...options,
        }, (error, result) => {
            if (error || !result)
                return reject(error ?? new Error("Storage upload returned no result"));
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
        stream.on("error", reject).pipe(upload);
    });
}
function uploadLargePdf(filePath, options) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(filePath, {
            resource_type: "raw",
            timeout: config.cloudinary.uploadTimeoutMs,
            chunk_size: config.cloudinary.uploadChunkBytes,
            ...options,
        }, (error, result) => {
            if (error || !result)
                return reject(error ?? new Error("Storage upload returned no result"));
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });
    });
}
// Marker stored in the database when the original PDF lives on this server's disk instead of Cloudinary.
export const LOCAL_PDF_MARKER = "local";
export function localOriginalPath(chapterId) {
    if (!/^[a-f0-9]{24}$/i.test(String(chapterId)))
        throw new Error("Invalid chapter id");
    return path.join(config.originalsDir, `${chapterId}.pdf`);
}
export async function saveOriginalPdfLocally(filePath, chapterId) {
    await fsp.mkdir(config.originalsDir, { recursive: true });
    // copyFile (not rename) because the temp folder can be on a different drive.
    await fsp.copyFile(filePath, localOriginalPath(chapterId));
}
export async function deleteLocalOriginal(chapterId) {
    await fsp.rm(localOriginalPath(chapterId), { force: true });
}
export async function uploadOriginalPdf(filePath, manhwaId, chapterId) {
    return uploadLargePdf(filePath, {
        type: "authenticated",
        folder: `manhwa/${manhwaId}/chapters/${chapterId}`,
        public_id: "original.pdf",
        overwrite: false,
    });
}
export async function uploadChapterPage(buffer, manhwaId, chapterId, pageNumber) {
    return uploadFromStream(Readable.from(buffer), {
        resource_type: "image",
        folder: `manhwa/${manhwaId}/chapters/${chapterId}/pages`,
        public_id: `page-${String(pageNumber).padStart(4, "0")}`,
        format: "webp",
        overwrite: true,
        transformation: [{ quality: "auto:good", fetch_format: "auto" }],
    });
}
export async function uploadCover(filePath) {
    return uploadFromStream(fs.createReadStream(filePath), {
        resource_type: "image",
        folder: "manhwa/covers",
        public_id: `cover-${randomUUID()}`,
        overwrite: false,
        transformation: [{ quality: "auto:good", fetch_format: "auto" }],
    });
}
export function signedOriginalPdfUrl(publicId) {
    return cloudinary.url(publicId, {
        resource_type: "raw",
        type: "authenticated",
        sign_url: true,
        secure: true,
    });
}
export async function deleteChapterImages(manhwaId, chapterId) {
    const prefix = `manhwa/${manhwaId}/chapters/${chapterId}/pages/`;
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image" });
}
export async function deleteChapterAssets(manhwaId, chapterId) {
    await deleteLocalOriginal(chapterId).catch(() => undefined);
    const prefix = `manhwa/${manhwaId}/chapters/${chapterId}/`;
    await Promise.all([
        cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image" }),
        cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "raw", type: "authenticated" }),
    ]);
}
export async function deleteCover(publicId) {
    if (publicId)
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
