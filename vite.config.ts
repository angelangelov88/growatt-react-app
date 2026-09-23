import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/growatt": {
        target: "https://server.growatt.com",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
        rewrite: (path) => path.replace(/^\/growatt/, ""),
      },
    },
  },
});
