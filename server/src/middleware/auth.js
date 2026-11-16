import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
export function requireAdmin(req, _res, next) {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token)
        return next(new ApiError(401, "Admin authentication is required"));
    try {
        const payload = jwt.verify(token, config.jwtSecret);
        if (payload.role !== "admin" || !payload.sub) {
            return next(new ApiError(403, "Admin permission is required"));
        }
        req.admin = { id: payload.sub, role: "admin" };
        return next();
    }
    catch {
        return next(new ApiError(401, "Invalid or expired access token"));
    }
}
