import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // host: true lets other devices on your Wi-Fi (e.g. your phone) open the dev site.
  server: { port: 5173, host: true },
});
