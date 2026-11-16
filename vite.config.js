import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pagesBasePath = process.env.PAGES_BASE_PATH;

export default defineConfig({
  plugins: [react()],
  base: pagesBasePath ? `${pagesBasePath.replace(/\/$/, "")}/` : "/",
});
