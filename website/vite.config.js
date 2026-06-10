import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  publicDir: "public",
  build: {
    outDir: resolve(root, "../dist/website"),
    emptyOutDir: true,
    assetsDir: "static",
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        raspored: resolve(root, "raspored/index.html"),
        bets: resolve(root, "bets/index.html"),
        "raspored-redirect": resolve(root, "raspored.html"),
        "bets-redirect": resolve(root, "bets.html"),
      },
    },
  },
});
