import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { errorHandler } from "./lib/errors.js";
import { adminRouter, authRouter, fileRouter, readerRouter } from "./routes.js";
async function main() {
    await connectDatabase();
    const app = express();
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    // CLIENT_ORIGIN may list several origins separated by commas, e.g.
    // http://localhost:5173,http://192.168.1.23:5173
    const allowedOrigins = config.clientOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
    app.use(cors({ origin: allowedOrigins, credentials: false }));
    app.use(express.json({ limit: "1mb" }));
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.use("/api/auth", authRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/files", fileRouter);
    app.use("/api", readerRouter);
    app.use(errorHandler);
    app.listen(config.port, () => {
        console.log(`API listening on http://localhost:${config.port}`);
    });
}
void main().catch((error) => {
    console.error("Unable to start API", error);
    process.exit(1);
});
