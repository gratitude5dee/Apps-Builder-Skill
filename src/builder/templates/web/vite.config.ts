export function renderViteConfig() {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    manifest: true,
    rollupOptions: {
      input: "index.html",
    },
  },
});
`;
}
