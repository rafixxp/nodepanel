import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
});
