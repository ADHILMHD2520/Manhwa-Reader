import { MulterError } from "multer";
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
export function asyncHandler(handler) {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
}
export function errorHandler(error, _req, res, _next) {
    if (error instanceof MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE" ? "PDF exceeds the upload size limit" : error.message;
        return res.status(400).json({ message });
    }
    if (error instanceof ApiError)
        return res.status(error.status).json({ message: error.message });
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
        return res.status(409).json({ message: "That chapter number already exists for this manhwa" });
    }
    console.error(error);
    return res.status(500).json({ message: "An unexpected server error occurred" });
}
