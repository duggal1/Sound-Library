import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: "src/web",
  publicDir: resolve(import.meta.dirname, ".generated-public"),
  build: { outDir: resolve(import.meta.dirname, "dist"), emptyOutDir: true },
});
