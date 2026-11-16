import fs from "node:fs/promises";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
import { localOriginalPath } from "../services/storage.js";
const PURPOSE = "chapter-pdf";
/** Builds a 10-minute link to a chapter's original PDF. Only an admin can obtain it (see chapterPdfPreview). */
export function localPdfViewUrl(req, chapterId) {
    const token = jwt.sign({ purpose: PURPOSE, chapterId }, config.jwtSecret, { expiresIn: "10m" });
    return `${req.protocol}://${req.get("host")}/api/files/chapters/${chapterId}/original.pdf?token=${encodeURIComponent(token)}`;
}
export async function serveOriginalPdf(req, res) {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    let payload;
    try {
        payload = jwt.verify(token, config.jwtSecret);
    }
    catch {
        throw new ApiError(401, "This PDF link is invalid or has expired");
    }
    if (typeof payload !== "object" || payload.purpose !== PURPOSE || payload.chapterId !== req.params.id) {
        throw new ApiError(403, "This PDF link is not valid for this chapter");
    }
    const filePath = localOriginalPath(req.params.id);
    try {
        await fs.access(filePath);
    }
    catch {
        throw new ApiError(404, "The original PDF is not stored on this server");
    }
    // The admin page shows this PDF inside an <iframe> served from another origin, so allow framing by it.
    const origins = config.clientOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", `frame-ancestors ${origins.join(" ")}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", 'inline; filename="chapter.pdf"');
    res.sendFile(filePath, { dotfiles: "allow" });
}
