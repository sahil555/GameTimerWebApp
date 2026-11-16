import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project sites are served from /<repository-name>/.
// This workflow sets GITHUB_ACTIONS=true during the production build.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS === "true" ? "/game-timer/" : "/",
});
