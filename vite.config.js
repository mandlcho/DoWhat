import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoBase = "/DoWhat/";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? repoBase : "/",
  server: {
    port: 5173
  }
});
