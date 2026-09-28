import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Run the app with `vercel dev`, which also serves /api.
export default defineConfig({
  plugins: [react()],
});
