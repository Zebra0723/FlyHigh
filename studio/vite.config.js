import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:3001" },
  },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
