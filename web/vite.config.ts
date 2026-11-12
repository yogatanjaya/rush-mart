import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// NEAR SDKs expect Node globals. We install a real shim at runtime in
// src/polyfills.ts (imported first in main.tsx); here we only alias `global`
// and make sure the buffer polyfill is bundled/optimized.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/near-rpc": {
        target: "https://rpc.testnet.near.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/near-rpc/, ""),
      },
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
});
