# Manhwa PDF chapter system

This JavaScript project stores a private original PDF, then a BullMQ worker converts its pages to WebP and publishes the chapter only after every generated page is uploaded successfully. The public reader never embeds or exposes the PDF.

## Prerequisites

- Node.js 20+
- MongoDB and Redis
- [Poppler](https://poppler.freedesktop.org/) installed with `pdfinfo` and `pdftoppm` on `PATH`
- Cloudinary account (or replace `server/src/services/storage.js` with an S3-compatible adapter)

## Run locally

1. Copy `.env.example` to `server/.env` and configure it.
2. Run `npm install` in the repository root.
3. Start three processes:

   ```bash
   npm run dev:server
   npm run dev:worker
   npm run dev:client
   ```

The API runs on port 4000 and the client on port 5173. Configure `ADMIN_EMAIL` and a long, unique `ADMIN_PASSWORD` in `server/.env`. The admin page signs in through `POST /api/auth/admin/login`, stores the short-lived JWT only in browser session storage, and sends it as a Bearer token to the existing protected admin routes. Do not place an admin token, password, `JWT_SECRET`, or Cloudinary secret in a `VITE_*` client variable.

## Processing lifecycle

`pending` → `processing` → `completed` (and `publishedAt` is set), or `failed`.

Jobs retry three times with exponential backoff. A failed chapter can be retried from the status endpoint only after its source PDF issue is corrected; use the admin UI retry action or add a dedicated retry endpoint if you want operator-controlled retries.

Original PDFs and generated images are placed under `manhwa/<manhwa id>/chapters/<chapter id>/` in Cloudinary. Keep the Cloudinary API secret only in `server/.env`; it is never bundled into the client.

Chapter source PDFs use Cloudinary's chunked `upload_large` API. The default is 6 MB chunks and a five-minute timeout per chunk; configure `CLOUDINARY_UPLOAD_CHUNK_BYTES` (minimum 5 MB) or `CLOUDINARY_UPLOAD_TIMEOUT_MS` only when your hosting network needs different limits. Bulk chapter uploads are intentionally limited to two source PDFs at once to avoid Cloudinary connection saturation.

## Production deployment

> **Set `VITE_API_URL` before building the client.** Vite bakes it into the bundle at build time (see `client/.env.example`). Without it the site calls `http://localhost:4000/api`, so readers on any other device see an empty or "unavailable" library even though the admin page works on your own machine. Also set `CLIENT_ORIGIN` in `server/.env` to the exact origin readers use, or the browser will block API calls (CORS).

- Build the client with `npm run build`, then serve `client/dist` from your CDN or web server.
- Run `npm start` for the API and `npm run start:worker` as a separate, long-running worker process. Both processes need the same `server/.env`, MongoDB, Redis, Cloudinary credentials, and Poppler installation.
- Set `CLIENT_ORIGIN` to the exact HTTPS origin of the deployed reader. Terminate TLS at your reverse proxy or hosting platform; do not expose MongoDB, Redis, or Cloudinary credentials to the browser.
- Use a process manager or container orchestrator to restart the API and worker, provide persistent Redis/MongoDB storage, and expose `/health` for health checks.
