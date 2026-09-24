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
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const cookie = (req as any).headers["x-session-cookie"];
            // Always replace cookies with only our session cookie (prevents accumulation)
            if (cookie) {
              proxyReq.setHeader("Cookie", cookie);
            } else {
              proxyReq.removeHeader("Cookie");
            }
            proxyReq.removeHeader("x-session-cookie");
          });
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"];
            if (setCookie) {
              proxyRes.headers["x-set-cookie"] = setCookie.map((c: string) => c.split(";")[0]).join("; ");
              delete proxyRes.headers["set-cookie"];
            }
          });
        },
      },
    },
  },
});
