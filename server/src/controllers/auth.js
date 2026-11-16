import { createHash, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";

function sameSecret(value, expected) {
    const valueHash = createHash("sha256").update(value).digest();
    const expectedHash = createHash("sha256").update(expected).digest();
    return timingSafeEqual(valueHash, expectedHash);
}

export async function loginAdmin(req, res) {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const validEmail = sameSecret(email, config.adminEmail.trim().toLowerCase());
    const validPassword = sameSecret(password, config.adminPassword);
    if (!validEmail || !validPassword) {
        throw new ApiError(401, "Invalid admin credentials");
    }
    const accessToken = jwt.sign({ role: "admin" }, config.jwtSecret, {
        subject: config.adminEmail,
        expiresIn: config.adminJwtExpiresIn,
    });
    res.json({ accessToken });
}
