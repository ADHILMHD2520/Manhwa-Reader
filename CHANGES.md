# Changes

1. server/src/services/pdf.js  - new listRenderedPages(): finds the images pdftoppm wrote, whatever zero-padding it used.
2. server/src/worker.js        - uses listRenderedPages (root cause of chapters never publishing); clears
                                  processingError/publishedAt with $unset (Mongoose drops `undefined`);
                                  resizes pages to WebP's 16383px limit.
3. server/src/controllers/admin.js - retry now really clears the old error.
4. client/.env.example + README - documents VITE_API_URL / CLIENT_ORIGIN.
5. client/src/pages/ReaderPage.js - tapping a page scrolls down about one screen (instead of toggling the top bar).
6. client/src/pages/ReaderPage.js - top bar only shows while at the top of the chapter; footer prev/next always visible.
7. client/src/components/LazyPage.js - all chapter images load immediately (loading="eager").
8. client/src/api.js - reader id works without HTTPS (phones on http://192.168.x.x). client/vite.config.js - host: true.
9. server/src/index.js - CLIENT_ORIGIN accepts several comma-separated origins.
10. Original PDFs are kept on disk (server/storage/originals) instead of Cloudinary raw storage (free plan: 10 MB limit). Files: config.js, services/storage.js, services/chapter-upload.js, worker.js, controllers/admin.js, controllers/files.js (new), routes.js, index.js.
